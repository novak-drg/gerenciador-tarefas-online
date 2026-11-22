'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Seal } from './seal';

export type TabItem = {
  id: string;
  label: string;
  /** Optional count shown in a seal */
  count?: number;
};

export type TabsProps = {
  tabs: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  'aria-label': string;
  /** Prefix for the ids that link tabs to panels; pair with TabPanel */
  idPrefix?: string;
  className?: string;
};

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/** Underline tabs with roving tabindex: arrows, Home and End move and select. */
export function Tabs({ tabs, value, onChange, idPrefix = 'tabs', className, ...rest }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.id === value);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn('flex gap-6 border-b border-hairline', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[tab.id] = node;
            }}
            id={tabId(idPrefix, tab.id)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px inline-flex min-h-10 snap-start items-center gap-2 border-b-2 px-0.5 text-sm transition-colors duration-150 ease-out',
              selected
                ? 'border-accent font-semibold text-ink'
                : 'border-transparent font-medium text-secondary hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count !== undefined && <Seal value={tab.count} />}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  value,
  idPrefix = 'tabs',
  children,
  className,
}: {
  id: string;
  value: string;
  idPrefix?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, id)}
      aria-labelledby={tabId(idPrefix, id)}
      hidden={id !== value}
      tabIndex={0}
      className={className}
    >
      {id === value ? children : null}
    </div>
  );
}
