import type { ComponentProps } from "react";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function Field({ label, ...props }: { label: string } & ComponentProps<"input">) {
  const id = props.id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor={id}>
      {label}
      <input id={id} className={fieldClass} {...props} />
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
