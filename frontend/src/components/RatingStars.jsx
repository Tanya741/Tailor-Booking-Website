import React from 'react';

export default function RatingStars({ value = 0 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex text-yellow-500">
      {stars.map(n => (
        <svg key={n} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={value >= n ? 'currentColor' : 'none'} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.48 3.499a.562.562 0 011.04 0l2.125 4.303a.563.563 0 00.424.307l4.747.69c.497.072.696.683.335 1.03l-3.431 3.343a.563.563 0 00-.162.497l.81 4.725a.562.562 0 01-.814.592l-4.243-2.23a.563.563 0 00-.524 0l-4.243 2.23a.562.562 0 01-.814-.592l.81-4.725a.563.563 0 00-.162-.497L3.85 9.829a.563.563 0 01.335-1.03l4.747-.69a.563.563 0 00.424-.307l2.125-4.303z" />
        </svg>
      ))}
    </div>
  );
}
