'use client';

import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { IconButton } from './icon-button';

/**
 * Drives a native <dialog> from an `open` flag. `showModal` gives the focus trap, inert page and
 * focus return to the trigger; Escape and backdrop clicks call `onClose`.
 */
export function useModalDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const dialogProps = {
    ref,
    onCancel: (event: { preventDefault: () => void }) => {
      event.preventDefault(); // the parent decides: closing happens through `open`
      onCloseRef.current();
    },
    onClose: () => {
      if (open) onCloseRef.current();
    },
    onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    },
    onMouseDown: (event: MouseEvent<HTMLDialogElement>) => {
      // the dialog element itself is only hit on the backdrop; content sits in a child
      if (event.target === event.currentTarget) onCloseRef.current();
    },
  };

  return dialogProps;
}

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
};

export function Dialog({ open, onClose, title, description, size = 'md', children }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogProps = useModalDialog(open, onClose);

  return (
    <dialog
      {...dialogProps}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'm-auto w-[calc(100%-2rem)] overflow-visible rounded-panel border border-hairline bg-elevated p-0 shadow-float',
        'max-h-[calc(100dvh-2rem)]',
        size === 'md' ? 'max-w-[480px]' : 'max-w-[640px]',
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-secondary">
                  {description}
                </p>
              )}
            </div>
            <IconButton aria-label="Fechar" size="sm" className="-mt-1 -mr-2" onClick={onClose}>
              <X className="size-5" />
            </IconButton>
          </div>
          <div className="overflow-y-auto px-6 pt-2 pb-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Right-aligned row of dialog buttons. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-2">{children}</div>;
}
