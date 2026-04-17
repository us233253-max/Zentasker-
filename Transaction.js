const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    type: {
      type: String,
      enum: ['payment', 'withdrawal', 'refund', 'commission', 'bonus', 'adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'razorpay', 'paypal', 'bank_transfer', 'crypto'],
    },
    paymentDetails: {
      stripePaymentIntent: String,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      bankAccount: String,
    },
    description: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
    },
    escrowReleasedAt: Date,
    processedAt: Date,
    failedReason: String,
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
