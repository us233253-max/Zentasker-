const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');

const proposalGenerator = require('../controllers/ai/proposalGenerator');
const gigGenerator = require('../controllers/ai/gigGenerator');
const chatbotService = require('../controllers/ai/chatbotService');
const matchingService = require('../controllers/ai/matchingService');
const reviewAnalyzer = require('../controllers/ai/reviewAnalyzer');

// All routes require authentication
router.use(protect);
router.use(aiLimiter);

// ==================== PROPOSAL GENERATION ====================
/**
 * @route   POST /api/ai/proposals/generate
 * @desc    Generate a proposal for a job
 * @access  Private (freelancer)
 */
router.post('/proposals/generate', authorize('freelancer'), async (req, res) => {
  try {
    const { job, customNotes } = req.body;

    if (!job) {
      return res.status(400).json({ message: 'Job details are required' });
    }

    // Get freelancer profile
    const User = require('../models/User');
    const FreelancerProfile = require('../models/FreelancerProfile');

    const user = await User.findById(req.user.id);
    const freelancerProfile = await FreelancerProfile.findOne({ userId: req.user.id });

    const proposal = await proposalGenerator.generateProposal(
      job,
      {
        name: user.name,
        title: user.profile?.title,
        skills: user.skills,
        rating: user.rating,
        reviewsCount: user.reviewsCount,
        completedJobs: user.completedJobs,
        profile: user.profile,
        experience: freelancerProfile?.experience,
      },
      customNotes
    );

    res.json({ success: true, data: { proposal } });
  } catch (error) {
    console.error('Generate proposal error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate proposal' });
  }
});

/**
 * @route   POST /api/ai/proposals/improve
 * @desc    Improve an existing proposal
 * @access  Private (freelancer)
 */
router.post('/proposals/improve', authorize('freelancer'), async (req, res) => {
  try {
    const { existingProposal } = req.body;

    if (!existingProposal) {
      return res.status(400).json({ message: 'Existing proposal is required' });
    }

    const improved = await proposalGenerator.improveProposal(existingProposal);

    res.json({ success: true, data: { improvedProposal: improved } });
  } catch (error) {
    console.error('Improve proposal error:', error);
    res.status(500).json({ message: 'Failed to improve proposal' });
  }
});

// ==================== GIG GENERATION ====================
/**
 * @route   POST /api/ai/gigs/generate
 * @desc    Generate a complete gig from an idea
 * @access  Private (freelancer)
 */
router.post('/gigs/generate', authorize('freelancer'), async (req, res) => {
  try {
    const { idea, category } = req.body;

    if (!idea) {
      return res.status(400).json({ message: 'Gig idea is required' });
    }

    const gig = await gigGenerator.generateGig(idea, category);

    res.json({ success: true, data: { gig } });
  } catch (error) {
    console.error('Generate gig error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate gig' });
  }
});

/**
 * @route   POST /api/ai/gigs/description
 * @desc    Generate gig description
 * @access  Private (freelancer)
 */
router.post('/gigs/description', authorize('freelancer'), async (req, res) => {
  try {
    const { title, keyPoints } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Gig title is required' });
    }

    const description = await gigGenerator.generateGigDescription(title, keyPoints);

    res.json({ success: true, data: { description } });
  } catch (error) {
    console.error('Generate description error:', error);
    res.status(500).json({ message: 'Failed to generate description' });
  }
});

/**
 * @route   POST /api/ai/gigs/pricing
 * @desc    Get pricing suggestions for a gig
 * @access  Private (freelancer)
 */
router.post('/gigs/pricing', authorize('freelancer'), async (req, res) => {
  try {
    const { category, description, experienceLevel } = req.body;

    if (!category || !description) {
      return res.status(400).json({ message: 'Category and description are required' });
    }

    const pricing = await gigGenerator.suggestPricing(category, description, experienceLevel);

    res.json({ success: true, data: { pricing } });
  } catch (error) {
    console.error('Suggest pricing error:', error);
    res.status(500).json({ message: 'Failed to generate pricing suggestions' });
  }
});

/**
 * @route   POST /api/ai/gigs/tags
 * @desc    Generate SEO tags for a gig
 * @access  Private (freelancer)
 */
router.post('/gigs/tags', authorize('freelancer'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Gig title is required' });
    }

    const tags = await gigGenerator.generateGigTags(title, description);

    res.json({ success: true, data: { tags } });
  } catch (error) {
    console.error('Generate tags error:', error);
    res.status(500).json({ message: 'Failed to generate tags' });
  }
});

// ==================== CHATBOT ====================
/**
 * @route   POST /api/ai/chatbot
 * @desc    Chat with AI assistant
 * @access  Private
 */
router.post('/chatbot', async (req, res) => {
  try {
    const { message, context, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await chatbotService.getChatbotResponse(
      message,
      context,
      req.user.role
    );

    res.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ message: 'Failed to get chatbot response' });
  }
});

/**
 * @route   POST /api/ai/chatbot/job-description
 * @desc    Get help writing a job description
 * @access  Private (client)
 */
