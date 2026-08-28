import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-button text-body font-medium px-6 py-3 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  // Filled Action Button — background #0d111b, text #ffffff, button shadow.
  primary: "bg-midnight text-white shadow-[var(--shadow-subtle-2)] hover:opacity-90",
  // Secondary Dark Button — denser padding, same shadow stack.
  secondary: "bg-carbon text-white shadow-[var(--shadow-subtle-2)] px-5 py-2.5 hover:opacity-90",
  // Outline Link Button — white bg, ink text, no shadow.
  outline: "bg-paper text-ink border border-mist hover:bg-snow",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, ...props },
  ref
) {
  return <button ref={ref} className={clsx(base, variants[variant], className)} {...props} />;
});
