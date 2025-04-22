import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Spinner = ({ size = "md", className = "" }: SpinnerProps) => {
  // Determine the size class
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  return (
    <div className={`flex items-center justify-center ${className}`} aria-label="Loading">
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClass}`}
        style={{ 
          borderTopColor: "transparent", 
          borderRightColor: "currentColor", 
          borderBottomColor: "currentColor", 
          borderLeftColor: "currentColor"
        }}
        role="status"
      />
    </div>
  );
};

export default Spinner;