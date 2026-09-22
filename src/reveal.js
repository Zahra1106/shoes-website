import { $$, clamp, reduceMotion } from './utils.js';

// Text with the data-reveal attribute lights up word by word while you scroll
export function initReveals() {
  const blocks = $$('[data-reveal]').map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const spans = words.map((word, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = word;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return span;
    });
    return { el, spans, last: -1 };
  });

  function update() {
    blocks.forEach((block) => {
      const box = block.el.getBoundingClientRect();
      if (box.bottom < -50 || box.top > innerHeight + 50) return;
      const progress = reduceMotion ? 1 : clamp((innerHeight * 0.88 - box.top) / (box.height + innerHeight * 0.3));
      const key = Math.round(progress * 200);
      if (key === block.last) return;
      block.last = key;
      const count = block.spans.length;
      block.spans.forEach((span, i) => {
        const lit = clamp(progress * count * 1.12 - i, 0, 1);
        span.style.opacity = (0.2 + 0.8 * lit).toFixed(2);
      });
    });
  }

  return { update };
}
