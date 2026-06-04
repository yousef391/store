"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "accent" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const variants = {
  default: "bg-white text-black hover:bg-gray-100 active:scale-[0.97]",
  outline: "bg-transparent border border-white/10 text-white hover:bg-white/5 hover:border-white/20 active:scale-[0.97]",
  ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5 active:scale-[0.97]",
  accent: "bg-accent text-black font-bold hover:bg-accent-hover shadow-lg shadow-accent/20 active:scale-[0.97]",
  destructive: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.97]",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-8 py-3.5 text-base rounded-xl",
  icon: "p-2.5 rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", loading = false, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${variants[variant]} ${sizes[size]} ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
