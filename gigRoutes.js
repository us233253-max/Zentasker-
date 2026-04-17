const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const gigController = require('../controllers/gigController');

// @route   GET /api/gigs/featured
// @desc    Get featured gigs
// @access  Public
router.get('/featured', gigController.getFeaturedGigs);

// @route   GET /api/gigs/my-gigs
// @desc    Get user's gigs
// @access  Private
router.get('/my-gigs', protect, gigController.getMyGigs);

// @route   GET /api/gigs
// @desc    Get all gigs
// @access  Public
router.get('/', gigController.getGigs);

// @route   POST /api/gigs
// @desc    Create gig
// @access  Private (freelancer)
router.post('/', protect, authorize('freelancer'), upload.array('images', 5), gigController.createGig);

// @route   GET /api/gigs/:id
// @desc    Get gig by ID
// @access  Public
router.get('/:id', gigController.getGigById);

// @route   PUT /api/gigs/:id
// @desc    Update gig
// @access  Private (gig owner)
router.put('/:id', protect, upload.array('images', 5), gigController.updateGig);

// @route   DELETE /api/gigs/:id
// @desc    Delete gig
// @access  Private (gig owner)
router.delete('/:id', protect, gigController.deleteGig);

// @route   POST /api/gigs/:id/order
// @desc    Create order from gig
// @access  Private
router.post('/:id/order', protect, gigController.createOrderFromGig);

module.exports = router;
