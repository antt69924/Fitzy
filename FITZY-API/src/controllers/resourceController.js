const slugify = require('slugify');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Post = require('../models/Post');
const Promotion = require('../models/Promotion');
const Favorite = require('../models/Favorite');
const Review = require('../models/Review');
const User = require('../models/User');
const Order = require('../models/Order');
const orderService = require('../services/orderService');
const { AppError, asyncHandler, pageResult } = require('../utils/errors');

const definitions = {
  categories: { Model: Category, fields: ['name', 'description', 'image', 'status'], uniqueSlug: true },
  products: { Model: Product, fields: ['name', 'description', 'category', 'images', 'price', 'compareAtPrice', 'variants', 'status', 'featured', 'tags', 'salesCount'], uniqueSlug: true },
  posts: { Model: Post, fields: ['title', 'excerpt', 'content', 'image', 'status', 'publishedAt'], slugField: 'title', uniqueSlug: true },
  promotions: { Model: Promotion, fields: ['code', 'discountType', 'discountValue', 'minimumOrder', 'maximumDiscount', 'startsAt', 'endsAt', 'usageLimit', 'active'] }
};

function pick(source, fields) { return Object.fromEntries(Object.entries(source || {}).filter(([key]) => fields.includes(key))); }
function slugBase(name) { return slugify(String(name || ''), { lower: true, strict: true }) || `item-${Date.now()}`; }

function adminList(kind) {
  const { Model } = definitions[kind];
  return asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      const key = kind === 'posts' ? 'title' : kind === 'promotions' ? 'code' : 'name';
      filter[key] = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (kind === 'products' && req.query.category) filter.category = req.query.category;
    const [items, total] = await Promise.all([Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Model.countDocuments(filter)]);
    res.json({ success: true, data: pageResult(items, total, page, limit) });
  });
}

function adminCreate(kind) {
  const definition = definitions[kind];
  return asyncHandler(async (req, res) => {
    const data = pick(req.body, definition.fields);
    if (definition.uniqueSlug) data.slug = slugBase(req.body.slug || req.body[definition.slugField || 'name']);
    if (kind === 'posts' && data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
    const item = await definition.Model.create(data);
    res.status(201).json({ success: true, data: { item } });
  });
}

function adminUpdate(kind) {
  const definition = definitions[kind];
  return asyncHandler(async (req, res) => {
    const update = pick(req.body, definition.fields);
    if (definition.uniqueSlug && (req.body.slug || req.body[definition.slugField || 'name'])) update.slug = slugBase(req.body.slug || req.body[definition.slugField || 'name']);
    if (kind === 'posts' && update.status === 'published' && !update.publishedAt) update.publishedAt = new Date();
    const item = await definition.Model.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!item) throw new AppError('Record not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: { item } });
  });
}

function adminDelete(kind) {
  const { Model } = definitions[kind];
  return asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw new AppError('Record not found', 404, 'NOT_FOUND');
    if (kind === 'categories') {
      if (await Product.exists({ category: item._id })) throw new AppError('Category has products. Hide it instead of deleting it.', 409, 'CATEGORY_IN_USE');
      await item.deleteOne();
    } else if (kind === 'products') { item.status = 'hidden'; await item.save(); }
    else if (kind === 'promotions' && item.usedCount > 0) { item.active = false; await item.save(); }
    else await item.deleteOne();
    res.json({ success: true, data: { message: kind === 'products' ? 'Product hidden' : 'Record deleted' } });
  });
}

const publicCategories = asyncHandler(async (req, res) => res.json({ success: true, data: { items: await Category.find({ status: 'active' }).sort({ name: 1 }) } }));
const publicPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(30, Number(req.query.limit) || 10); const filter = { status: 'published', publishedAt: { $lte: new Date() } };
  const [items, total] = await Promise.all([Post.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit), Post.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const publicPostDetail = asyncHandler(async (req, res) => {
  const item = await Post.findOne({ slug: req.params.slug, status: 'published', publishedAt: { $lte: new Date() } });
  if (!item) throw new AppError('Article not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { item } });
});

const favoritesList = asyncHandler(async (req, res) => res.json({ success: true, data: { items: await Favorite.find({ user: req.user.id }).populate({ path: 'product', match: { status: 'active' }, populate: { path: 'category', select: 'name slug' } }) } }));
const favoriteAdd = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) throw new AppError('Invalid product id', 400, 'INVALID_ID');
  if (!await Product.exists({ _id: req.params.productId, status: 'active' })) throw new AppError('Product not found', 404, 'NOT_FOUND');
  const item = await Favorite.findOneAndUpdate({ user: req.user.id, product: req.params.productId }, { $setOnInsert: { user: req.user.id, product: req.params.productId } }, { upsert: true, new: true }).populate('product');
  res.status(201).json({ success: true, data: { item } });
});
const favoriteRemove = asyncHandler(async (req, res) => { await Favorite.deleteOne({ user: req.user.id, product: req.params.productId }); res.json({ success: true, data: { message: 'Favorite removed' } }); });

