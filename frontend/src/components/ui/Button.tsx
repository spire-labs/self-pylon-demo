"use client";
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-[#0B1B47] text-white hover:opacity-90",
      secondary: "bg-white text-[#0B1B47] border border-gray-200 hover:bg-gray-50",
      outline: "border border-[#0B1B47] bg-transparent text-[#0B1B47] hover:bg-[#0B1B47] hover:text-white",
      ghost: "bg-transparent text-[#0B1B47] hover:bg-gray-100",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm rounded",
      md: "px-[18px] py-4 text-sm rounded",
      lg: "px-6 py-4 text-base rounded",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          loading && "opacity-70 cursor-not-allowed",
          className
        )}
        disabled={props.disabled || loading}
        style={{ borderRadius: '4px' }}
        {...props}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };





