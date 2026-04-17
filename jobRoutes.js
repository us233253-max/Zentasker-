const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const jobController = require('../controllers/jobController');

// @route   GET /api/jobs/my-jobs
// @desc    Get user's posted jobs
// @access  Private
router.get('/my-jobs', protect, jobController.getMyJobs);

// @route   GET /api/jobs
// @desc    Get all jobs
// @access  Public
router.get('/', jobController.getJobs);

// @route   POST /api/jobs
// @desc    Create job
// @access  Private (client)
router.post('/', protect, authorize('client'), upload.array('attachments', 5), jobController.createJob);

// @route   GET /api/jobs/:id
// @desc    Get job by ID
// @access  Public
router.get('/:id', jobController.getJobById);

// @route   PUT /api/jobs/:id
// @desc    Update job
// @access  Private (job owner)
router.put('/:id', protect, jobController.updateJob);

// @route   DELETE /api/jobs/:id
// @desc    Delete job
// @access  Private (job owner)
router.delete('/:id', protect, jobController.deleteJob);

module.exports = router;
