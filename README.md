# TERRA | Runner 01

A one-page sneaker storefront built around a scroll-controlled "exploded view" video of the shoe,
a 3D coverflow showcase for four colorways, and a working cart with checkout.

- **Live site:** (add your link here once deployed)
- **Source code:** (add your GitHub link here)

## The idea

The site tells one simple story as you scroll:

1. **Hero** — a short video of the shoe (stored as 121 still pictures) plays forwards and
   backwards as you scroll. The shoe comes apart into its four layers, each one is labelled,
   and then it comes back together.
2. **Story** — a short line about the brand that lights up word by word as it scrolls into view.
3. **Collection** — a drag/swipe 3D carousel of the four colorways (Sand, Cognac, Espresso,
   Stone), with size selection and "Add to cart".
4. **Anatomy** — four cards explaining what each layer of the shoe does, with a mouse-tilt effect.
5. **FAQ** — sizing, delivery and returns, as an accordion.
6. **CTA + footer** — a closing call to action and site links.

A cart drawer (bottom-right icon) holds items across a page refresh (saved in the browser), and
a simple checkout form emails the order to your inbox — no backend server required.

## Features

- Scroll-scrubbed "exploded view" hero video, built from still images so it loads fast and works
  without a video player
- The plain studio background behind the shoe is extended and feathered automatically, so the
  shot fills any screen shape without hard edges
- 3D coverflow product carousel — drag, swipe, arrow keys, or click a colorway dot
- Cart with quantities, persisted in `localStorage`
- Checkout form (name, phone, email, address) that emails the order via Web3Forms — free, no
  backend needed
- Word-by-word scroll text reveal, mouse-tilt cards, smooth inertia scrolling (Lenis)
- Fully responsive (phone, tablet, desktop), dark-mode aware, visible keyboard focus throughout
- Respects "reduce motion" system settings — animations are skipped, not just slowed down

## Tech stack

- [Vite](https://vite.dev/) — dev server and build
- Plain JavaScript (ES modules), no framework — see [Project structure](#project-structure)
- [Lenis](https://github.com/darkroomengineering/lenis) — smooth scrolling
- [Fontsource](https://fontsource.org/) — self-hosted Fraunces + Hanken Grotesk fonts
- [Web3Forms](https://web3forms.com/) — emails the checkout order, free, no backend
- Plain CSS with custom properties (no Tailwind/framework)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open the local address shown in the terminal (usually `http://localhost:5173`).

```bash
npm run build     # production build, output in dist/
npm run preview   # preview the production build locally
```

## Checkout setup (required to receive orders)

Checkout emails the order through [Web3Forms](https://web3forms.com/) — free, and no backend to
host or maintain.

1. Go to [web3forms.com](https://web3forms.com/) and create a form:
   - **Form Name:** anything, e.g. `Terra Orders`
   - **Website URL:** your domain once deployed (use `localhost` while testing)
   - **Send Submissions To:** the email you want orders to arrive at
2. Copy the **access key** it gives you.
3. Open `src/cart.js` and paste it in:
   ```js
   const WEB3FORMS_ACCESS_KEY = 'your-access-key-here';
   ```
4. That's it — no server, no `.env` file. The access key is meant to be public/client-side, so
   it's safe to leave in the code.

Until a key is set, clicking "Place order" shows a message explaining that ordering isn't
connected yet, instead of silently failing.

## Project structure

```
terra-app/
├── index.html            All page content and markup
├── src/
│   ├── main.js            Starts everything: fonts, styles, and every module below
│   ├── data.js             Colorways, prices, sizes — edit this first for content changes
│   ├── hero.js              The scroll-scrubbed video (loading, drawing, background fill)
│   ├── showcase.js          The 3D coverflow carousel
│   ├── cart.js               Cart drawer + checkout (Web3Forms)
│   ├── nav.js                 Top bar + mobile menu + in-page scrolling
│   ├── reveal.js               Word-by-word scroll text reveal
│   ├── tilt.js                  Mouse-tilt effect on the Anatomy cards
│   ├── scroll.js                Lenis smooth-scroll wrapper
│   ├── ui.js                     The small toast/notification message
│   ├── utils.js                   Small shared helpers ($, clamp, money, ...)
│   └── style.css                  All styling (custom properties at the top)
└── public/
    ├── frames/                121 still pictures that make up the hero video
    ├── products/                4 colorway photos used in the carousel and cart
    └── favicon.svg
```

## Editing content

| What to change | Where |
|---|---|
| Colorway names, prices, descriptions | `src/data.js` → `PRODUCTS` |
| Available sizes | `src/data.js` → `SIZES` |
| Hero heading, story text, FAQ, footer links | `index.html` |
| Anatomy card text | `index.html`, inside `<section id="craft">` |
| Colors, fonts, spacing | `src/style.css` (custom properties near the top of the file) |
| Product photos | replace the files in `public/products/` (keep the same file names) |
| Hero video frames | replace the files in `public/frames/` (`f_001.webp` … `f_121.webp`) |

## Deployment

Any static host works (Vercel, Netlify, GitHub Pages):

1. `npm run build`
2. Deploy the generated `dist/` folder
3. Update the **Website URL** on your Web3Forms form to match the live domain

## Browser support notes

- The hero video effect uses `<canvas>` and works in all modern browsers.
- Smooth scrolling (Lenis) loads only if the visitor's device allows motion; if it fails to load,
  the page falls back to normal scrolling — nothing breaks.
- Checkout uses `fetch`; no build step or backend is required to receive orders.
