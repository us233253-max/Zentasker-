const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const proposalController = require('../controllers/proposalController');

// @route   GET /api/proposals/my-proposals
// @desc    Get user's proposals
// @access  Private (freelancer)
router.get('/my-proposals', protect, authorize('freelancer'), proposalController.getMyProposals);

// @route   POST /api/proposals
// @desc    Submit proposal
// @access  Private (freelancer)
router.post('/', protect, authorize('freelancer'), proposalController.submitProposal);

// @route   GET /api/proposals/job/:jobId
// @desc    Get proposals for a job
// @access  Private (client)
router.get('/job/:jobId', protect, authorize('client'), proposalController.getJobProposals);

// @route   PUT /api/proposals/:id/status
// @desc    Update proposal status
// @access  Private (client)
router.put('/:id/status', protect, authorize('client'), proposalController.updateProposalStatus);

// @route   GET /api/proposals/:id
// @desc    Get proposal by ID
// @access  Private
router.get('/:id', protect, proposalController.getProposal);

module.exports = router;