router.post('/chatbot/job-description', authorize('client'), async (req, res) => {
  try {
    const { jobTitle, requirements } = req.body;

    if (!jobTitle) {
      return res.status(400).json({ message: 'Job title is required' });
    }

    const jobDescription = await chatbotService.helpWriteJobDescription(jobTitle, requirements);

    res.json({ success: true, data: { jobDescription } });
  } catch (error) {
    console.error('Job description help error:', error);
    res.status(500).json({ message: 'Failed to generate job description help' });
  }
});

/**
 * @route   POST /api/ai/chatbot/improve-gig
 * @desc    Get suggestions to improve gig content
 * @access  Private (freelancer)
 */
router.post('/chatbot/improve-gig', authorize('freelancer'), async (req, res) => {
  try {
    const { currentContent, improvementType } = req.body;

    if (!currentContent) {
      return res.status(400).json({ message: 'Current content is required' });
    }

    const improved = await chatbotService.improveGigContent(currentContent, improvementType);

    res.json({ success: true, data: { improvedContent: improved } });
  } catch (error) {
    console.error('Improve gig error:', error);
    res.status(500).json({ message: 'Failed to improve gig content' });
  }
});

// ==================== MATCHING ====================
/**
 * @route   POST /api/ai/matching/freelancers
 * @desc    Find matching freelancers for a job
 * @access  Private (client)
 */
router.post('/matching/freelancers', authorize('client'), async (req, res) => {
  try {
    const { job, limit = 10 } = req.body;

    if (!job) {
      return res.status(400).json({ message: 'Job details are required' });
    }

    const freelancers = await matchingService.findMatchingFreelancers(job, limit);

    res.json({ success: true, data: { freelancers } });
  } catch (error) {
    console.error('Find freelancers error:', error);
    res.status(500).json({ message: 'Failed to find matching freelancers' });
  }
});

/**
 * @route   POST /api/ai/matching/jobs
 * @desc    Find matching jobs for a freelancer
 * @access  Private (freelancer)
 */
router.post('/matching/jobs', authorize('freelancer'), async (req, res) => {
  try {
    const { limit = 10 } = req.body;

    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    const jobs = await matchingService.findMatchingJobs(
      {
        skills: user.skills,
        rating: user.rating,
        completedJobs: user.completedJobs,
        hourlyRate: user.profile?.hourlyRate,
      },
      limit
    );

    res.json({ success: true, data: { jobs } });
  } catch (error) {
    console.error('Find jobs error:', error);
    res.status(500).json({ message: 'Failed to find matching jobs' });
  }
});

/**
 * @route   POST /api/ai/matching/explain
 * @desc    Generate match explanation
 * @access  Private
 */
router.post('/matching/explain', async (req, res) => {
  try {
    const { job, freelancer } = req.body;

    if (!job || !freelancer) {
      return res.status(400).json({ message: 'Job and freelancer details are required' });
    }

    const explanation = await matchingService.generateMatchExplanation(job, freelancer);

    res.json({ success: true, data: { explanation } });
  } catch (error) {
    console.error('Generate explanation error:', error);
    res.status(500).json({ message: 'Failed to generate explanation' });
  }
});

// ==================== REVIEW ANALYSIS ====================
/**
 * @route   POST /api/ai/reviews/analyze
 * @desc    Analyze a review for spam and sentiment
 * @access  Private/Admin
 */
router.post('/reviews/analyze', authorize('admin'), async (req, res) => {
  try {
    const { review } = req.body;

    if (!review) {
      return res.status(400).json({ message: 'Review is required' });
    }

    const analysis = await reviewAnalyzer.analyzeReview(review);

    res.json({ success: true, data: { analysis } });
  } catch (error) {
    console.error('Analyze review error:', error);
    res.status(500).json({ message: 'Failed to analyze review' });
  }
});

/**
 * @route   POST /api/ai/reviews/batch-analyze
 * @desc    Batch analyze multiple reviews
 * @access  Private/Admin
 */
router.post('/reviews/batch-analyze', authorize('admin'), async (req, res) => {
  try {
    const { reviews } = req.body;

    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ message: 'Reviews array is required' });
    }

    const results = await reviewAnalyzer.batchAnalyzeReviews(reviews);

    res.json({ success: true, data: { results } });
  } catch (error) {
    console.error('Batch analyze error:', error);
    res.status(500).json({ message: 'Failed to batch analyze reviews' });
  }
});

/**
 * @route   POST /api/ai/reviews/generate-response
 * @desc    Generate a response to a review
 * @access  Private
 */
router.post('/reviews/generate-response', async (req, res) => {
  try {
    const { review, tone = 'professional' } = req.body;

    if (!review) {
      return res.status(400).json({ message: 'Review is required' });
    }

    const response = await reviewAnalyzer.generateReviewResponse(review, tone);

    res.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Generate response error:', error);
    res.status(500).json({ message: 'Failed to generate response' });
  }
});

module.exports = router;
