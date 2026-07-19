import type { Ref } from 'vue';

/**
 * Keyboard behavior shared by every modal dialog in the app: Escape closes it, and Tab/Shift+Tab
 * wrap focus between the first and last focusable element instead of escaping into the page behind
 * it. `dialogRef` is the dialog's own root element (the querySelectorAll scope); `onEscape` is
 * called instead of any default action so each caller can decide what "close" means for it.
 */
export function useFocusTrap(dialogRef: Ref<HTMLElement | null>, onEscape: () => void) {
  function focusableEls(): HTMLElement[] {
    const root = dialogRef.value;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== 'Tab') return;
    const els = focusableEls();
    if (els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { onKeydown };
}
