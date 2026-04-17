const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Gig title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'graphics-design',
        'digital-marketing',
        'writing-translation',
        'video-animation',
        'music-audio',
        'programming-tech',
        'business',
        'lifestyle',
        'data',
        'photography',
      ],
    },
    subcategory: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    video: {
      url: String,
      publicId: String,
    },
    packages: {
      basic: {
        title: { type: String, default: 'Basic' },
        description: String,
        price: { type: Number, required: true, min: 5 },
        deliveryDays: { type: Number, required: true, min: 1 },
        revisions: { type: Number, default: 1 },
        features: [String],
      },
      standard: {
        title: { type: String, default: 'Standard' },
        description: String,
        price: { type: Number, required: true, min: 5 },
        deliveryDays: { type: Number, required: true, min: 1 },
        revisions: { type: Number, default: 2 },
        features: [String],
      },
      premium: {
        title: { type: String, default: 'Premium' },
        description: String,
        price: { type: Number, required: true, min: 5 },
        deliveryDays: { type: Number, required: true, min: 1 },
        revisions: { type: Number, default: 5 },
        features: [String],
      },
    },
    faqs: [
      {
        question: String,
        answer: String,
      },
    ],
    requirements: [
      {
        question: String,
        required: { type: Boolean, default: true },
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    ordersInQueue: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
    aiPrompt: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
gigSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Calculate average rating
gigSchema.methods.calculateRating = async function () {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { gigId: this._id } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    this.rating = Math.round(stats[0].avgRating * 10) / 10;
    this.reviewsCount = stats[0].count;
    await this.save();
  }
};

module.exports = mongoose.model('Gig', gigSchema);
