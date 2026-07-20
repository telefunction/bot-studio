import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';

const FONT_EXTENSIONS = /\.(?:ttf|woff2?|otf)$/i;
const SITE_URL = 'https://telefunction.github.io/bot-studio/';

function resolveOutDir(config: ResolvedConfig): string {
  return path.isAbsolute(config.build.outDir)
    ? config.build.outDir
    : path.resolve(config.root, config.build.outDir);
}

/**
 * The compiled Tailwind stylesheet is tiny (a few KB gzipped) and, loaded via
 * an external <link rel="stylesheet">, blocks first render on an extra
 * network round-trip. For a bundle this small it's cheaper to inline the
 * whole thing into index.html as a <style> tag than to add a critical-CSS
 * extraction step. This finds the CSS asset(s) Vite linked into *this* HTML
 * document (name/hash varies per build), inlines their content into <head>,
 * drops the now-redundant <link rel="stylesheet">, and removes those CSS
 * assets from the bundle so they aren't shipped unused alongside the inlined
 * copy.
 *
 * Deliberately scoped to only the CSS Vite actually linked from the HTML
 * (via the `<link rel="stylesheet" href="...">` tags it inserts for the
 * eagerly-loaded entry), not every `.css` file in the bundle: a lazy-loaded
 * component (anything behind `defineAsyncComponent`, e.g. TypeEditorModal)
 * that ships its own `<style>` gets its CSS split into a separate per-chunk
 * file that Vite's runtime fetches via a dynamically-inserted <link> the
 * moment that chunk is imported — it's never linked from index.html at all.
 * An earlier version of this plugin deleted every `.css` file it found
 * regardless of origin, which silently deleted that per-chunk file from the
 * output; the first time someone triggered the lazy import in production,
 * Vite's runtime tried to preload the (now-missing) stylesheet, got a 404,
 * and threw ("Unable to preload CSS for ..."), aborting the dynamic import
 * and breaking that lazy component entirely.
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

        const linkedFileNames = [
          ...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi),
        ].map((match) => match[1].replace(/^\.?\//, ''));
        if (linkedFileNames.length === 0) return html;

        let cssContent = '';
        const cssFileNames: string[] = [];
        for (const fileName of linkedFileNames) {
          const output = bundle[fileName];
          if (!output || output.type !== 'asset') continue;
          const source = output.source;
          cssContent += typeof source === 'string' ? source : source.toString();
          cssFileNames.push(fileName);
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
  let outDir = '';

  return {
    name: 'spa-404-fallback',
    configResolved(config: ResolvedConfig) {
      outDir = resolveOutDir(config);
    },
    closeBundle() {
      const indexPath = path.join(outDir, 'index.html');
      const notFoundPath = path.join(outDir, '404.html');
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
  let outDir = '';

  return {
    name: 'minify-schema-json',
    configResolved(config: ResolvedConfig) {
      outDir = resolveOutDir(config);
    },
    closeBundle() {
      const schemaPath = path.join(outDir, 'schema', 'bot-api.json');
      if (!fs.existsSync(schemaPath)) return;
      const parsed = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      fs.writeFileSync(schemaPath, JSON.stringify(parsed));
    },
  };
}

/**
 * The app exposes 185 real, directly loadable per-method routes (e.g.
 * `/sendMessage`, `/getUpdates` — see spaFallbackPlugin above), but nothing
 * told crawlers those routes exist. Generate a sitemap listing the home page
 * and every method route from the same canonical schema the app itself reads,
 * so it can't drift out of sync with the actual method list.
 */
function sitemapPlugin(): Plugin {
  let outDir = '';
  let schemaPath = '';

  return {
    name: 'generate-sitemap',
    configResolved(config: ResolvedConfig) {
      outDir = resolveOutDir(config);
      schemaPath = path.resolve(config.root, 'public/schema/bot-api.json');
    },
    closeBundle() {
      if (!fs.existsSync(schemaPath)) return;
      const { methods } = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as {
        methods: { name: string }[];
      };
      const urls = [SITE_URL, ...methods.map((method) => `${SITE_URL}${method.name}`)];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((url) => `  <url><loc>${url}</loc></url>`)
        .join('\n')}\n</urlset>\n`;
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [vue(), inlineCssPlugin(), spaFallbackPlugin(), minifySchemaPlugin(), sitemapPlugin()],
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
