const { getGeminiModel } = require('../../config/gemini');

/**
 * Generate a professional proposal for a job
 * @param {Object} job - Job details
 * @param {Object} freelancerProfile - Freelancer's profile and skills
 * @param {string} customNotes - Any custom notes from freelancer
 * @returns {Promise<string>} Generated proposal
 */
const generateProposal = async (job, freelancerProfile, customNotes = '') => {
  try {
    const model = getGeminiModel();
    const chat = model.startChat();

    const prompt = `You are an expert proposal writer for a freelancing platform. Generate a professional, compelling proposal for the following job posting.

JOB DETAILS:
Title: ${job.title}
Description: ${job.description}
Category: ${job.category}
Budget: ${job.budget.type === 'fixed' ? `$${job.budget.amount} (Fixed)` : `$${job.budget.amount}/hr (Hourly)`}
Required Skills: ${job.skillsRequired.join(', ')}
Experience Level: ${job.experienceLevel}

FREELANCER PROFILE:
Name: ${freelancerProfile.name}
Title: ${freelancerProfile.title || 'Professional Freelancer'}
Skills: ${freelancerProfile.skills?.map(s => s.name).join(', ') || 'Various'}
Rating: ${freelancerProfile.rating || 'New'} (${freelancerProfile.reviewsCount || 0} reviews)
Completed Jobs: ${freelancerProfile.completedJobs || 0}
Bio: ${freelancerProfile.profile?.bio || 'Experienced professional ready to help'}
${freelancerProfile.experience?.length > 0 ? `Experience: ${freelancerProfile.experience.map(e => `${e.title} at ${e.company}`).join(', ')}` : ''}

${customNotes ? `CUSTOM NOTES FROM FREELANCER: ${customNotes}` : ''}

Generate a proposal that:
1. Starts with a personalized greeting and shows understanding of the project
2. Highlights relevant skills and experience that match the job requirements
3. Explains the approach to solving the client's problem
4. Includes a call-to-action inviting further discussion
5. Is professional, confident, but not arrogant
6. Is between 150-250 words
7. Uses proper formatting with short paragraphs

Return ONLY the proposal text, no additional commentary.`;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating proposal:', error);
    throw new Error('Failed to generate proposal. Please try again.');
  }
};

/**
 * Generate proposal improvement suggestions
 * @param {string} existingProposal - Current proposal text
 * @returns {Promise<string>} Improved proposal
 */
const improveProposal = async (existingProposal) => {
  try {
    const model = getGeminiModel();

    const prompt = `Improve the following freelance job proposal. Make it more:
1. Engaging and personalized
2. Clear about value proposition
3. Professional and confident
4. Persuasive with a strong call-to-action

Current proposal:
${existingProposal}

Return only the improved proposal text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error improving proposal:', error);
    throw new Error('Failed to improve proposal.');
  }
};

/**
 * Extract key requirements from job description
 * @param {string} jobDescription - Job description text
 * @returns {Promise<Array>} List of key requirements
 */
const extractRequirements = async (jobDescription) => {
  try {
    const model = getGeminiModel();

    const prompt = `Analyze this job description and extract the key requirements as a bulleted list. Focus on:
- Required skills and technologies
- Deliverables expected
- Experience level needed
- Any specific qualifications

Job Description:
${jobDescription}

Return only the bulleted list of requirements.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    return text.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error('Error extracting requirements:', error);
    return [];
  }
};

module.exports = {
  generateProposal,
  improveProposal,
  extractRequirements,
};
