// Fonts (installed from npm, so they also work offline)
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';

import './style.css';

import { initCart } from './cart.js';
import { initHero } from './hero.js';
import { initNav } from './nav.js';
import { initReveals } from './reveal.js';
import { initShowcase } from './showcase.js';
import { initSmoothScroll, isSmooth, updateScroll } from './scroll.js';
import { initTilt } from './tilt.js';

const nav = initNav();
const hero = initHero();
const reveals = initReveals();
const cart = initCart();
const showcase = initShowcase({ addToCart: cart.add });
initTilt();

// One loop that keeps everything in sync with the scroll position
function frame(time) {
  updateScroll(time);

  // the top bar turns solid once the hero video is finished
  const heroEnd = hero.el.offsetTop + hero.el.offsetHeight - innerHeight - 40;
  nav.setSolid((window.pageYOffset || 0) > heroEnd);

  hero.update(isSmooth());
  reveals.update();
  showcase.update();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  hero.resize();
  showcase.relayout();
});

hero.resize();

// Start loading the video pictures and the smooth scrolling after the first paint
requestAnimationFrame(() => {
  setTimeout(() => {
    hero.startLoading();
    initSmoothScroll();
  }, 0);
});
requestAnimationFrame(frame);