const createReview = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id, status: 'completed', 'items.product': req.params.productId });
  if (!order) throw new AppError('Only buyers with a completed order can review this product', 403, 'REVIEW_NOT_ALLOWED');
  const review = await Review.create({ product: req.params.productId, user: req.user.id, order: order._id, rating: req.body.rating, comment: req.body.comment || '' });
  res.status(201).json({ success: true, data: { review } });
});
const ownReviewUpdate = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: pick(req.body, ['rating', 'comment']) }, { new: true, runValidators: true });
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { review } });
});
const ownReviewDelete = asyncHandler(async (req, res) => { const result = await Review.deleteOne({ _id: req.params.id, user: req.user.id }); if (!result.deletedCount) throw new AppError('Review not found', 404, 'NOT_FOUND'); res.json({ success: true, data: { message: 'Review deleted' } }); });

const adminReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Number(req.query.limit) || 20); const filter = {};
  if (req.query.rating) filter.rating = Number(req.query.rating); if (req.query.product) filter.product = req.query.product; if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([Review.find(filter).populate('user', 'name email').populate('product', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Review.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const moderateReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true, runValidators: true });
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { review } });
});

const customers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Number(req.query.limit) || 20); const filter = { role: 'customer' };
  if (req.query.q) { const q = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]; }
  const [items, total] = await Promise.all([User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const customerDetail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'customer' }).select('-passwordHash');
  if (!user) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  const [orderCount, spent] = await Promise.all([Order.countDocuments({ user: user._id }), Order.aggregate([{ $match: { user: user._id, status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }])]);
  res.json({ success: true, data: { user, orderCount, spent: spent[0]?.total || 0 } });
});
const blockCustomer = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'customer' }, { $set: { isBlocked: Boolean(req.body.isBlocked) } }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { user } });
});

const adminOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Number(req.query.limit) || 20); const filter = {};
  if (req.query.status) filter.status = req.query.status; if (req.query.from || req.query.to) filter.createdAt = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(`${req.query.to}T23:59:59.999Z`) } : {}) };
  const [items, total] = await Promise.all([Order.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Order.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const changeAdminOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id); if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { order: await orderService.changeOrderStatus(order, req.body.status, req.body.note) } });
});

const stats = asyncHandler(async (req, res) => {
  const range = req.query.range || 'month'; const start = new Date();
  if (range === 'day') start.setDate(start.getDate() - 29); else if (range === 'year') start.setFullYear(start.getFullYear() - 4, 0, 1); else start.setMonth(start.getMonth() - 11, 1);
  const [revenue, orders, customers, products, daily, topProducts] = await Promise.all([
    Order.aggregate([{ $match: { status: 'completed', createdAt: { $gte: start } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments({ createdAt: { $gte: start } }), User.countDocuments({ role: 'customer' }), Product.countDocuments({ status: 'active' }),
    Order.aggregate([{ $match: { status: 'completed', createdAt: { $gte: start } } }, { $group: { _id: { $dateToString: { format: range === 'day' ? '%Y-%m-%d' : range === 'year' ? '%Y' : '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Product.find({ status: 'active' }).sort({ salesCount: -1 }).limit(5).select('name price salesCount images')
  ]);
  res.json({ success: true, data: { revenue: revenue[0]?.total || 0, orderCount: orders, customerCount: customers, productCount: products, chart: daily, topProducts } });
});

module.exports = { definitions, adminList, adminCreate, adminUpdate, adminDelete, publicCategories, publicPosts, publicPostDetail, favoritesList, favoriteAdd, favoriteRemove, createReview, ownReviewUpdate, ownReviewDelete, adminReviews, moderateReview, customers, customerDetail, blockCustomer, adminOrders, changeAdminOrderStatus, stats };
