import { getStoredItems, normalizeItems, resolveCart, saveItems } from '../services/cartService.js';

// POST /api/cart/preview  (public: prices a guest's cart; nothing is saved)
export const previewCart = async (req, res) => {
  const items = normalizeItems(req.body.items);
  return res.json(await resolveCart(items));
};

// GET /api/cart
export const getCart = async (req, res) => {
  const items = await getStoredItems(req.user._id);
  return res.json(await resolveCart(items));
};

// PUT /api/cart  (replaces the saved cart with exactly these items)
export const replaceCart = async (req, res) => {
  const items = normalizeItems(req.body.items);
  await saveItems(req.user._id, items);
  return res.json(await resolveCart(items));
};

// POST /api/cart/merge  (adds a guest cart into the saved cart after sign-in)
export const mergeCart = async (req, res) => {
  const stored = await getStoredItems(req.user._id);
  const items = normalizeItems([...stored, ...req.body.items]);
  await saveItems(req.user._id, items);
  return res.json(await resolveCart(items));
};