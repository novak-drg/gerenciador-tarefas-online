import { cn } from '@/lib/utils';

export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return '?';
  const first = parts[0] as string;
  const last = parts.length > 1 ? (parts[parts.length - 1] as string) : '';
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

export type AvatarProps = {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
};

/** Initials on a recess disc. The full name is exposed as the accessible name. */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-recess font-medium text-ink select-none',
        size === 'md' ? 'size-8 text-xs' : 'size-6 text-[10px]',
        className,
      )}
    >
      <span aria-hidden>{initialsOf(name)}</span>
    </span>
  );
}

export type AvatarStackProps = {
  users: readonly { name: string }[];
  /** Avatars shown before the "+N" overflow */
  max?: number;
  size?: 'sm' | 'md';
  /** Background the stack sits on, so the overlap ring matches it */
  tone?: 'scene' | 'surface';
  className?: string;
};

export function AvatarStack({
  users,
  max = 4,
  size = 'md',
  tone = 'scene',
  className,
}: AvatarStackProps) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  const ring = tone === 'scene' ? 'ring-2 ring-scene' : 'ring-2 ring-surface';
  return (
    <div className={cn('flex items-center -space-x-0.5', className)}>
      {shown.map((user, index) => (
        <Avatar key={`${user.name}-${index}`} name={user.name} size={size} className={ring} />
      ))}
      {extra > 0 && (
        <span
          role="img"
          aria-label={`mais ${extra}`}
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-accent-subtle font-medium text-ink tabular-nums',
            size === 'md' ? 'size-8 text-xs' : 'size-6 text-[10px]',
            ring,
          )}
        >
          <span aria-hidden>+{extra}</span>
        </span>
      )}
    </div>
  );
}
