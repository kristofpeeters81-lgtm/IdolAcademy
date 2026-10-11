import { useEffect, useState } from 'react';

/**
 * Waar staat het camerabeeld (.frame) op het scherm? Games tekenen hun doelen in
 * schermcoördinaten 0..1 van dát beeld, dus we hebben de echte positie in pixels nodig.
 */
export function useFrameRect(): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const el = document.querySelector('.frame');
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);
  return rect;
}
