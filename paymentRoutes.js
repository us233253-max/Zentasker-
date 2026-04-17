const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// @route   POST /api/payments/create-intent
// @desc    Create Stripe payment intent
// @access  Private
router.post('/create-intent', protect, paymentController.createPaymentIntent);

// @route   POST /api/payments/webhook
// @desc    Stripe webhook handler
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

// @route   GET /api/payments/transactions
// @desc    Get user's transactions
// @access  Private
router.get('/transactions', protect, paymentController.getTransactions);

// @route   GET /api/payments/escrow/:orderId
// @desc    Get escrow status
// @access  Private
router.get('/escrow/:orderId', protect, paymentController.getEscrowStatus);

// @route   POST /api/payments/withdraw
// @desc    Request withdrawal
// @access  Private (freelancer)
router.post('/withdraw', protect, paymentController.requestWithdrawal);

// @route   GET /api/payments/balance
// @desc    Get user's balance
// @access  Private
router.get('/balance', protect, paymentController.getBalance);

module.exports = router;
