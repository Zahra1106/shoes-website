// All the content you are likely to edit lives here.

const BASE = import.meta.env.BASE_URL;

// The hero video is stored as separate pictures: public/frames/f_001.webp ... f_121.webp
export const FRAME_COUNT = 121;
export const FRAME_W = 1024;
export const FRAME_H = 688;
export const frameUrl = (index) => `${BASE}frames/f_${String(index + 1).padStart(3, '0')}.webp`;

// Colorways shown in the 3D showcase and the cart. Photos are in public/products/
export const PRODUCTS = [
  { id: 'sand', name: 'Sand', price: 13900, swatch: '#d8bb98',
    desc: 'A soft, sunlit neutral that goes with everything in your wardrobe.' },
  { id: 'cognac', name: 'Cognac', price: 14900, swatch: '#d99a55',
    desc: 'Warm caramel tones with a bright sole that catches the light.' },
  { id: 'espresso', name: 'Espresso', price: 14900, swatch: '#5e3b24',
    desc: 'Deep, dark and a little dressed-up. Great from the office to the weekend.' },
  { id: 'stone', name: 'Stone', price: 13900, swatch: '#c2b3a1',
    desc: 'A cool taupe for quieter days. Easy to wear and easy to match.' },
].map((product) => ({ ...product, img: `${BASE}products/${product.id}.webp` }));

export const SIZES = [38, 39, 40, 41, 42, 43, 44, 45];
