// components/switch.tsx
export function Switch({ id, defaultChecked }: { id: string, defaultChecked?: boolean }) {
  return <input type="checkbox" id={id} defaultChecked={defaultChecked} className="w-4 h-4" />;
}
