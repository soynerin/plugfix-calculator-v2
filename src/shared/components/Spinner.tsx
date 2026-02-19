import { cn } from '@/shared/utils';

interface SpinnerProps {
  /** Visual size: 'sm' for buttons, 'md' default, 'lg' for full-view loaders */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-10 h-10',
};

/**
 * On-brand loading spinner.
 * Soft gray circular track with a 270° teal (primary-500) arc.
 * Use size="sm" inside buttons, size="lg" for full-view loading states.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
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
      {/* Teal arc – 270° clockwise from top (12,2) to left (2,12) */}
      <path
        d="M12 2 A10 10 0 1 1 2 12"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-primary-500"
      />
    </svg>
  );
}
