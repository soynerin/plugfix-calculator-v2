import { cn } from '@/shared/utils';

interface SpinnerProps {
  /** Visual size: 'sm' for buttons, 'md' default, 'lg' for full-view loaders */
  size?: 'sm' | 'md' | 'lg';
  /** Arc color variant. Defaults to brand primary (teal). Use 'danger' for delete actions. */
  variant?: 'primary' | 'danger';
  className?: string;
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-10 h-10',
};

const arcColorMap: Record<NonNullable<SpinnerProps['variant']>, string> = {
  primary: 'stroke-primary-500',
  danger: 'stroke-red-400',
};

/**
 * On-brand loading spinner.
 * Soft gray circular track with a colored arc, using animate-spin.
 * - size="sm"  → inside buttons
 * - size="lg"  → full-view loading states
 * - variant="danger" → red arc for delete actions
 */
export function Spinner({ size = 'md', variant = 'primary', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin shrink-0', sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Soft gray track */}
      <circle
        cx="12"
        cy="12"
        r="10"
        strokeWidth="3"
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      {/* 270° arc, color controlled by variant */}
      <path
        d="M12 2 A10 10 0 1 1 2 12"
        strokeWidth="3"
        strokeLinecap="round"
        className={arcColorMap[variant]}
      />
    </svg>
  );
}
