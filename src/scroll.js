import { reduceMotion } from './utils.js';

// Smooth (inertia) scrolling with the "lenis" package.
// It is loaded after the page is visible. If it fails, normal scrolling keeps working.
let lenis = null;

export const isSmooth = () => lenis !== null;

export async function initSmoothScroll() {
  if (reduceMotion) return;
  try {
    const { default: Lenis } = await import('lenis');
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  } catch (error) {
    lenis = null;
  }
}

// Called on every animation frame from main.js
export const updateScroll = (time) => lenis?.raf(time);

// Used while the cart is open, so the page behind it does not move
export function stopScroll() {
  lenis?.stop();
  document.documentElement.style.overflow = 'hidden';
}
export function startScroll() {
  lenis?.start();
  document.documentElement.style.overflow = '';
}

export function scrollToTarget(element, hash) {
  if (lenis) lenis.scrollTo(hash === '#top' ? 0 : element, { duration: 1.3 });
  else element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}
