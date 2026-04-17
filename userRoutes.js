const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const userController = require('../controllers/userController');

// @route   GET /api/users/search
// @desc    Search users
// @access  Public
router.get('/search', userController.searchUsers);

// @route   GET /api/users/me/full
// @desc    Get full profile
// @access  Private
router.get('/me/full', protect, userController.getFullProfile);

// @route   PUT /api/users/me
// @desc    Update profile
// @access  Private
router.put('/me', protect, userController.getUserProfile);

// @route   PUT /api/users/skills
// @desc    Update skills
// @access  Private
router.put('/skills', protect, userController.updateSkills);

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Public
router.get('/:id', userController.getUserProfile);

// @route   POST /api/users/portfolio
// @desc    Add portfolio item
// @access  Private (freelancer)
router.post('/portfolio', protect, authorize('freelancer'), upload.single('image'), userController.addPortfolioItem);

// @route   PUT /api/users/freelancer-profile
// @desc    Update freelancer profile
// @access  Private (freelancer)
router.put('/freelancer-profile', protect, authorize('freelancer'), userController.updateFreelancerProfile);

module.exports = router;
