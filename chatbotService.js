const { getGeminiModel } = require('../../config/gemini');

// System prompt for the chatbot
const CHATBOT_SYSTEM_PROMPT = `You are FreelanceAI, a helpful assistant for a freelancing marketplace platform. Your role is to help users with:

1. Writing compelling job descriptions
2. Creating and optimizing gig listings
3. Pricing suggestions for services
4. Platform-related questions and guidance
5. Best practices for freelancing success
6. Tips for better client/freelancer communication

Guidelines:
- Be friendly, professional, and encouraging
- Provide actionable, specific advice
- Use examples when helpful
- Keep responses concise but thorough (2-4 paragraphs max)
- For platform-specific questions, be honest if you don't have specific information
- Never make promises about earnings or guarantees
- Encourage best practices like clear communication, fair pricing, and quality work

Current date: ${new Date().toLocaleDateString()}`;

/**
 * Get chatbot response
 * @param {string} message - User message
 * @param {string} context - Conversation context/history
 * @param {string} userRole - User's role (client/freelancer)
 * @returns {Promise<string>} Bot response
 */
const getChatbotResponse = async (message, context = '', userRole = 'client') => {
  try {
    const model = getGeminiModel();
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: CHATBOT_SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: "Hello! I'm FreelanceAI, your personal assistant for all things freelancing. Whether you're looking to post a job, create a gig, or need advice on pricing and best practices, I'm here to help. What can I assist you with today?" }],
        },
      ],
    });

    const userContext = userRole === 'client'
      ? 'The user is a CLIENT looking to hire freelancers.'
      : 'The user is a FREELANCER looking to find work and grow their business.';

    const fullMessage = `${userContext}
${context ? `Previous conversation context: ${context}\n\n` : ''}
User: ${message}`;

    const result = await chat.sendMessage(fullMessage);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    throw new Error('Failed to get response. Please try again.');
  }
};

/**
 * Help write a job description
 * @param {string} jobTitle - Title of the job
 * @param {string} requirements - Basic requirements
 * @returns {Promise<Object>} Structured job description
 */
const helpWriteJobDescription = async (jobTitle, requirements) => {
  try {
    const model = getGeminiModel();

    const prompt = `Help write a comprehensive job description for: "${jobTitle}"

Basic requirements provided:
${requirements}

Generate a structured job description with:
1. Project Overview (2-3 sentences)
2. Scope of Work (bullet points)
3. Required Skills & Qualifications
4. Deliverables
5. Timeline expectations
6. Budget range suggestion

Return as JSON:
{
  "overview": "string",
  "scopeOfWork": ["item 1", "item 2"],
  "requiredSkills": ["skill 1", "skill 2"],
  "deliverables": ["deliverable 1", "deliverable 2"],
  "timeline": "string",
  "budgetSuggestion": "string"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (error) {
    console.error('Error helping write job description:', error);
    return null;
  }
};

/**
 * Improve gig content
 * @param {string} currentContent - Current gig title/description
 * @param {string} improvementType - Type of improvement needed
 * @returns {Promise<string>} Improved content
 */
const improveGigContent = async (currentContent, improvementType = 'general') => {
  try {
    const model = getGeminiModel();

    let specificInstructions = '';
    switch (improvementType) {
      case 'seo':
        specificInstructions = 'Focus on SEO optimization with relevant keywords.';
        break;
      case 'conversion':
        specificInstructions = 'Focus on conversion optimization - make it more persuasive.';
        break;
      case 'clarity':
        specificInstructions = 'Focus on clarity and readability.';
        break;
      default:
        specificInstructions = 'Make overall improvements to professionalism, clarity, and appeal.';
    }

    const prompt = `Improve the following gig content.
${specificInstructions}

Current content:
${currentContent}

Return only the improved content, maintaining similar length.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error improving gig content:', error);
    return currentContent;
  }
};

/**
 * Answer platform-specific questions
 * @param {string} question - User's question
 * @returns {Promise<string>} Answer
 */
const answerPlatformQuestion = async (question) => {
  try {
    const model = getGeminiModel();

    const prompt = `Answer this question about using a freelancing platform. Provide helpful, accurate guidance.

Question: ${question}

If the question is about specific platform features you don't have information about, acknowledge that and provide general best-practice advice instead.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error answering platform question:', error);
    return "I'm having trouble accessing information right now. Please try again or contact support for assistance.";
  }
};

module.exports = {
  getChatbotResponse,
  helpWriteJobDescription,
  improveGigContent,
  answerPlatformQuestion,
};
