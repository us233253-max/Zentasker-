const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const orderController = require('../controllers/orderController');

// @route   GET /api/orders/my-orders
// @desc    Get user's orders
// @access  Private
router.get('/my-orders', protect, orderController.getMyOrders);

// @route   GET /api/orders
// @desc    Get all orders (filtered by user role)
// @access  Private
router.get('/', protect, orderController.getOrders);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, orderController.getOrder);

// @route   POST /api/orders/:id/deliver
// @desc    Submit delivery
// @access  Private (freelancer)
router.post('/:id/deliver', protect, upload.array('files', 10), orderController.submitDelivery);

// @route   POST /api/orders/:id/revision
// @desc    Request revision
// @access  Private (client)
router.post('/:id/revision', protect, orderController.requestRevision);

// @route   POST /api/orders/:id/complete
// @desc    Complete order
// @access  Private (client)
router.post('/:id/complete', protect, orderController.completeOrder);

// @route   POST /api/orders/:id/dispute
// @desc    Raise dispute
// @access  Private
router.post('/:id/dispute', protect, orderController.raiseDispute);

// @route   PUT /api/orders/:id/requirements
// @desc    Submit requirements
// @access  Private (client)
router.put('/:id/requirements', protect, orderController.submitRequirements);

module.exports = router;
