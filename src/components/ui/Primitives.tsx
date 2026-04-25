import { clsx } from 'clsx';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

export const Badge = ({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';
  className?: string;
}) => {
  const tones: Record<string, string> = {
    neutral: 'bg-paper-200 text-ink-soft',
    accent: 'bg-accent-bg text-accent',
    ok: 'bg-[#e8efdf] text-signal-ok',
    warn: 'bg-[#f5ecd8] text-signal-warn',
    danger: 'bg-[#f0dcdc] text-signal-danger',
  };
  return <span className={clsx('chip', tones[tone], className)}>{children}</span>;
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline';
  children: ReactNode;
}

export const Button = ({
  variant = 'outline',
  className,
  children,
  ...rest
}: ButtonProps) => {
  const cls = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
  }[variant];
  return (
    <button className={clsx(cls, className)} {...rest}>
      {children}
    </button>
  );
};

/**
 * A compact two-row bar showing conceptual and manuscript progress.
 * Subtle enough to drop into cards without dominating.
 */
export const MaturityBars = ({
  conceptual,
  manuscript,
  size = 'md',
}: {
  conceptual: number; // 0..1
  manuscript: number; // 0..1
  size?: 'sm' | 'md';
}) => {
  const h = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-ink-mute w-5 shrink-0">CPT</span>
        <div className={clsx('flex-1 rounded-full bg-paper-200 overflow-hidden', h)}>
          <div
            className={clsx('h-full bg-accent-soft transition-all duration-300')}
            style={{ width: `${Math.round(conceptual * 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-ink-mute w-8 shrink-0 text-right tabular-nums">
          {Math.round(conceptual * 100)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-ink-mute w-5 shrink-0">MS</span>
        <div className={clsx('flex-1 rounded-full bg-paper-200 overflow-hidden', h)}>
          <div
            className={clsx('h-full bg-ink/70 transition-all duration-300')}
            style={{ width: `${Math.round(manuscript * 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-ink-mute w-8 shrink-0 text-right tabular-nums">
          {Math.round(manuscript * 100)}%
        </span>
      </div>
    </div>
  );
};

/** A 0..4 discrete slider rendered as five small dots. Click to set. */
export const LevelDots = ({
  value,
  onChange,
  tone = 'accent',
}: {
  value: number;
  onChange: (v: number) => void;
  tone?: 'accent' | 'ink';
}) => {
  const fillClass = tone === 'accent' ? 'bg-accent-soft' : 'bg-ink/70';
  return (
    <div className="inline-flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <button
          key={i}
          aria-label={`Set level ${i}`}
          onClick={() => onChange(i)}
          className={clsx(
            'w-3 h-3 rounded-full border transition-all duration-150',
            i <= value
              ? `${fillClass} border-transparent`
              : 'bg-white border-paper-400 hover:border-paper-500',
          )}
        />
      ))}
    </div>
  );
};

export const Divider = ({ className }: { className?: string }) => (
  <div className={clsx('h-px bg-paper-300', className)} />
);

/** A minimal modal. Click backdrop or Escape to close. */
export const Modal = ({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className={clsx(
          'bg-paper-50 rounded-xl shadow-floating w-full max-h-[85vh] overflow-auto animate-slide-up',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 pt-5 pb-3 border-b border-paper-300">
            <h2 className="font-serif text-xl">{title}</h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
