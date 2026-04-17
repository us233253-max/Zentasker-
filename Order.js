const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    packageType: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
    },
    amount: {
      type: Number,
      required: true,
      min: 5,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    freelancerEarnings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'in-review', 'completed', 'cancelled', 'disputed'],
      default: 'pending',
    },
    requirements: [
      {
        question: String,
        answer: String,
        answeredAt: Date,
      },
    ],
    deliverables: [
      {
        message: String,
        files: [
          {
            name: String,
            url: String,
            publicId: String,
          },
        ],
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
        revisionNumber: {
          type: Number,
          default: 0,
        },
      },
    ],
    revisions: {
      allowed: {
        type: Number,
        default: 1,
      },
      used: {
        type: Number,
        default: 0,
      },
      requests: [
        {
          message: String,
          requestedAt: Date,
          resolved: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    timeline: {
      orderedAt: {
        type: Date,
        default: Date.now,
      },
      startedAt: Date,
      requirementsCompletedAt: Date,
      deliveredAt: Date,
      completedAt: Date,
      cancelledAt: Date,
    },
    deliveryDays: {
      type: Number,
      required: true,
    },
    expectedDeliveryDate: Date,
    isLate: {
      type: Boolean,
      default: false,
    },
    autoCompleteScheduled: Date,
    message: String,
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Set expected delivery date
orderSchema.pre('save', function (next) {
  if (this.isNew && this.deliveryDays) {
    this.expectedDeliveryDate = new Date(
      Date.now() + this.deliveryDays * 24 * 60 * 60 * 1000
    );
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
