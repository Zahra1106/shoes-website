import { $, $$, clamp, money, reduceMotion } from './utils.js';
import { PRODUCTS, SIZES } from './data.js';
import { toast } from './ui.js';

/*
  The 3D "coverflow" carousel: drag, swipe, use the arrows or the colour dots.
  `position` is which colorway is in front (0, 1, 2 ...). It can be a fraction while moving.
*/
export function initShowcase({ addToCart }) {
  const stage = $('#stage3d');
  const dotsEl = $('#dots');
  const chipsEl = $('#chips');
  const info = $('#info');
  const count = PRODUCTS.length;

  let position = 0;        // where the carousel is now
  let target = 0;          // where it is heading
  let selected = 0;        // colorway shown in the panel
  let size = null;         // chosen size
  let lastLaidOut = -99;

  let dragging = false, captured = false, startX = 0, startTarget = 0, moved = 0;

  /* ---------- build the cards, dots and size buttons ---------- */
  const items = PRODUCTS.map((product) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'item3d';
    button.setAttribute('aria-label', `Show ${product.name} colorway`);
    button.innerHTML =
      `<img alt="Terra Runner 01 in ${product.name}" src="${product.img}" draggable="false">` +
      `<span class="tag"><b>${product.name}</b><i>${money(product.price)}</i></span>`;
    stage.appendChild(button);
    return button;
  });

  const dots = PRODUCTS.map((product, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.style.setProperty('--c', product.swatch);
    dot.setAttribute('aria-label', product.name);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
    return dot;
  });

  SIZES.forEach((value) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = value;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      size = value;
      $$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    });
    chipsEl.appendChild(chip);
  });

  /* ---------- moving ---------- */
  // the nearest way to reach card i (the carousel loops around)
  const towards = (i) => i + count * Math.round((target - i) / count);
  function goTo(i) { target = towards(i); if (reduceMotion) position = target; }
  function step(direction) { target = Math.round(target) + direction; if (reduceMotion) position = target; }

  function layout() {
    const width = items[0].offsetWidth || 300;
    items.forEach((card, i) => {
      let d = i - position;
      d = ((d + count / 2) % count + count) % count - count / 2; // -2 ... 2
      const a = Math.abs(d);
      const x = d * width * 0.7;
      const z = -a * width * 0.55;
      const rotate = clamp(-d * 34, -68, 68);
      const scale = 1 - Math.min(a, 2) * 0.06;
      const opacity = a > 1.55 ? 0 : 1 - a * 0.22;
      card.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${rotate.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.zIndex = String(100 - Math.round(a * 10));
      card.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto';
      card.tabIndex = a < 0.5 ? 0 : -1;
    });
  }

  function updatePanel() {
    const product = PRODUCTS[selected];
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === selected)));
    info.classList.add('out');
    setTimeout(() => {
      $('#p-name').textContent = product.name;
      $('#p-price').textContent = money(product.price);
      $('#p-desc').textContent = product.desc;
      info.classList.remove('out');
    }, reduceMotion ? 0 : 180);
  }

  /* ---------- mouse, touch and keyboard ---------- */
  stage.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    dragging = true;
    captured = false;
    startX = event.clientX;
    startTarget = target;
    moved = 0;
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 5 && !captured) {
      captured = true;
      stage.classList.add('drag');
      try { stage.setPointerCapture(event.pointerId); } catch (error) { /* not important */ }
    }
    if (captured) target = startTarget - dx / ((items[0].offsetWidth || 300) * 0.65);
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('drag');
    if (captured) target = Math.round(target); // snap to the nearest card
    else {
      const card = event.target.closest ? event.target.closest('.item3d') : null; // it was a click
      if (card) goTo(items.indexOf(card));
    }
    captured = false;
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { step(1); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { step(-1); event.preventDefault(); }
  });
  items.forEach((card, i) => card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') goTo(i);
  }));
  $('#next').addEventListener('click', () => step(1));
  $('#prev').addEventListener('click', () => step(-1));

  /* ---------- add to cart ---------- */
  $('#add').addEventListener('click', () => {
    if (!size) {
      chipsEl.classList.remove('shake');
      void chipsEl.offsetWidth; // restarts the shake animation
      chipsEl.classList.add('shake');
      toast('Please pick a size first.');
      return;
    }
    addToCart(PRODUCTS[selected], size);
  });

  /* ---------- called on every animation frame ---------- */
  function update() {
    if (!reduceMotion) {
      position += (target - position) * 0.11;
      if (Math.abs(target - position) < 0.0008) position = target;
    }
    if (Math.abs(position - lastLaidOut) > 0.0004) {
      layout();
      lastLaidOut = position;
    }
    const now = ((Math.round(target) % count) + count) % count;
    if (now !== selected) {
      selected = now;
      updatePanel();
    }
  }

  updatePanel();
  layout();

  return { update, relayout: () => { lastLaidOut = -99; } };
}
