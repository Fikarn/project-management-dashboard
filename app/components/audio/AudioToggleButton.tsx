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
}

export default function AudioToggleButton({
  label,
  active,
  onClick,
  activeColor = "bg-accent-blue",
  activeText = "text-studio-950",
  size = "sm",
  disabled = false,
}: AudioToggleButtonProps) {
  const sizeClasses = size === "md" ? "px-3 py-1.5 text-xs font-semibold" : "px-2 py-1 text-xs font-medium";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={`rounded-badge transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${sizeClasses} ${
        active
          ? `${activeColor} ${activeText}`
          : "bg-studio-700 text-studio-300 hover:bg-studio-600 hover:text-studio-100"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {label}
    </button>
  );
}
