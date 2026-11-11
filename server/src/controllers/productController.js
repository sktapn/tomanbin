const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { emit } = require('../socket');

const SORTS = {
  recent: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name: { name: 1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/products  (público) — filtros, busca, ordenação e paginação
exports.list = asyncHandler(async (req, res) => {
  const { category, tag, search, minPrice, maxPrice, sort, page, limit, all } = req.validatedQuery;
  const isAdmin = req.user?.role === 'admin';

  const filter = {};
  if (!(all && isAdmin)) filter.active = true;
  if (category) filter.category = category;
  if (tag) filter.tag = tag;
  if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null) filter.price.$gte = minPrice;
    if (maxPrice != null) filter.price.$lte = maxPrice;
  }

  const [items, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// GET /api/products/:id  (público)
exports.getById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  const isAdmin = req.user?.role === 'admin';
  if (!product || (!product.active && !isAdmin)) throw new AppError('Produto não encontrado', 404);
  res.json(product);
});

// POST /api/products  (admin)
exports.create = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(product);
});

// PUT /api/products/:id  (admin)
exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Produto não encontrado', 404);
  emit(null, 'stock:update', { productId: product._id, stock: product.stock });
  res.json(product);
});

// DELETE /api/products/:id  (admin)
exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Produto não encontrado', 404);
  res.status(204).end();
});
