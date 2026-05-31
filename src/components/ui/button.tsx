import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 disabled:text-gray-300',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
