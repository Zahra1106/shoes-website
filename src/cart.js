import { $, $$, money } from './utils.js';
import { PRODUCTS } from './data.js';
import { toast } from './ui.js';
import { startScroll, stopScroll } from './scroll.js';

// Shopping cart drawer. Items are kept in localStorage so a page refresh does not empty it.
const STORAGE_KEY = 'terra-cart';

/*
  Orders are emailed through Web3Forms (the same free service the contact form on the
  portfolio project used) - no backend needed. To receive orders in your own inbox:
  1. Get a free access key at https://web3forms.com (just enter your email, no account needed).
  2. Paste it below, between the quotes.
  Until a key is set, "Place order" shows a message explaining that ordering isn't connected yet.
*/
const WEB3FORMS_ACCESS_KEY = '4f6fd912-a3b0-4f05-8f9a-63211ec635db';

export function initCart() {
  const drawer = $('#drawer');
  const scrim = $('#scrim');
  const list = $('#cart-list');
  let lastFocus = null;

  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; } catch (error) { cart = []; }
  cart = cart.filter((line) => line && PRODUCTS.some((p) => p.id === line.pid) && line.qty > 0);

  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (error) { /* private mode */ } };
  const product = (id) => PRODUCTS.find((p) => p.id === id);

  function render() {
    const items = cart.reduce((sum, line) => sum + line.qty, 0);
    const badge = $('#cart-count');
    badge.textContent = items;
    badge.hidden = items === 0;
    $('#cart-open').setAttribute('aria-label', `Open cart, ${items} item${items === 1 ? '' : 's'}`);

    let total = 0;
    if (!cart.length) {
      list.innerHTML = '<div class="empty">Your cart is empty.<br>Pick a colorway and a size to get started.</div>';
    } else {
      list.innerHTML = cart.map((line, i) => {
        const p = product(line.pid);
        total += p.price * line.qty;
        return `<div class="line"><img alt="" src="${p.img}"><div><b>Runner 01 · ${p.name}</b>` +
          `<small>Size ${line.size} · ${money(p.price)}</small>` +
          `<div class="qty"><button type="button" data-a="dec" data-i="${i}" aria-label="Decrease quantity">−</button>` +
          `<span aria-live="polite">${line.qty}</span>` +
          `<button type="button" data-a="inc" data-i="${i}" aria-label="Increase quantity">+</button></div></div>` +
          `<div><b>${money(p.price * line.qty)}</b><button class="rm" type="button" data-a="rm" data-i="${i}">Remove</button></div></div>`;
      }).join('');
    }
    $('#cart-sum').textContent = money(total);
    $('#checkout').disabled = !cart.length;
    $('#checkout').style.opacity = cart.length ? 1 : 0.5;
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-a]');
    if (!button) return;
    const index = Number(button.dataset.i);
    const action = button.dataset.a;
    const line = cart[index];
    if (!line) return;
    if (action === 'inc') line.qty = Math.min(9, line.qty + 1);
    if (action === 'dec') line.qty -= 1;
    if (action === 'rm' || line.qty <= 0) cart.splice(index, 1);
    save();
    render();
  });

  function open() {
    lastFocus = document.activeElement;
    scrim.classList.add('open');
    drawer.classList.add('open');
    stopScroll();
    // always start from the cart view, not a checkout form left open from last time
    $('#checkout-form').hidden = true;
    $('#checkout').hidden = false;
    $('#co-status').textContent = '';
    setTimeout(() => $('#cart-close').focus(), 50);
  }
  function close() {
    scrim.classList.remove('open');
    drawer.classList.remove('open');
    startScroll();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#cart-open').addEventListener('click', open);
  $('#cart-close').addEventListener('click', close);
  scrim.addEventListener('click', close);

  // Escape closes the cart, Tab stays inside it
  document.addEventListener('keydown', (event) => {
    if (!drawer.classList.contains('open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const focusable = $$('button:not([disabled])', drawer);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
  });

  /* ---------- checkout ---------- */
  const checkoutButton = $('#checkout');
  const checkoutForm = $('#checkout-form');
  const checkoutStatus = $('#co-status');
  let placingOrder = false;

  checkoutButton.addEventListener('click', () => {
    if (!cart.length) return;
    checkoutButton.hidden = true;
    checkoutForm.hidden = false;
    $('#co-name').focus();
  });

  function orderSummary() {
    let total = 0;
    const lines = cart.map((line) => {
      const p = product(line.pid);
      total += p.price * line.qty;
      return `- Runner 01 · ${p.name} · size ${line.size} · qty ${line.qty} · ${money(p.price * line.qty)}`;
    });
    lines.push(`Total: ${money(total)}`);
    return lines.join('\n');
  }

  checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (placingOrder) return;
    const data = new FormData(checkoutForm);
    if (data.get('botcheck')) return; // hidden field, only bots fill it in

    if (!WEB3FORMS_ACCESS_KEY) {
      checkoutStatus.textContent = "Ordering isn't connected yet. Add a Web3Forms access key in src/cart.js.";
      checkoutStatus.className = 'co-status error';
      return;
    }

    placingOrder = true;
    checkoutStatus.textContent = 'Placing your order…';
    checkoutStatus.className = 'co-status';
    $('#place-order').disabled = true;

    data.append('access_key', WEB3FORMS_ACCESS_KEY);
    data.append('subject', `New Terra order from ${data.get('name')}`);
    data.append('from_name', 'Terra storefront');
    data.append('order_details', orderSummary());

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      const result = await response.json();
      if (response.ok && result.success) {
        cart = [];
        save();
        render();
        checkoutForm.reset();
        checkoutForm.hidden = true;
        checkoutButton.hidden = false;
        checkoutStatus.textContent = '';
        toast("Order placed! We'll be in touch to confirm delivery.");
        setTimeout(close, 1200);
      } else {
        checkoutStatus.textContent = 'Could not place your order. Please try again.';
        checkoutStatus.className = 'co-status error';
      }
    } catch (error) {
      checkoutStatus.textContent = 'Could not place your order. Please check your connection and try again.';
      checkoutStatus.className = 'co-status error';
    } finally {
      placingOrder = false;
      $('#place-order').disabled = false;
    }
  });

  function add(item, size) {
    const existing = cart.find((line) => line.pid === item.id && line.size === size);
    if (existing) existing.qty = Math.min(9, existing.qty + 1);
    else cart.push({ pid: item.id, size, qty: 1 });
    save();
    render();
    toast(`Added Runner 01 · ${item.name} (size ${size}) to your cart.`);
  }

  render();
  return { add };
}