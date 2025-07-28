/**
 * Label Component
 * Reusable form label with consistent styling
 */

import React from "react";

interface LabelProps {
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function Label({ htmlFor, children, className = "", required }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium text-gray-700 ${className}`}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}