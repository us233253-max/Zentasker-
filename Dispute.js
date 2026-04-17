const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'quality-issue',
        'late-delivery',
        'incomplete-work',
        'communication-issue',
        'fraud',
        'other',
      ],
    },
    description: {
      type: String,
      required: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    evidence: [
      {
        type: String,
        url: String,
        description: String,
      },
    ],
    status: {
      type: String,
      enum: ['open', 'under-review', 'mediation', 'resolved', 'closed'],
      default: 'open',
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adminNotes: [
      {
        note: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolution: {
      type: String,
      enum: ['refund-client', 'pay-freelancer', 'partial-refund', 'split', 'other'],
    },
    resolutionDetails: String,
    refundAmount: Number,
    payoutAmount: Number,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Dispute', disputeSchema);
