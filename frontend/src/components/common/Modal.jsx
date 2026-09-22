import { useEffect, useRef, useId } from 'react';

/**
 * Accessible modal dialog.
 * - role="dialog" aria-modal aria-labelledby
 * - Focus trap: Tab cycles within modal; Escape closes
 * - Entry animation via .modal-panel CSS class
 * - Backdrop click closes
 */
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  const titleId = useId();
  const panelRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Lock/restore focus
  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement;
      // Small delay lets the panel animate in before stealing focus
      const t = setTimeout(() => {
        const first = getFocusable(panelRef.current)[0];
        first?.focus();
      }, 50);
      return () => clearTimeout(t);
    } else {
      prevFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable(panelRef.current);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={[
          'relative z-10 w-full bg-[var(--surface-overlay)] rounded-lg',
          'border border-[var(--border-subtle)]',
          'shadow-dark-lg',
          'modal-panel',
          maxWidth,
        ].join(' ')}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <h3
              id={titleId}
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Close dialog"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
};

function getFocusable(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'a[href],button:not([disabled]),textarea,input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.closest('[hidden]'));
}
