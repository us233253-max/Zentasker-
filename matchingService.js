const { getGeminiModel } = require('../../config/gemini');
const User = require('../../models/User');
const Job = require('../../models/Job');
const Gig = require('../../models/Gig');

/**
 * Find matching freelancers for a job
 * @param {Object} job - Job object
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} Matching freelancers with scores
 */
const findMatchingFreelancers = async (job, limit = 10) => {
  try {
    // Get freelancers with relevant skills
    const skillQuery = job.skillsRequired?.length > 0
      ? { 'skills.name': { $in: job.skillsRequired } }
      : {};

    const freelancers = await User.find({
      role: 'freelancer',
      isActive: true,
      isBanned: false,
      ...skillQuery,
    })
    .select('name avatar skills rating reviewsCount completedJobs profile hourlyRate')
    .limit(limit * 2)
    .lean();

    // Score and rank freelancers using AI
    const scoredFreelancers = await Promise.all(
      freelancers.map(async (freelancer) => {
        const score = await calculateMatchScore(job, freelancer);
        return {
          freelancer,
          score,
        };
      })
    );

    // Sort by score and return top results
    scoredFreelancers.sort((a, b) => b.score - a.score);

    return scoredFreelancers.slice(0, limit).map(({ freelancer, score }) => ({
      ...freelancer,
      matchScore: Math.round(score * 100),
    }));
  } catch (error) {
    console.error('Error finding matching freelancers:', error);
    return [];
  }
};

/**
 * Calculate match score between job and freelancer
 * @param {Object} job - Job details
 * @param {Object} freelancer - Freelancer profile
 * @returns {Promise<number>} Match score (0-1)
 */
const calculateMatchScore = async (job, freelancer) => {
  try {
    const model = getGeminiModel();

    const prompt = `Calculate a match score (0 to 1) between a job and freelancer.

JOB:
Title: ${job.title}
Skills Required: ${job.skillsRequired?.join(', ') || 'None specified'}
Category: ${job.category || 'Unspecified'}
Experience Level: ${job.experienceLevel || 'Any'}
Budget: ${job.budget?.type === 'fixed' ? `$${job.budget.amount}` : `$${job.budget?.amount}/hr`}

FREELANCER:
Name: ${freelancer.name}
Skills: ${freelancer.skills?.map(s => s.name).join(', ') || 'None'}
Rating: ${freelancer.rating || 0} (${freelancer.reviewsCount || 0} reviews)
Completed Jobs: ${freelancer.completedJobs || 0}
Hourly Rate: $${freelancer.hourlyRate || 0}

Score based on:
- Skill match (40%)
- Experience/reliability (30%)
- Rating quality (20%)
- Budget fit (10%)

Return ONLY a number between 0 and 1, with up to 2 decimal places.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const score = parseFloat(text);
    return isNaN(score) ? 0.5 : Math.min(1, Math.max(0, score));
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 0.5;
  }
};

/**
 * Find matching jobs for a freelancer
 * @param {Object} freelancer - Freelancer profile
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} Matching jobs with scores
 */
const findMatchingJobs = async (freelancer, limit = 10) => {
  try {
    // Get jobs that might match freelancer's skills
    const skillQuery = freelancer.skills?.length > 0
      ? { skillsRequired: { $in: freelancer.skills.map(s => s.name) } }
      : {};

    const jobs = await Job.find({
      status: 'open',
      visibility: 'public',
      ...skillQuery,
    })
    .populate('clientId', 'name avatar rating')
    .limit(limit * 2)
    .lean();

    // Score and rank jobs
    const scoredJobs = await Promise.all(
      jobs.map(async (job) => {
        const score = await calculateJobMatchScore(job, freelancer);
        return {
          job,
          score,
        };
      })
    );

    // Sort by score and return top results
    scoredJobs.sort((a, b) => b.score - a.score);

    return scoredJobs.slice(0, limit).map(({ job, score }) => ({
      ...job,
      matchScore: Math.round(score * 100),
    }));
  } catch (error) {
    console.error('Error finding matching jobs:', error);
    return [];
  }
};

/**
 * Calculate job match score for a freelancer
 * @param {Object} job - Job details
 * @param {Object} freelancer - Freelancer profile
 * @returns {Promise<number>} Match score (0-1)
 */
const calculateJobMatchScore = async (job, freelancer) => {
  try {
    const model = getGeminiModel();

    const prompt = `Calculate a match score (0 to 1) between a job and freelancer.

JOB:
Title: ${job.title}
Skills Required: ${job.skillsRequired?.join(', ') || 'None specified'}
Category: ${job.category || 'Unspecified'}
Budget: ${job.budget?.type === 'fixed' ? `$${job.budget.amount}` : `$${job.budget?.amount}/hr`}

FREELANCER:
Skills: ${freelancer.skills?.map(s => s.name).join(', ') || 'None'}
Rating: ${freelancer.rating || 0}
Completed Jobs: ${freelancer.completedJobs || 0}
Hourly Rate: $${freelancer.hourlyRate || 0}

Score based on:
- Skill match (50%)
- Experience level fit (25%)
- Budget alignment (15%)
- Freelancer capacity (10%)

Return ONLY a number between 0 and 1, with up to 2 decimal places.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const score = parseFloat(text);
    return isNaN(score) ? 0.5 : Math.min(1, Math.max(0, score));
  } catch (error) {
    console.error('Error calculating job match score:', error);
    return 0.5;
  }
};

/**
 * Generate match explanation
 * @param {Object} job - Job details
 * @param {Object} freelancer - Freelancer profile
 * @returns {Promise<string>} Explanation text
 */
const generateMatchExplanation = async (job, freelancer) => {
  try {
    const model = getGeminiModel();

    const prompt = `Explain why this freelancer is a good match for this job (or why this job is a good match for the freelancer).

JOB: ${job.title}
Required Skills: ${job.skillsRequired?.join(', ')}

FREELANCER: ${freelancer.name}
Skills: ${freelancer.skills?.map(s => s.name).join(', ')}
Experience: ${freelancer.completedJobs || 0} jobs completed

Write a 2-3 sentence explanation of the match, highlighting key alignments.
Be specific about skill overlaps and relevant experience.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating match explanation:', error);
    return 'Good match based on skills and experience.';
  }
};

module.exports = {
  findMatchingFreelancers,
  findMatchingJobs,
  calculateMatchScore,
  calculateJobMatchScore,
  generateMatchExplanation,
};
