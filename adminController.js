const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const Gig = require('../models/Gig');
const Job = require('../models/Job');
const Order = require('../models/Order');
const Proposal = require('../models/Proposal');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');
const PlatformSettings = require('../models/PlatformSettings');
const AdminAuditLog = require('../models/AdminAuditLog');
const { analyzeReview, batchAnalyzeReviews } = require('./ai/reviewAnalyzer');
const { getGeminiModel } = require('../config/gemini');

// Audit logging helper
const logAdminAction = async (adminId, action, target, details) => {
  try {
    await AdminAuditLog.create({
      adminId,
      action,
      target,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// ==================== DASHBOARD & ANALYTICS ====================

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // User stats
    const totalUsers = await User.countDocuments();
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: lastMonth } });
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: lastMonth } });

    // Gig stats
    const totalGigs = await Gig.countDocuments();
    const activeGigs = await Gig.countDocuments({ isActive: true });

    // Job stats
    const totalJobs = await Job.countDocuments();
    const openJobs = await Job.countDocuments({ status: 'open' });

    // Order stats
    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({ status: { $in: ['active', 'in-review'] } });
    const completedOrders = await Order.countDocuments({ status: 'completed' });

    // Financial stats
    const totalRevenue = await Transaction.aggregate([
      { $match: { type: 'commission', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const monthlyRevenue = await Transaction.aggregate([
      { $match: { type: 'commission', status: 'completed', createdAt: { $gte: lastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const pendingPayouts = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Dispute stats
    const openDisputes = await Dispute.countDocuments({ status: { $in: ['open', 'under-review'] } });

    // Review stats
    const flaggedReviews = await Review.countDocuments({ isFlagged: true });

    // Revenue trend (last 12 months)
    const revenueTrend = await Transaction.aggregate([
      {
        $match: {
          type: 'commission',
          status: 'completed',
          createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
          active: activeUsers,
          growthRate: totalUsers > newUsersThisMonth
            ? ((newUsersThisMonth / (totalUsers - newUsersThisMonth)) * 100).toFixed(2)
            : 0,
        },
        gigs: { total: totalGigs, active: activeGigs },
        jobs: { total: totalJobs, open: openJobs },
        orders: { total: totalOrders, active: activeOrders, completed: completedOrders },
        financial: {
          totalRevenue: totalRevenue[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          pendingPayouts: pendingPayouts[0]?.total || 0,
          revenueTrend,
        },
        disputes: { open: openDisputes },
        reviews: { flagged: flaggedReviews },
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get detailed analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    const { type = 'overview', period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let analytics = {};

    if (type === 'overview' || type === 'users') {
      analytics.userRegistrations = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      analytics.userRoles = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]);
    }

    if (type === 'overview' || type === 'revenue') {
      analytics.dailyRevenue = await Transaction.aggregate([
        {
          $match: {
            type: { $in: ['commission', 'payment'] },
            status: 'completed',
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      analytics.revenueByType = await Transaction.aggregate([
        {
          $match: {
            type: { $in: ['commission', 'payment', 'withdrawal'] },
            status: 'completed',
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);
    }

    if (type === 'overview' || type === 'orders') {
      analytics.orderStatus = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      analytics.topCategories = await Gig.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'gigId', as: 'orders' } },
        { $unwind: '$orders' },
        { $match: { 'orders.createdAt': { $gte: startDate } } },
        { $group: { _id: '$category', orders: { $sum: 1 }, revenue: { $sum: '$orders.amount' } } },
        { $sort: { orders: -1 } },
        { $limit: 10 },
      ]);
    }

    if (type === 'overview' || type === 'performance') {
      analytics.topFreelancers = await User.aggregate([
        { $match: { role: 'freelancer' } },
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'freelancerId', as: 'orders' } },
        {
          $project: {
            name: 1,
            avatar: 1,
            rating: 1,
            totalEarnings: 1,
            orderCount: { $size: '$orders' },
          },
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: 10 },
      ]);

      analytics.topClients = await User.aggregate([
        { $match: { role: 'client' } },
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'clientId', as: 'orders' } },
        {
          $project: {
            name: 1,
            avatar: 1,
            totalSpent: 1,
            orderCount: { $size: '$orders' },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
      ]);
    }

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== USER MANAGEMENT ====================

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const {
      role, status, search, minRating, minEarnings,
      sortBy = 'createdAt', order = 'desc', page = 1, limit = 20,
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status === 'banned') query.isBanned = true;
    if (status === 'verified') query.isVerified = true;
    if (status === 'active') { query.isActive = true; query.isBanned = false; }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (minRating) query.rating = { $gte: parseFloat(minRating) };
    if (minEarnings && role === 'freelancer') query.totalEarnings = { $gte: parseFloat(minEarnings) };

    const sortOption = { [sortBy]: order === 'asc' ? 1 : -1 };

    const users = await User.find(query)
      .select('-password')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user details for admin
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const freelancerProfile = user.role === 'freelancer'
      ? await FreelancerProfile.findOne({ userId: user._id })
      : null;

    const stats = {
      gigs: await Gig.countDocuments({ sellerId: user._id }),
      activeGigs: await Gig.countDocuments({ sellerId: user._id, isActive: true }),
      jobsPosted: await Job.countDocuments({ clientId: user._id }),
      ordersAsBuyer: await Order.countDocuments({ clientId: user._id }),
      ordersAsSeller: await Order.countDocuments({ freelancerId: user._id }),
      reviews: await Review.countDocuments({ revieweeId: user._id }),
    };

    const recentOrders = await Order.find({
      $or: [{ clientId: user._id }, { freelancerId: user._id }],
    })
    .populate('gigId', 'title')
    .populate('clientId', 'name')
    .populate('freelancerId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: { user, freelancerProfile, stats, recentOrders },
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user (admin full control)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isVerified, isActive, isBanned, profile, skills, rating, totalEarnings, totalSpent, completedJobs } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (isActive !== undefined) user.isActive = isActive;
    if (isBanned !== undefined) user.isBanned = isBanned;
    if (profile !== undefined) user.profile = { ...user.profile, ...profile };
    if (skills !== undefined) user.skills = skills;
    if (rating !== undefined) user.rating = rating;
    if (totalEarnings !== undefined) user.totalEarnings = totalEarnings;
    if (totalSpent !== undefined) user.totalSpent = totalSpent;
    if (completedJobs !== undefined) user.completedJobs = completedJobs;

    await user.save();
    await logAdminAction(req.user.id, 'update_user', `User:${user._id}`, { changes: { name, email, role, isVerified, isActive, isBanned } });

    res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update freelancer profile (admin)
// @route   PUT /api/admin/users/:id/freelancer-profile
// @access  Private/Admin
exports.updateFreelancerProfile = async (req, res) => {
  try {
    const { hourlyRate, availability, portfolio, certifications, experience, education, languages, overview, isVisible } = req.body;

    let profile = await FreelancerProfile.findOne({ userId: req.params.id });

    if (!profile) {
      profile = await FreelancerProfile.create({ userId: req.params.id, ...req.body });
    } else {
      Object.assign(profile, req.body);
      await profile.save();
    }

    await logAdminAction(req.user.id, 'update_freelancer_profile', `FreelancerProfile:${req.params.id}`, { changes: req.body });

    res.json({ success: true, data: profile, message: 'Freelancer profile updated successfully' });
  } catch (error) {
    console.error('Update freelancer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Ban/unban user
// @route   POST /api/admin/users/:id/ban
// @access  Private/Admin
exports.banUser = async (req, res) => {
  try {
    const { isBanned, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = isBanned !== false;
    await user.save();

    await Notification.create({
      userId: user._id,
      type: 'system',
      title: isBanned ? 'Account Suspended' : 'Account Reinstated',
      message: isBanned ? `Your account has been suspended. Reason: ${reason || 'Violation of platform policies'}` : 'Your account has been reinstated.',
      priority: 'high',
    });

    await logAdminAction(req.user.id, isBanned ? 'ban_user' : 'unban_user', `User:${user._id}`, { reason });

    res.json({ success: true, message: isBanned ? 'User banned successfully' : 'User unbanned successfully' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify user
// @route   POST /api/admin/users/:id/verify
// @access  Private/Admin
exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVerified = true;
    await user.save();
    await logAdminAction(req.user.id, 'verify_user', `User:${user._id}`, {});

    res.json({ success: true, message: 'User verified successfully' });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const { hardDelete } = req.query;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin users' });

    if (hardDelete === 'true') {
      await User.findByIdAndDelete(req.params.id);
      await FreelancerProfile.deleteOne({ userId: req.params.id });
      await logAdminAction(req.user.id, 'hard_delete_user', `User:${req.params.id}`, {});
    } else {
      user.isActive = false;
      user.isBanned = true;
      user.email = `deleted_${user._id}@deleted.com`;
      user.name = 'Deleted User';
      await user.save();
      await logAdminAction(req.user.id, 'soft_delete_user', `User:${req.params.id}`, {});
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== GIG MANAGEMENT ====================

// @desc    Get all gigs with filters
// @route   GET /api/admin/gigs
// @access  Private/Admin
exports.getAllGigs = async (req, res) => {
  try {
    const { status, category, search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'featured') query.isFeatured = true;
    if (category) query.category = category;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const gigs = await Gig.find(query)
      .populate('sellerId', 'name email avatar rating')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Gig.countDocuments(query);

    res.json({
      success: true,
      data: { gigs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get all gigs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get gig details for admin
// @route   GET /api/admin/gigs/:id
// @access  Private/Admin
exports.getGigDetails = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('sellerId', 'name email avatar rating totalEarnings');

    if (!gig) return res.status(404).json({ message: 'Gig not found' });

    const stats = {
      totalOrders: await Order.countDocuments({ gigId: gig._id }),
      activeOrders: await Order.countDocuments({ gigId: gig._id, status: { $in: ['active', 'in-review'] } }),
      reviews: await Review.countDocuments({ gigId: gig._id }),
    };

    const recentOrders = await Order.find({ gigId: gig._id })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, data: { gig, stats, recentOrders } });
  } catch (error) {
    console.error('Get gig details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update gig (admin)
// @route   PUT /api/admin/gigs/:id
// @access  Private/Admin
exports.updateGig = async (req, res) => {
  try {
    const gig = await Gig.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!gig) return res.status(404).json({ message: 'Gig not found' });

    await logAdminAction(req.user.id, 'update_gig', `Gig:${gig._id}`, { changes: req.body });

    res.json({ success: true, data: gig, message: 'Gig updated successfully' });
  } catch (error) {
    console.error('Update gig error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Feature/unfeature gig
// @route   POST /api/admin/gigs/:id/feature
// @access  Private/Admin
exports.featureGig = async (req, res) => {
  try {
    const { isFeatured } = req.body;
    const gig = await Gig.findById(req.params.id);

    if (!gig) return res.status(404).json({ message: 'Gig not found' });

    gig.isFeatured = isFeatured !== false;
    await gig.save();

    await logAdminAction(req.user.id, isFeatured ? 'feature_gig' : 'unfeature_gig', `Gig:${gig._id}`, {});

    res.json({ success: true, message: isFeatured ? 'Gig featured successfully' : 'Gig unfeatured successfully' });
  } catch (error) {
    console.error('Feature gig error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve/reject gig
// @route   POST /api/admin/gigs/:id/approve
// @access  Private/Admin
exports.approveGig = async (req, res) => {
  try {
    const { isApproved, rejectionReason } = req.body;
    const gig = await Gig.findById(req.params.id);

    if (!gig) return res.status(404).json({ message: 'Gig not found' });

    if (isApproved === false) {
      gig.isActive = false;
      await gig.save();

      await Notification.create({
        userId: gig.sellerId,
        type: 'gig',
        title: 'Gig Rejected',
        message: `Your gig "${gig.title}" was rejected. Reason: ${rejectionReason || 'Does not meet platform guidelines'}`,
        priority: 'high',
      });
    }

    await logAdminAction(req.user.id, isApproved === false ? 'reject_gig' : 'approve_gig', `Gig:${gig._id}`, { rejectionReason });

    res.json({ success: true, message: isApproved === false ? 'Gig rejected' : 'Gig approved' });
  } catch (error) {
    console.error('Approve gig error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete gig
// @route   DELETE /api/admin/gigs/:id
// @access  Private/Admin
exports.deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ message: 'Gig not found' });

    await Gig.findByIdAndDelete(req.params.id);

    await logAdminAction(req.user.id, 'delete_gig', `Gig:${gig._id}`, { title: gig.title });

    res.json({ success: true, message: 'Gig deleted successfully' });
  } catch (error) {
    console.error('Delete gig error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== JOB MANAGEMENT ====================

// @desc    Get all jobs with filters
// @route   GET /api/admin/jobs
// @access  Private/Admin
exports.getAllJobs = async (req, res) => {
  try {
    const { status, category, search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const jobs = await Job.find(query)
      .populate('clientId', 'name email avatar')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      data: { jobs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get job details for admin
// @route   GET /api/admin/jobs/:id
// @access  Private/Admin
exports.getJobDetails = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('clientId', 'name email avatar totalSpent');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const proposals = await Proposal.find({ jobId: job._id })
      .populate('freelancerId', 'name avatar rating skills');

    const stats = {
      proposalsCount: proposals.length,
      hiredCount: await Proposal.countDocuments({ jobId: job._id, status: 'hired' }),
    };

    res.json({ success: true, data: { job, proposals, stats } });
  } catch (error) {
    console.error('Get job details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update job (admin)
// @route   PUT /api/admin/jobs/:id
// @access  Private/Admin
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!job) return res.status(404).json({ message: 'Job not found' });

    await logAdminAction(req.user.id, 'update_job', `Job:${job._id}`, { changes: req.body });

    res.json({ success: true, data: job, message: 'Job updated successfully' });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete job
// @route   DELETE /api/admin/jobs/:id
// @access  Private/Admin
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await Job.findByIdAndDelete(req.params.id);

    await logAdminAction(req.user.id, 'delete_job', `Job:${job._id}`, { title: job.title });

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== ORDER MANAGEMENT ====================

// @desc    Get all orders with filters
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    if (search) {
      const orderIds = await Order.find({
        $or: [
          { _id: { $regex: search, $options: 'i' } },
        ],
      }).distinct('_id');
      if (orderIds.length) query._id = { $in: orderIds };
    }

    const orders = await Order.find(query)
      .populate('clientId', 'name email')
      .populate('freelancerId', 'name email')
      .populate('gigId', 'title')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get order details for admin
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('clientId', 'name email avatar')
      .populate('freelancerId', 'name email avatar')
      .populate('gigId');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const dispute = await Dispute.findOne({ orderId: order._id });
    const transactions = await Transaction.find({ orderId: order._id });

    res.json({ success: true, data: { order, dispute, transactions } });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update order status (admin)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, message } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['pending', 'active', 'in-review', 'completed', 'cancelled', 'disputed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    order.status = status;
    if (message) order.message = message;
    await order.save();

    // Notify both parties
    await Notification.create({
      userId: order.clientId,
      type: 'order',
      title: 'Order Status Updated',
      message: `Order #${order._id.slice(-6)} status changed to ${status}. ${message || ''}`,
      data: { orderId: order._id },
      priority: 'high',
    });

    await Notification.create({
      userId: order.freelancerId,
      type: 'order',
      title: 'Order Status Updated',
      message: `Order #${order._id.slice(-6)} status changed to ${status}. ${message || ''}`,
      data: { orderId: order._id },
      priority: 'high',
    });

    await logAdminAction(req.user.id, 'update_order_status', `Order:${order._id}`, { status, message });

    res.json({ success: true, data: order, message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel order with refund (admin)
// @route   POST /api/admin/orders/:id/cancel
// @access  Private/Admin
exports.cancelOrder = async (req, res) => {
  try {
    const { reason, refundAmount } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledBy = req.user.id;
    order.cancelledAt = new Date();
    await order.save();

    // Process refund if specified
    if (refundAmount && refundAmount > 0) {
      await Transaction.create({
        userId: order.clientId,
        orderId: order._id,
        type: 'refund',
        amount: refundAmount,
        status: 'completed',
        description: `Refund for cancelled order #${order._id.slice(-6)}`,
      });
    }

    await logAdminAction(req.user.id, 'cancel_order', `Order:${order._id}`, { reason, refundAmount });

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== DISPUTE MANAGEMENT ====================

// @desc    Get all disputes
// @route   GET /api/admin/disputes
// @access  Private/Admin
exports.getAllDisputes = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const disputes = await Dispute.find(query)
      .populate('orderId', 'title amount status')
      .populate('raisedBy', 'name email')
      .populate('assignedAdmin', 'name')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Dispute.countDocuments(query);

    res.json({
      success: true,
      data: { disputes, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get all disputes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dispute details
// @route   GET /api/admin/disputes/:id
// @access  Private/Admin
exports.getDisputeDetails = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('orderId')
      .populate('raisedBy', 'name email avatar')
      .populate('assignedAdmin', 'name');

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    // Get order details with both parties
    const order = await Order.findById(dispute.orderId)
      .populate('clientId', 'name email avatar')
      .populate('freelancerId', 'name email avatar');

    // Get conversation related to order
    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findOne({ orderId: dispute.orderId })
      .populate('participants', 'name avatar');

    res.json({ success: true, data: { dispute, order, conversation } });
  } catch (error) {
    console.error('Get dispute details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Assign dispute to admin
// @route   POST /api/admin/disputes/:id/assign
// @access  Private/Admin
exports.assignDispute = async (req, res) => {
  try {
    const { adminId } = req.body;
    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    dispute.assignedAdmin = adminId || req.user.id;
    dispute.status = 'under-review';
    await dispute.save();

    await logAdminAction(req.user.id, 'assign_dispute', `Dispute:${dispute._id}`, { adminId: dispute.assignedAdmin });

    res.json({ success: true, message: 'Dispute assigned successfully' });
  } catch (error) {
    console.error('Assign dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add admin note to dispute
// @route   POST /api/admin/disputes/:id/note
// @access  Private/Admin
exports.addDisputeNote = async (req, res) => {
  try {
    const { note } = req.body;
    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    dispute.adminNotes.push({
      note,
      addedBy: req.user.id,
      addedAt: new Date(),
    });
    await dispute.save();

    await logAdminAction(req.user.id, 'add_dispute_note', `Dispute:${dispute._id}`, {});

    res.json({ success: true, data: dispute, message: 'Note added successfully' });
  } catch (error) {
    console.error('Add dispute note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Resolve dispute
// @route   POST /api/admin/disputes/:id/resolve
// @access  Private/Admin
exports.resolveDispute = async (req, res) => {
  try {
    const { resolution, resolutionDetails, refundAmount, payoutAmount } = req.body;
    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const order = await Order.findById(dispute.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolutionDetails = resolutionDetails;
    dispute.refundAmount = refundAmount;
    dispute.payoutAmount = payoutAmount;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = req.user.id;
    await dispute.save();

    // Process financial resolution
    if (resolution === 'refund-client' && refundAmount > 0) {
      await Transaction.create({
        userId: order.clientId,
        orderId: order._id,
        type: 'refund',
        amount: refundAmount,
        status: 'completed',
        description: `Dispute resolution refund for order #${order._id.slice(-6)}`,
      });
    }

    if (resolution === 'pay-freelancer' && payoutAmount > 0) {
      await Transaction.create({
        userId: order.freelancerId,
        orderId: order._id,
        type: 'payment',
        amount: payoutAmount,
        status: 'completed',
        description: `Dispute resolution payout for order #${order._id.slice(-6)}`,
      });
      order.status = 'completed';
      await order.save();
    }

    if (resolution === 'partial-refund') {
      if (refundAmount > 0) {
        await Transaction.create({
          userId: order.clientId,
          orderId: order._id,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          description: `Partial refund from dispute resolution`,
        });
      }
      if (payoutAmount > 0) {
        await Transaction.create({
          userId: order.freelancerId,
          orderId: order._id,
          type: 'payment',
          amount: payoutAmount,
          status: 'completed',
          description: `Partial payout from dispute resolution`,
        });
      }
    }

    await logAdminAction(req.user.id, 'resolve_dispute', `Dispute:${dispute._id}`, { resolution });

    res.json({ success: true, message: 'Dispute resolved successfully' });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== FINANCIAL MANAGEMENT ====================

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
exports.getAllTransactions = async (req, res) => {
  try {
    const { type, status, userId, startDate, endDate, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .populate('orderId')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Transaction.countDocuments(query);

    // Calculate totals
    const totals = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        totals,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get financial dashboard
// @route   GET /api/admin/financial/dashboard
// @access  Private/Admin
exports.getFinancialDashboard = async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Total revenue (commission)
    const totalRevenue = await Transaction.aggregate([
      { $match: { type: 'commission', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Monthly revenue
    const monthlyRevenue = await Transaction.aggregate([
      { $match: { type: 'commission', status: 'completed', createdAt: { $gte: lastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Pending payouts
    const pendingPayouts = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Completed payouts this month
    const completedPayouts = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed', createdAt: { $gte: lastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Revenue trend (last 12 months)
    const revenueTrend = await Transaction.aggregate([
      {
        $match: {
          type: 'commission',
          status: 'completed',
          createdAt: { $gte: lastYear },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Transaction breakdown by type
    const breakdownByType = await Transaction.aggregate([
      { $match: { createdAt: { $gte: lastMonth } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: totalRevenue[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          pendingPayouts: pendingPayouts[0]?.total || 0,
          completedPayouts: completedPayouts[0]?.total || 0,
        },
        revenueTrend,
        breakdownByType,
      },
    });
  } catch (error) {
    console.error('Get financial dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Process withdrawal request
// @route   POST /api/admin/transactions/:id/process-withdrawal
// @access  Private/Admin
exports.processWithdrawal = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.type !== 'withdrawal') return res.status(400).json({ message: 'Not a withdrawal transaction' });

    transaction.status = status;
    if (notes) transaction.metadata = { ...transaction.metadata, adminNotes: notes };
    if (status === 'completed') transaction.processedAt = new Date();
    if (status === 'failed') transaction.failedReason = notes;
    await transaction.save();

    // Notify user
    await Notification.create({
      userId: transaction.userId,
      type: 'payment',
      title: status === 'completed' ? 'Withdrawal Processed' : 'Withdrawal Update',
      message: status === 'completed'
        ? `Your withdrawal of $${transaction.amount} has been processed.`
        : `Your withdrawal request has been ${status}. ${notes || ''}`,
      priority: 'high',
    });

    await logAdminAction(req.user.id, 'process_withdrawal', `Transaction:${transaction._id}`, { status, notes });

    res.json({ success: true, message: 'Withdrawal processed successfully' });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Export financial report
// @route   GET /api/admin/financial/export
// @access  Private/Admin
exports.exportFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const query = {};
    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .lean();

    const csvRows = transactions.map(t => [
      t._id, t.userId?.name || 'N/A', t.userId?.email || 'N/A',
      t.type, t.amount, t.currency, t.status, t.createdAt, t.description || '',
    ]);

    const csvHeader = ['ID', 'User', 'Email', 'Type', 'Amount', 'Currency', 'Status', 'Date', 'Description'];
    const csvContent = [csvHeader.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=financial-report-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export financial report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== REVIEW MANAGEMENT ====================

// @desc    Get all reviews with filters
// @route   GET /api/admin/reviews
// @access  Private/Admin
exports.getAllReviews = async (req, res) => {
  try {
    const { status, flagged, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (flagged === 'true') query.isFlagged = true;
    if (status === 'public') query.isPublic = true;
    if (status === 'hidden') query.isPublic = false;

    const reviews = await Review.find(query)
      .populate('reviewerId', 'name avatar')
      .populate('revieweeId', 'name avatar')
      .populate('orderId')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: { reviews, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get flagged reviews
// @route   GET /api/admin/reviews/flagged
// @access  Private/Admin
exports.getFlaggedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isFlagged: true })
      .populate('reviewerId', 'name avatar')
      .populate('revieweeId', 'name avatar')
      .populate('orderId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Get flagged reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Analyze review with AI
// @route   POST /api/admin/reviews/:id/analyze
// @access  Private/Admin
exports.analyzeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const analysis = await analyzeReview(review);
    review.aiAnalysis = analysis;
    await review.save();

    await logAdminAction(req.user.id, 'analyze_review', `Review:${review._id}`, { analysis });

    res.json({ success: true, data: { review, analysis } });
  } catch (error) {
    console.error('Analyze review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Batch analyze reviews with AI
// @route   POST /api/admin/reviews/batch-analyze
// @access  Private/Admin
exports.batchAnalyzeReviews = async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    const reviews = await Review.find({ 'aiAnalysis.analyzedAt': { $exists: false } }).limit(limit);

    const results = await batchAnalyzeReviews(reviews);

    await logAdminAction(req.user.id, 'batch_analyze_reviews', 'Reviews', { count: reviews.length });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Batch analyze reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Flag/unflag review
// @route   POST /api/admin/reviews/:id/flag
// @access  Private/Admin
exports.flagReview = async (req, res) => {
  try {
    const { isFlagged, reason } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.isFlagged = isFlagged !== false;
    review.flagReason = reason || '';
    review.flaggedBy = req.user.id;
    review.flaggedAt = new Date();
    await review.save();

    await logAdminAction(req.user.id, isFlagged ? 'flag_review' : 'unflag_review', `Review:${review._id}`, { reason });

    res.json({ success: true, message: isFlagged ? 'Review flagged' : 'Review unflagged' });
  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete review
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    await Review.findByIdAndDelete(req.params.id);

    await logAdminAction(req.user.id, 'delete_review', `Review:${review._id}`, { comment: review.comment });

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== AI ADMIN TOOLS ====================

// @desc    AI-powered fraud detection analysis
// @route   POST /api/admin/ai/detect-fraud
// @access  Private/Admin
exports.detectFraud = async (req, res) => {
  try {
    const { userId, orderId } = req.body;
    const model = getGeminiModel();

    let dataToAnalyze = '';

    if (userId) {
      const user = await User.findById(userId)
        .populate('skills', 'name');
      const userOrders = await Order.find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
      }).limit(20);
      const userTransactions = await Transaction.find({ userId }).limit(20);

      dataToAnalyze = `
        User: ${user.name} (${user.email}), Role: ${user.role}
        Account Age: ${user.createdAt}, Last Login: ${user.lastLogin}
        Completed Jobs: ${user.completedJobs}, Rating: ${user.rating}
        Total Earnings: $${user.totalEarnings}, Total Spent: $${user.totalSpent}
        Recent Orders: ${userOrders.length}
        Recent Transactions: ${userTransactions.length}
        Suspicious patterns to check:
        - Multiple accounts from same IP
        - Unusual transaction patterns
        - Fake review exchanges
        - Account sharing indicators
      `;
    }

    if (orderId) {
      const order = await Order.findById(orderId)
        .populate('clientId', 'name email')
        .populate('freelancerId', 'name email');
      const transactions = await Transaction.find({ orderId });

      dataToAnalyze = `
        Order #${order._id.slice(-6)}
        Client: ${order.clientId.name} (${order.clientId.email})
        Freelancer: ${order.freelancerId.name} (${order.freelancerId.email})
        Amount: $${order.amount}, Status: ${order.status}
        Created: ${order.createdAt}, Delivered: ${order.deliveredAt}
        Transactions: ${transactions.length}
        Suspicious patterns to check:
        - Circular payments
        - Unusual pricing
        - Quick completion for high value
        - Chargeback risk indicators
      `;
    }

    const prompt = `Analyze the following platform data for potential fraud or suspicious activity.

${dataToAnalyze}

Return JSON:
{
  "riskLevel": "low" | "medium" | "high",
  "riskScore": 0-100,
  "flags": ["flag 1", "flag 2"] or [],
  "recommendation": "string"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    await logAdminAction(req.user.id, 'ai_fraud_detection', `User:${userId || 'N/A'} Order:${orderId || 'N/A'}`, analysis);

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Fraud detection error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    AI-powered user behavior analysis
// @route   POST /api/admin/ai/analyze-behavior
// @access  Private/Admin
exports.analyzeBehavior = async (req, res) => {
  try {
    const { userId } = req.body;
    const model = getGeminiModel();

    const user = await User.findById(userId);
    const orders = await Order.find({
      $or: [{ clientId: userId }, { freelancerId: userId }],
    }).limit(50);
    const messages = await require('../models/Message').find({ senderId: userId }).limit(30);
    const reviews = await Review.find({ reviewerId: userId }).limit(20);

    const prompt = `Analyze this user's behavior patterns on the freelancing platform.

User: ${user.name}, Role: ${user.role}
Account Created: ${user.createdAt}
Total Orders: ${orders.length}
Total Messages: ${messages.length}
Reviews Given: ${reviews.length}

Order statuses: ${orders.map(o => o.status).join(', ')}
Average order value: $${orders.reduce((sum, o) => sum + o.amount, 0) / (orders.length || 1)}

Analyze for:
- Engagement patterns
- Communication style
- Transaction behavior
- Potential policy violations
- Growth trajectory

Return JSON:
{
  "engagementLevel": "low" | "medium" | "high",
  "behaviorType": "string",
  "strengths": ["strength 1"],
  "concerns": ["concern 1"] or [],
  "recommendations": ["recommendation 1"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Behavior analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get AI insights and recommendations
// @route   GET /api/admin/ai/insights
// @access  Private/Admin
exports.getAIInsights = async (req, res) => {
  try {
    const model = getGeminiModel();

    // Get platform stats
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Transaction.aggregate([
      { $match: { type: 'commission' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const openDisputes = await Dispute.countDocuments({ status: { $in: ['open', 'under-review'] } });
    const flaggedReviews = await Review.countDocuments({ isFlagged: true });

    const prompt = `Based on these platform statistics, provide actionable insights and recommendations for the admin.

Platform Stats:
- Total Users: ${totalUsers}
- Total Orders: ${totalOrders}
- Total Commission Revenue: $${totalRevenue[0]?.total || 0}
- Open Disputes: ${openDisputes}
- Flagged Reviews: ${flaggedReviews}

Provide insights on:
1. Growth opportunities
2. Risk areas to address
3. Feature recommendations
4. Policy suggestions

Return JSON:
{
  "summary": "brief overview",
  "opportunities": ["opportunity 1"],
  "risks": ["risk 1"],
  "recommendations": ["recommendation 1"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const insights = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Get AI insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== SYSTEM SETTINGS ====================

// @desc    Get all platform settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.find().sort({ category: 1, key: 1 });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update platform setting
// @route   PUT /api/admin/settings/:key
// @access  Private/Admin
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await PlatformSettings.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );

    await logAdminAction(req.user.id, 'update_setting', `Setting:${key}`, { value });

    res.json({ success: true, data: setting, message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update commission rate
// @route   POST /api/admin/settings/commission
// @access  Private/Admin
exports.updateCommission = async (req, res) => {
  try {
    const { rate } = req.body;

    if (rate < 0 || rate > 50) {
      return res.status(400).json({ message: 'Commission rate must be between 0 and 50' });
    }

    await PlatformSettings.findOneAndUpdate(
      { key: 'commissionRate' },
      { key: 'commissionRate', value: rate },
      { upsert: true }
    );

    await logAdminAction(req.user.id, 'update_commission', 'Commission', { rate });

    res.json({ success: true, message: `Commission rate updated to ${rate}%` });
  } catch (error) {
    console.error('Update commission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send global notification
// @route   POST /api/admin/notifications/broadcast
// @access  Private/Admin
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, type = 'system', priority = 'medium', targetRole } = req.body;

    const query = { isActive: true };
    if (targetRole) query.role = targetRole;

    const users = await User.find(query).distinct('_id');

    const notifications = users.map(userId => ({
      userId,
      type,
      title,
      message,
      priority,
    }));

    await Notification.insertMany(notifications);

    await logAdminAction(req.user.id, 'broadcast_notification', 'Users', { title, targetRole, count: users.length });

    res.json({ success: true, message: `Notification sent to ${users.length} users` });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    const { adminId, action, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (adminId) query.adminId = adminId;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AdminAuditLog.find(query)
      .populate('adminId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await AdminAuditLog.countDocuments(query);

    res.json({
      success: true,
      data: { logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== CMS & CONTENT MANAGEMENT ====================

// @desc    Get CMS content
// @route   GET /api/admin/cms/:page
// @access  Private/Admin
exports.getCMSContent = async (req, res) => {
  try {
    const { page } = req.params;
    const content = await PlatformSettings.findOne({ key: `cms_${page}` });

    res.json({ success: true, data: content?.value || {} });
  } catch (error) {
    console.error('Get CMS content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update CMS content
// @route   PUT /api/admin/cms/:page
// @access  Private/Admin
exports.updateCMSContent = async (req, res) => {
  try {
    const { page } = req.params;
    const { content } = req.body;

    const setting = await PlatformSettings.findOneAndUpdate(
      { key: `cms_${page}` },
      { key: `cms_${page}`, value: content },
      { upsert: true, new: true }
    );

    await logAdminAction(req.user.id, 'update_cms', `CMS:${page}`, {});

    res.json({ success: true, data: setting, message: 'CMS content updated' });
  } catch (error) {
    console.error('Update CMS content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Manage categories
// @route   GET /api/admin/categories
// @access  Private/Admin
exports.getCategories = async (req, res) => {
  try {
    const categories = await PlatformSettings.findOne({ key: 'categories' });
    res.json({ success: true, data: categories?.value || [] });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update categories
// @route   PUT /api/admin/categories
// @access  Private/Admin
exports.updateCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    const setting = await PlatformSettings.findOneAndUpdate(
      { key: 'categories' },
      { key: 'categories', value: categories },
      { upsert: true, new: true }
    );

    await logAdminAction(req.user.id, 'update_categories', 'Categories', {});

    res.json({ success: true, data: setting, message: 'Categories updated' });
  } catch (error) {
    console.error('Update categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
