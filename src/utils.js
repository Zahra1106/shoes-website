// Small helpers used everywhere

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// People who ask their device for less motion get instant changes instead of animations
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const money = (n) => 'Rs ' + n.toLocaleString('en-US');
