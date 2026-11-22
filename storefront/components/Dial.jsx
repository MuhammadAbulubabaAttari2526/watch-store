'use client';

import { useEffect, useState } from 'react';

// A dial drawn in SVG, showing the visitor's real local time.
export default function Dial() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = setInterval(() => setNow(new Date()), calm ? 60000 : 1000);
    return () => clearInterval(id);
  }, []);
  // Hands start at 12 on every render, then jump to the visitor's real time once mounted.
  const s = now ? deg(now.getSeconds()) : 0;
  const m = now ? Number((now.getMinutes() * 6 + now.getSeconds() / 10).toFixed(3)) : 0;
  const h = now ? Number(((now.getHours() % 12) * 30 + now.getMinutes() / 2).toFixed(3)) : 0;
  function deg(x) { return x * 6; }
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const major = i % 5 === 0, a = (i * 6 * Math.PI) / 180, r1 = 178, r2 = major ? 160 : 169;
    return <line key={i} x1={Number((200 + r1 * Math.sin(a)).toFixed(3))} y1={Number((200 - r1 * Math.cos(a)).toFixed(3))} x2={Number((200 + r2 * Math.sin(a)).toFixed(3))} y2={Number((200 - r2 * Math.cos(a)).toFixed(3))}
      stroke={major ? '#C5A46D' : '#8a8374'} strokeWidth={major ? 2.5 : 1} />;
  });
  const numerals = [['XII', 200, 132], ['III', 268, 208], ['VI', 200, 284], ['IX', 132, 208]];
  return (
    <svg className="dial" viewBox="0 0 400 400" role="img" aria-label="VELTRIX watch dial showing the current time">
      <circle cx="200" cy="200" r="196" fill="#0b0b0b" stroke="#C5A46D" strokeWidth="2" />
      <circle cx="200" cy="200" r="188" fill="#161616" />
      {ticks}
      {numerals.map(([t, x, y]) => <text key={t} x={x} y={y} textAnchor="middle" fill="#F5F3EF" fontFamily="var(--font-display)" fontSize="26">{t}</text>)}
      <text x="200" y="250" textAnchor="middle" fill="#C5A46D" fontFamily="var(--font-body)" fontSize="11" letterSpacing="4">VELTRIX</text>
      <line x1="200" y1="200" x2="200" y2="120" stroke="#F5F3EF" strokeWidth="6" strokeLinecap="round" transform={`rotate(${h} 200 200)`} />
      <line x1="200" y1="200" x2="200" y2="70" stroke="#F5F3EF" strokeWidth="4" strokeLinecap="round" transform={`rotate(${m} 200 200)`} />
      <line x1="200" y1="222" x2="200" y2="50" stroke="#C5A46D" strokeWidth="1.5" transform={`rotate(${s} 200 200)`} />
      <circle cx="200" cy="200" r="7" fill="#C5A46D" />
    </svg>
  );
}

