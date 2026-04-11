import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectNativeProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
}

/**
 * A styled native <select> element that matches the design system.
 *
 * Uses a native HTML select for accessibility, keyboard navigation,
 * and progressive enhancement. No additional Radix dependency required.
 */
const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-base shadow-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'md:text-sm',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  }
);
SelectNative.displayName = 'SelectNative';

export { SelectNative };
