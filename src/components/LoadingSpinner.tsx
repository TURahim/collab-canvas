/**
 * LoadingSpinner Component
 * Reusable loading indicator with optional label
 */

"use client";

/**
 * Props for LoadingSpinner component
 */
interface LoadingSpinnerProps {
  label?: string;
}

/**
 * LoadingSpinner - Displays a spinning loader with optional text
 * 
 * Features:
 * - Animated circular spinner
 * - Customizable label text
 * - Consistent styling with app theme
 * 
 * @param props - Component props
 * @returns Loading spinner with label
 */
export default function LoadingSpinner({ label = "Loading..." }: LoadingSpinnerProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 text-gray-600">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}


