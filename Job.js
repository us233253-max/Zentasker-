const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
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
    subcategory: String,
    budget: {
      type: {
        type: String,
        enum: ['fixed', 'hourly'],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 1,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    skillsRequired: [String],
    experienceLevel: {
      type: String,
      enum: ['entry', 'intermediate', 'expert'],
      default: 'intermediate',
    },
    projectLength: {
      type: String,
      enum: ['less-than-1-week', '1-week-to-1-month', '1-to-3-months', '3-to-6-months', 'more-than-6-months'],
    },
    deadline: Date,
    isUrgent: {
      type: Boolean,
      default: false,
    },
    proposalsCount: {
      type: Number,
      default: 0,
    },
    hiredCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'in-progress', 'completed', 'cancelled'],
      default: 'open',
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    attachments: [
      {
        name: String,
        url: String,
        publicId: String,
      },
    ],
    preferredFreelancers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
jobSchema.index({ title: 'text', description: 'text', skillsRequired: 'text' });

module.exports = mongoose.model('Job', jobSchema);
