import { X } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { softOn, textOn } from '../../lib/color';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'red';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy text-white border border-navy-400/60 active:bg-navy-700',
  red: 'bg-ffred text-white active:bg-ffred-600',
  secondary: 'bg-surface-2 text-fg border border-line active:brightness-110',
  danger: 'bg-danger/15 text-danger border border-danger/50 active:bg-danger/25',
  ghost: 'bg-transparent text-fg active:bg-surface-2',
};

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`tap inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-[filter,background] disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`tap inline-flex size-12 shrink-0 items-center justify-center rounded-xl active:bg-surface-2 disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Panneau glissant depuis le bas (bottom sheet). */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="animate-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`animate-sheet relative flex max-h-[94dvh] w-full flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-line px-safe py-1">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
          <IconButton label="Fermer" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="scroll-area min-h-0 flex-1 px-safe py-3">{children}</div>
        {footer && <div className="border-t border-line px-safe pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">{footer}</div>}
        {!footer && <div className="pb-safe" />}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div className="animate-fade absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="animate-pop relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl">
        <h2 className="text-xl font-bold">{title}</h2>
        {message && <div className="mt-2 text-muted">{message}</div>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={onCancel}>Annuler</Button>
          <Button variant={danger ? 'red' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tap flex min-h-12 w-full items-center gap-3 py-2 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-ok' : 'bg-line'}`}
        aria-hidden
      >
        <span
          className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] ${checked ? 'left-7' : 'left-1'}`}
        />
      </span>
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  unit,
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: ReactNode;
  unit?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{label}</div>
        {hint && <div className="text-sm text-muted">{hint}</div>}
      </div>
      <div className="flex items-center rounded-xl border border-line bg-surface-2">
        <button
          type="button"
          className="tap size-12 text-2xl font-bold disabled:opacity-30"
          aria-label="Diminuer"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <span className="tabular min-w-14 text-center text-lg font-bold">
          {value}
          {unit && <span className="ml-0.5 text-sm font-medium text-muted">{unit}</span>}
        </span>
        <button
          type="button"
          className="tap size-12 text-2xl font-bold disabled:opacity-30"
          aria-label="Augmenter"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap rounded-xl border border-line bg-surface-2 p-1 ${className}`} role="group">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`tap min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors ${
            o.value === value ? 'bg-navy text-white shadow' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Pastille colorée aux couleurs d'une équipe. */
export function TeamTag({ name, color, className = '' }: { name: string; color: string; className?: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-lg px-2 py-0.5 font-bold ${className}`}
      style={{ background: color, color: textOn(color), boxShadow: `inset 0 0 0 1px ${softOn(color, 0.35)}` }}
    >
      {name}
    </span>
  );
}

/** Bouton choix d'équipe, coloré. */
export function TeamButton({
  name,
  color,
  selected,
  onClick,
  children,
}: {
  name: string;
  color: string;
  selected: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`tap flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl px-3 py-2 font-bold transition-[outline,opacity] ${
        selected ? 'outline-4 outline-offset-2 outline-accent' : ''
      }`}
      style={{ background: color, color: textOn(color), boxShadow: `inset 0 0 0 1px ${softOn(color, 0.35)}` }}
    >
      <span className="max-w-full truncate">{name}</span>
      {children}
    </button>
  );
}

export function Card({ title, children, className = '', action }: { title?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-2 flex items-center gap-2">
          {title && <h3 className="min-w-0 flex-1 text-base font-bold">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
