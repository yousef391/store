"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-gray-400 uppercase tracking-wider"
          >
            {label}
            {props.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white
              placeholder:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50
              transition-all duration-200
              ${icon ? "pl-11" : ""}
              ${error ? "border-red-500/50 focus:ring-red-500/50" : "border-white/10 hover:border-white/15"}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-0.5">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-[11px] text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
