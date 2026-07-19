import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';

const FONT_EXTENSIONS = /\.(?:ttf|woff2?|otf)$/i;

/**
 * The compiled Tailwind stylesheet is tiny (a few KB gzipped) and, loaded via
 * an external <link rel="stylesheet">, blocks first render on an extra
 * network round-trip. For a bundle this small it's cheaper to inline the
 * whole thing into index.html as a <style> tag than to add a critical-CSS
 * extraction step. This finds whatever CSS asset Vite emitted (name/hash
 * varies per build), inlines its content into <head>, drops the now-redundant
 * <link rel="stylesheet">, and removes the CSS asset from the bundle so it
 * isn't shipped unused alongside the inlined copy.
 */
function inlineCssPlugin(): Plugin {
  let assetsDir = 'assets';

  return {
    name: 'inline-css-into-html',
    configResolved(config: ResolvedConfig) {
      assetsDir = config.build.assetsDir || 'assets';
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;

        let cssContent = '';
        const cssFileNames: string[] = [];
        for (const [fileName, output] of Object.entries(bundle)) {
          if (output.type === 'asset' && fileName.endsWith('.css')) {
            const source = output.source;
            cssContent += typeof source === 'string' ? source : source.toString();
            cssFileNames.push(fileName);
          }
        }
        if (!cssContent) return html;

        // Relative url(...) references (e.g. the @font-face src) inside the
        // built CSS are relative to the CSS file's own location
        // (docs/<assetsDir>/), which is where Vite placed the referenced
        // assets. Once the CSS is inlined into index.html (at docs/), the
        // *same* relative URL would instead resolve against the document's
        // base URL and 404. Rewrite non-absolute url() references to be
        // relative to the document root instead, so inlining doesn't change
        // what they point to.
        cssContent = cssContent.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, url) => {
          if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|%23)/i.test(url)) return match;
          const cleaned = url.replace(/^\.\//, '');
          return `url(${quote}${assetsDir}/${cleaned}${quote})`;
        });

        let result = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>\s*/gi, '');
        result = result.replace('</head>', `<style>${cssContent}</style>\n  </head>`);

        // Drop the CSS asset(s) from the bundle so the orphaned .css file
        // isn't written to docs/assets alongside the inlined copy.
        for (const fileName of cssFileNames) {
          delete bundle[fileName];
        }

        return result;
      },
    },
  };
}

/**
 * Method pages live at `/methodName` (e.g. `.../bot-studio/sendMessage`), a
 * client-side-only "route" - there's no server-side rewrite on GitHub Pages,
 * so a hard refresh or a shared link to that URL would 404. The standard
 * fallback is to serve `docs/404.html` for any unmatched path; GitHub Pages
 * does this automatically. Since every route here is exactly one path
 * segment deep and every asset reference in the built HTML is relative (see
 * `base: "./"` above and inlineCssPlugin's comments), a byte-identical copy
 * of index.html works as 404.html with no extra redirect logic: relative
 * asset URLs resolve the same way whether the document's URL is
 * `.../bot-studio/` or `.../bot-studio/sendMessage`.
 */
function spaFallbackPlugin(): Plugin {
  let outDir = 'docs';
  let root = process.cwd();

  return {
    name: 'spa-404-fallback',
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
      root = config.root;
    },
    closeBundle() {
      const resolvedOutDir = path.isAbsolute(outDir) ? outDir : path.resolve(root, outDir);
      const indexPath = path.join(resolvedOutDir, 'index.html');
      const notFoundPath = path.join(resolvedOutDir, '404.html');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
      }
    },
  };
}

/**
 * public/schema/bot-api.json is pretty-printed (2-space indent) so schema
 * update commits produce readable diffs. That formatting is dead weight at
 * runtime though: the browser fetches and JSON.parses this file on every
 * load, and indentation whitespace inflates both the transfer size and
 * parse time for no benefit once it's just being read by code. Re-write the
 * copy Vite places in the output directory as compact JSON, leaving the
 * git-tracked source file untouched.
 */
function minifySchemaPlugin(): Plugin {
  let outDir = 'docs';
  let root = process.cwd();

  return {
    name: 'minify-schema-json',
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
      root = config.root;
    },
    closeBundle() {
      const resolvedOutDir = path.isAbsolute(outDir) ? outDir : path.resolve(root, outDir);
      const schemaPath = path.join(resolvedOutDir, 'schema', 'bot-api.json');
      if (!fs.existsSync(schemaPath)) return;
      const parsed = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      fs.writeFileSync(schemaPath, JSON.stringify(parsed));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [vue(), inlineCssPlugin(), spaFallbackPlugin(), minifySchemaPlugin()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Fonts are bundled once and essentially never change, so hashing
        // them for cache-busting has little value while making it impossible
        // to preload them from static HTML with a stable href. Give font
        // assets a stable, non-hashed name; everything else (JS chunks, CSS,
        // images) keeps Vite's default hashed naming.
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names[0] ?? '';
          if (FONT_EXTENSIONS.test(name)) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
