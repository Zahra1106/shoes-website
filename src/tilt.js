import { $$, reduceMotion } from './utils.js';

// The "Anatomy" cards lean towards the mouse (only on devices that have a mouse)
export function initTilt() {
  if (reduceMotion || !window.matchMedia('(hover:hover)').matches) return;
  $$('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      card.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 14).toFixed(2)}deg) translateZ(8px)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}
