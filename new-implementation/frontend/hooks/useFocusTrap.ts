import { useEffect, useRef } from 'react';

/**
 * Traps keyboard focus within the returned ref element while `active` is true.
 * Focuses the first focusable child on activation and restores the previously
 * focused element when deactivated.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Initial focus on activation
    const focusableOnOpen = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableOnOpen[0]?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    el.addEventListener('keydown', trap);
    return () => {
      el.removeEventListener('keydown', trap);
      previouslyFocused?.focus();
    };
  }, [active]);

  return ref;
}
