"use client";

interface AudioToggleButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Tailwind bg class when active, e.g. "bg-accent-blue" */
  activeColor?: string;
  /** Tailwind text class when active — default "text-studio-950" passes WCAG on light activeColors like accent-blue. For dark activeColors (blue-600, amber-600) pass "text-white". */
  activeText?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  title?: string;
}

export default function AudioToggleButton({
  label,
  active,
  onClick,
  activeColor = "bg-accent-blue",
  activeText = "text-studio-950",
  size = "sm",
  disabled = false,
  className = "",
  ariaLabel,
  title,
}: AudioToggleButtonProps) {
  const sizeClasses =
    size === "md"
      ? "px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
      : "px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      title={title}
      className={`rounded-badge transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${sizeClasses} ${
        active
          ? `${activeColor} ${activeText}`
          : "bg-studio-700 text-studio-300 hover:bg-studio-600 hover:text-studio-100"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      {label}
    </button>
  );
}
