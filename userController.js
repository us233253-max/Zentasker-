const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const Gig = require('../models/Gig');
const Job = require('../models/Job');
const Order = require('../models/Order');
const Review = require('../models/Review');

// @desc    Get user public profile
// @route   GET /api/users/:id
// @access  Public
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('skills', 'name level');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get freelancer profile if applicable
    let freelancerProfile = null;
    if (user.role === 'freelancer') {
      freelancerProfile = await FreelancerProfile.findOne({ userId: user._id })
        .populate('userId', 'name avatar rating reviewsCount');
    }

    // Get user's gigs (for freelancers)
    const gigs = user.role === 'freelancer'
      ? await Gig.find({ sellerId: user._id, isActive: true }).limit(6)
      : [];

    // Get recent reviews
    const reviews = await Review.find({ revieweeId: user._id, isPublic: true })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        user,
        freelancerProfile,
        gigs,
        reviews,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user's full profile
// @route   GET /api/users/me/full
// @access  Private
exports.getFullProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('+password')
      .populate('skills', 'name level');

    let freelancerProfile = null;
    if (user.role === 'freelancer') {
      freelancerProfile = await FreelancerProfile.findOne({ userId: user._id });
    }

    // Get stats
    const stats = {
      activeOrders: await Order.countDocuments({
        $or: [{ clientId: user._id }, { freelancerId: user._id }],
        status: { $in: ['active', 'in-review'] },
      }),
      completedOrders: await Order.countDocuments({
        $or: [{ clientId: user._id }, { freelancerId: user._id }],
        status: 'completed',
      }),
      activeProposals: user.role === 'freelancer'
        ? await require('../models/Proposal').countDocuments({
            freelancerId: user._id,
            status: 'pending',
          })
        : 0,
      activeJobs: user.role === 'client'
        ? await Job.countDocuments({ clientId: user._id, status: 'open' })
        : 0,
    };

    res.json({
      success: true,
      data: {
        user,
        freelancerProfile,
        stats,
      },
    });
  } catch (error) {
    console.error('Get full profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user skills
// @route   PUT /api/users/skills
// @access  Private
exports.updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { skills },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add portfolio item (freelancers only)
// @route   POST /api/users/portfolio
// @access  Private (freelancer)
exports.addPortfolioItem = async (req, res) => {
  try {
    const { title, description, image, url } = req.body;

    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can add portfolio items' });
    }

    let profile = await FreelancerProfile.findOne({ userId: req.user.id });

    if (!profile) {
      profile = await FreelancerProfile.create({ userId: req.user.id });
    }

    profile.portfolio.push({ title, description, image, url });
    await profile.save();

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Add portfolio item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update freelancer profile
// @route   PUT /api/users/freelancer-profile
// @access  Private (freelancer)
exports.updateFreelancerProfile = async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can update this profile' });
    }

    const {
      hourlyRate,
      availability,
      responseTime,
      overview,
      videoIntroduction,
      isVisible,
    } = req.body;

    let profile = await FreelancerProfile.findOne({ userId: req.user.id });

    if (!profile) {
      profile = await FreelancerProfile.create({
        userId: req.user.id,
        hourlyRate,
        availability,
        responseTime,
        overview,
        videoIntroduction,
        isVisible,
      });
    } else {
      profile.hourlyRate = hourlyRate ?? profile.hourlyRate;
      profile.availability = availability ?? profile.availability;
      profile.responseTime = responseTime ?? profile.responseTime;
      profile.overview = overview ?? profile.overview;
      profile.videoIntroduction = videoIntroduction ?? profile.videoIntroduction;
      profile.isVisible = isVisible ?? profile.isVisible;
      await profile.save();
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Update freelancer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Public
exports.searchUsers = async (req, res) => {
  try {
    const { q, role, skill, page = 1, limit = 20 } = req.query;

    const query = {
      isActive: true,
      isBanned: false,
    };

    if (role) {
      query.role = role;
    }

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { 'profile.title': { $regex: q, $options: 'i' } },
        { 'profile.bio': { $regex: q, $options: 'i' } },
      ];
    }

    if (skill) {
      query['skills.name'] = { $regex: skill, $options: 'i' };
    }

    const users = await User.find(query)
      .select('name avatar role rating reviewsCount completedJobs profile skills')
      .sort({ rating: -1, completedJobs: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
