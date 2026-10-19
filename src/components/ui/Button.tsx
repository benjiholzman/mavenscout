import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

// Shared pill button. Variants follow the design brief: solid cyan (primary)
// is reserved for a page's single primary action; `tint` is the strong-tint
// pill for repeated per-item actions (e.g. "View profile" on directory cards).
// The rest of the app still uses inline button markup and can adopt this
// incrementally.

export type ButtonVariant = 'primary' | 'tint' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 font-medium text-white hover:bg-brand-600',
  tint: 'border border-brand-200 bg-brand-100 font-bold text-brand-700 hover:bg-brand-200',
  secondary: 'border border-line bg-white font-medium text-ink-soft hover:border-ink-faint hover:text-ink',
  ghost: 'font-medium text-ink-soft hover:bg-paper hover:text-ink',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-5 py-2 text-sm leading-[18px]',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}): string {
  return `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`
}

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize }

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...rest} />
}

/** Same styles on a router link, for actions that navigate. */
export function ButtonLink({ variant, size, className, ...rest }: StyleProps & LinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...rest} />
}
