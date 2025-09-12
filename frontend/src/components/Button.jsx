import React from 'react';

export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
