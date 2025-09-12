import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t mt-12">
      <div className="max-w-6xl mx-auto p-6 text-sm text-gray-500 flex justify-between">
        <p>© Tailor It {new Date().getFullYear()}</p>
        <p>Crafted with ❤️ for demo</p>
      </div>
    </footer>
  );
}
