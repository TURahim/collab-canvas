"use client";

import React from "react";

type LoadingSpinnerProps = {
  label?: string;
};

export default function LoadingSpinner({ label = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-gray-600">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}


