const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// @route   GET /api/reviews/user/:userId
// @desc    Get user's reviews
// @access  Public
router.get('/user/:userId', reviewController.getUserReviews);

// @route   GET /api/reviews/order/:orderId
// @desc    Get order review
// @access  Private
router.get('/order/:orderId', protect, reviewController.getOrderReview);

// @route   POST /api/reviews
// @desc    Create review
// @access  Private
router.post('/', protect, reviewController.createReview);

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private (review owner)
router.put('/:id', protect, reviewController.updateReview);

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private (review owner or admin)
router.delete('/:id', protect, reviewController.deleteReview);

// @route   POST /api/reviews/:id/response
// @desc    Add seller response
// @access  Private (reviewee)
router.post('/:id/response', protect, reviewController.addSellerResponse);

// @route   POST /api/reviews/:id/helpful
// @desc    Mark review as helpful
// @access  Private
router.post('/:id/helpful', protect, reviewController.markHelpful);

module.exports = router;
