// components/select.tsx
import { useState } from "react";

export function Select({
  defaultValue,
  children,
}: {
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <select defaultValue={defaultValue} className="border p-2 rounded">
      {children}
    </select>
  );
}

export function SelectTrigger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: { placeholder: string }) {
  return <option disabled>{placeholder}</option>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}
