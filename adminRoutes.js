const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter, aiLimiter } = require('../middleware/rateLimiter');

const adminController = require('../controllers/adminController');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));
router.use(apiLimiter);

// ==================== DASHBOARD & ANALYTICS ====================
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/freelancer-profile', adminController.updateFreelancerProfile);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/verify', adminController.verifyUser);
router.delete('/users/:id', adminController.deleteUser);

// ==================== GIG MANAGEMENT ====================
router.get('/gigs', adminController.getAllGigs);
router.get('/gigs/:id', adminController.getGigDetails);
router.put('/gigs/:id', adminController.updateGig);
router.post('/gigs/:id/feature', adminController.featureGig);
router.post('/gigs/:id/approve', adminController.approveGig);
router.delete('/gigs/:id', adminController.deleteGig);

// ==================== JOB MANAGEMENT ====================
router.get('/jobs', adminController.getAllJobs);
router.get('/jobs/:id', adminController.getJobDetails);
router.put('/jobs/:id', adminController.updateJob);
router.delete('/jobs/:id', adminController.deleteJob);

// ==================== ORDER MANAGEMENT ====================
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.post('/orders/:id/cancel', adminController.cancelOrder);

// ==================== DISPUTE MANAGEMENT ====================
router.get('/disputes', adminController.getAllDisputes);
router.get('/disputes/:id', adminController.getDisputeDetails);
router.post('/disputes/:id/assign', adminController.assignDispute);
router.post('/disputes/:id/note', adminController.addDisputeNote);
router.post('/disputes/:id/resolve', adminController.resolveDispute);

// ==================== FINANCIAL MANAGEMENT ====================
router.get('/transactions', adminController.getAllTransactions);
router.get('/financial/dashboard', adminController.getFinancialDashboard);
router.post('/transactions/:id/process-withdrawal', adminController.processWithdrawal);
router.get('/financial/export', adminController.exportFinancialReport);

// ==================== REVIEW MANAGEMENT ====================
router.get('/reviews', adminController.getAllReviews);
router.get('/reviews/flagged', adminController.getFlaggedReviews);
router.post('/reviews/:id/analyze', adminController.analyzeReview);
router.post('/reviews/batch-analyze', adminController.batchAnalyzeReviews);
router.post('/reviews/:id/flag', adminController.flagReview);
router.delete('/reviews/:id', adminController.deleteReview);

// ==================== AI ADMIN TOOLS ====================
router.post('/ai/detect-fraud', aiLimiter, adminController.detectFraud);
router.post('/ai/analyze-behavior', aiLimiter, adminController.analyzeBehavior);
router.get('/ai/insights', aiLimiter, adminController.getAIInsights);

// ==================== SYSTEM SETTINGS ====================
router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);
router.post('/settings/commission', adminController.updateCommission);
router.post('/notifications/broadcast', adminController.broadcastNotification);

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', adminController.getAuditLogs);

// ==================== CMS MANAGEMENT ====================
router.get('/cms/:page', adminController.getCMSContent);
router.put('/cms/:page', adminController.updateCMSContent);
router.get('/categories', adminController.getCategories);
router.put('/categories', adminController.updateCategories);

module.exports = router;
