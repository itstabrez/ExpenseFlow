import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "danger";
};

export function Button({ className = "", tone = "primary", ...props }: ButtonProps) {
  const tones = {
    primary: "bg-leaf text-white hover:bg-[#285f55]",
    secondary: "border border-slate-300 bg-white text-ink hover:bg-slate-50",
    danger: "bg-coral text-white hover:bg-[#ae4b3d]"
  };
  return (
    <button
      {...props}
      className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
    />
  );
}
