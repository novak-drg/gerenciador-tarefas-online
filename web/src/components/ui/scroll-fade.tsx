'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Edges = { start: boolean; end: boolean };

/** Horizontal scroller that fades the edge where more content is hidden and snaps to children. */
export function ScrollFade({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const start = node.scrollLeft > 1;
    const end = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  const mask = edges.start
    ? edges.end
      ? 'linear-gradient(to right, transparent, black 2rem, black calc(100% - 2.5rem), transparent)'
      : 'linear-gradient(to right, transparent, black 2rem)'
    : edges.end
      ? 'linear-gradient(to right, black calc(100% - 2.5rem), transparent)'
      : undefined;

  return (
    <div
      ref={ref}
      onScroll={measure}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      className={cn(
        'snap-x snap-proximity scroll-px-1 overflow-x-auto overscroll-x-contain',
        className,
      )}
    >
      {children}
    </div>
  );
}
