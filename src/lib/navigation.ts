// Shared click-intercept for the app's SPA-style <a href="methodName"> links
// (MethodSidebar, NotFoundView). Real anchors stay crawlable/copyable/openable
// in a new tab; a plain left-click instead does pushState + in-app selection
// so the schema doesn't have to be re-fetched. Anything else (middle click,
// ctrl/cmd/shift/alt-click) is left to native browser behavior.
export function navigateOnClick(event: MouseEvent): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return false;
  event.preventDefault();
  const anchor = event.currentTarget as HTMLAnchorElement;
  if (anchor.href !== window.location.href) {
    window.history.pushState(null, '', anchor.href);
  }
  return true;
}
