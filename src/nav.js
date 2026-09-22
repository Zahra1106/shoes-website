import { $, $$ } from './utils.js';
import { scrollToTarget } from './scroll.js';

// Top bar, mobile menu and the in-page links (#collection, #craft ...)
export function initNav() {
  const nav = $('#nav');
  const menu = $('#menu');
  const menuButton = $('#menu-btn');

  const closeMenu = () => {
    menu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  };

  menuButton.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || hash.length < 2) return;
      const target = $(hash);
      if (!target) return;
      event.preventDefault();
      closeMenu();
      scrollToTarget(target, hash);
    });
  });

  // The bar is see-through over the hero video and becomes solid afterwards
  return { setSolid: (solid) => nav.classList.toggle('solid', solid) };
}
