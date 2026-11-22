'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

export type MenuEntry =
  | {
      type: 'item';
      key: string;
      label: string;
      onSelect: () => void;
      /** Stays in the list (and reachable) but does nothing */
      disabled?: boolean;
      danger?: boolean;
    }
  | { type: 'separator'; key: string };

export type ActionMenuProps = {
  /** Accessible name of the trigger, e.g. "Mais ações" */
  label: string;
  entries: readonly MenuEntry[];
  className?: string;
  icon?: ReactNode;
};

const MENU_WIDTH = 248;
const GAP = 4;

type Placement = { top: number; left: number };

/**
 * Menu button + popup (role="menu"). The popup is portaled to <body> and positioned from the
 * trigger, so cards, scroll containers and stacking contexts never clip it.
 */
export function ActionMenu({ label, entries, className, icon }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPlacement(null);
    if (restoreFocus) wrapperRef.current?.querySelector('button')?.focus();
  }, []);

  // Place below the trigger, right-aligned to it; flip above when there is no room
  useLayoutEffect(() => {
    if (!open) return;
    const button = wrapperRef.current?.querySelector('button');
    const menu = menuRef.current;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const height = menu.offsetHeight;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const below = rect.bottom + GAP;
    const top =
      below + height > window.innerHeight - 8 && rect.top - GAP - height > 8
        ? rect.top - GAP - height
        : below;
    setPlacement({ top, left });
  }, [open]);

  // First enabled item gets focus once the menu is placed
  useEffect(() => {
    if (!open || !placement) return;
    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
      ?.focus();
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || wrapperRef.current?.contains(target)) return;
      close(false);
    };
    const onDismiss = () => close(false);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onDismiss);
    window.addEventListener('scroll', onDismiss, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('scroll', onDismiss, true);
    };
  }, [open, close]);

  function items(): HTMLElement[] {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = (index + 1) % list.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + list.length) % list.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    } else if (event.key === 'Tab') {
      close(false);
      return;
    }
    if (next !== null) {
      event.preventDefault();
      list[next]?.focus();
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <span ref={wrapperRef} className="inline-flex">
        <IconButton
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          size="sm"
          className={cn(open && 'bg-pressed', className)}
          // keep drag sensors and card clicks out of the menu button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (open) close(false);
            else setOpen(true);
          }}
          onKeyDown={onTriggerKeyDown}
        >
          {icon ?? <MoreHorizontal className="size-5" />}
        </IconButton>
      </span>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            // React events bubble through portals: keep them away from the card
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              top: placement?.top ?? 0,
              left: placement?.left ?? 0,
              width: MENU_WIDTH,
              visibility: placement ? 'visible' : 'hidden',
            }}
            className="fixed z-40 rounded-card border border-hairline bg-elevated p-1 shadow-float"
          >
            {entries.map((entry) =>
              entry.type === 'separator' ? (
                <div key={entry.key} role="separator" className="mx-2 my-1 h-px bg-hairline" />
              ) : (
                <button
                  key={entry.key}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={entry.disabled || undefined}
                  onClick={() => {
                    if (entry.disabled) return;
                    close(true);
                    entry.onSelect();
                  }}
                  className={cn(
                    'flex min-h-9 w-full items-center rounded-control px-3 text-left text-sm whitespace-nowrap transition-colors duration-150 ease-out',
                    'hover:bg-pressed focus-visible:bg-pressed',
                    entry.danger ? 'text-danger-text' : 'text-ink',
                    entry.disabled && 'cursor-not-allowed text-disabled hover:bg-transparent',
                  )}
                >
                  {entry.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
