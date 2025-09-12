import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border shadow-sm bg-white ${className}`}>
      {children}
    </div>
  );
}
