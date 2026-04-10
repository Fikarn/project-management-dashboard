"use client";

interface AudioToggleButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: string; // Tailwind bg class when active
  size?: "sm" | "md";
  disabled?: boolean;
}

export default function AudioToggleButton({
  label,
  active,
  onClick,
  activeColor = "bg-accent-blue",
  size = "sm",
  disabled = false,
}: AudioToggleButtonProps) {
  const sizeClasses = size === "md" ? "px-3 py-1.5 text-xs font-semibold" : "px-2 py-1 text-micro font-medium";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-badge transition-colors ${sizeClasses} ${
        active ? `${activeColor} text-white` : "bg-studio-700 text-studio-400 hover:bg-studio-600 hover:text-studio-200"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {label}
    </button>
  );
}
