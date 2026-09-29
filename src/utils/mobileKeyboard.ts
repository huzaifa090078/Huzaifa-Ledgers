/**
 * Global mobile keyboard and input visibility assistant.
 * Ensures active input fields smoothly scroll into visible view when the Android/iOS
 * software keyboard slides up, and form controls remain completely accessible.
 */
export function initMobileKeyboardScrollHelper(): () => void {
  const handleFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    const tagName = target.tagName;
    if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
      // DateInput is readOnly with inputMode="none" and blurs immediately; skip it
      if ((target as HTMLInputElement).readOnly && target.getAttribute('inputmode') === 'none') {
        return;
      }

      // 300ms allows the Android/Samsung software keyboard slide-in animation to complete
      setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch {
          // Fallback if browser doesn't support scrollIntoView options
          target.scrollIntoView(false);
        }
      }, 300);
    }
  };

  document.addEventListener('focusin', handleFocusIn, { passive: true });

  return () => {
    document.removeEventListener('focusin', handleFocusIn);
  };
}
