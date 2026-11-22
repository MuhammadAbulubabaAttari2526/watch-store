'use client';
import { useEffect, useRef, useState } from 'react';

export default function ProductGallery({ images, title }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const closeRef = useRef(null);
  const cur = images[i];
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => e.key === 'Escape' && setZoom(false);
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);
  if (!cur) return <div className="gallery"><div className="gallery__main"><div className="ph">No image yet</div></div></div>;
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%');
    e.currentTarget.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%');
  };
  return (
    <div className="gallery">
      <button type="button" className="gallery__main" onMouseMove={move} onClick={() => setZoom(true)} aria-label="Open larger image">
        <img src={cur.url} alt={`${title}, view ${i + 1} of ${images.length}`} width="900" height="1125" fetchPriority="high" decoding="async" />
      </button>
      {images.length > 1 && (
        <ul className="gallery__thumbs">
          {images.map((img, n) => (
            <li key={img.id || n}><button type="button" onClick={() => setI(n)} aria-label={`Show image ${n + 1}`} aria-current={n === i}><img src={img.url} alt="" loading="lazy" decoding="async" /></button></li>
          ))}
        </ul>
      )}
      {zoom && (
        <div className="modal modal--image" onClick={() => setZoom(false)}>
          <div role="dialog" aria-modal="true" aria-label={`${title}, enlarged`}>
            <button ref={closeRef} type="button" className="modal__close" onClick={() => setZoom(false)} aria-label="Close enlarged image">&times;</button>
            <img src={cur.url} alt={title} />
          </div>
        </div>
      )}
    </div>
  );
}
