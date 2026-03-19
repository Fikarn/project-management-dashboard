"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
  /** If true, don't close on backdrop click (used for form modals with dirty check) */
  preventBackdropClose?: boolean;
  onBackdropClick?: () => void;
  className?: string;
}

export default function Modal({
  onClose,
  children,
  ariaLabel,
  preventBackdropClose,
  onBackdropClick,
  className = "items-center justify-center",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save and restore focus
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first interactive element inside modal
    const timer = setTimeout(() => {
      const focusable = contentRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, []);

  // Focus trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        const focusable = contentRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      if (preventBackdropClose) {
        onBackdropClick?.();
      } else {
        onClose();
      }
    }
  }

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex ${className} bg-black/60 overflow-y-auto`}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
