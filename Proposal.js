const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverLetter: {
      type: String,
      required: [true, 'Cover letter is required'],
      maxlength: [3000, 'Cover letter cannot exceed 3000 characters'],
    },
    bidAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    deliveryDays: {
      type: Number,
      required: true,
      min: 1,
    },
    attachments: [
      {
        name: String,
        url: String,
        publicId: String,
      },
    ],
    questions: [
      {
        question: String,
        answer: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'hired'],
      default: 'pending',
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    aiPrompt: String,
    viewedByClient: {
      type: Boolean,
      default: false,
    },
    clientResponse: String,
    respondedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate proposals
proposalSchema.index({ jobId: 1, freelancerId: 1 }, { unique: true });

module.exports = mongoose.model('Proposal', proposalSchema);
