import React from 'react';

export default function Drawer({ open, onClose, children, width = 360, title }) {
  return (
    <div
      className={`fixed inset-0 z-[100] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`absolute top-0 right-0 h-full bg-white shadow-xl ring-1 ring-accent/30 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-full flex flex-col">
          {title ? (
            <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-accent/10">
              <h3 className="font-semibold text-primary">{title}</h3>
            </div>
          ) : null}
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
