const { getGeminiModel } = require('../../config/gemini');

/**
 * Generate a complete gig from a simple idea
 * @param {string} idea - Simple gig idea or keyword
 * @param {string} category - Gig category
 * @returns {Promise<Object>} Complete gig details
 */
const generateGig = async (idea, category = '') => {
  try {
    const model = getGeminiModel();
    const chat = model.startChat();

    const prompt = `You are an expert gig creator for a freelancing platform. Generate a complete, high-converting gig based on this idea.

GIG IDEA: ${idea}
${category ? `CATEGORY: ${category}` : ''}

Generate the following in valid JSON format:
{
  "title": "Catchy, SEO-friendly gig title (max 100 chars, starts with 'I will')",
  "description": "Compelling gig description (500-1000 words) with:
    - Engaging introduction
    - What the buyer gets
    - Why choose this service
    - Process overview
    - Call to action",
  "category": "appropriate category slug",
  "subcategory": "appropriate subcategory",
  "tags": ["5-7 relevant tags for search"],
  "packages": {
    "basic": {
      "title": "Basic package name",
      "description": "What's included",
      "price": 25-50,
      "deliveryDays": 2-3,
      "revisions": 1,
      "features": ["feature 1", "feature 2"]
    },
    "standard": {
      "title": "Standard package name",
      "description": "What's included (more than basic)",
      "price": 50-150,
      "deliveryDays": 3-5,
      "revisions": 2,
      "features": ["more features"]
    },
    "premium": {
      "title": "Premium package name",
      "description": "What's included (best value)",
      "price": 150-500,
      "deliveryDays": 5-7,
      "revisions": 5,
      "features": ["all features", "priority support"]
    }
  },
  "faqs": [
    {"question": "Common question 1?", "answer": "Helpful answer"},
    {"question": "Common question 2?", "answer": "Helpful answer"},
    {"question": "Common question 3?", "answer": "Helpful answer"}
  ],
  "requirements": [
    {"question": "What the buyer needs to provide", "required": true}
  ]
}

Make the gig:
- Professional and trustworthy
- Clear about deliverables
- Competitive with market pricing
- SEO-optimized with relevant keywords
- Appealing to potential buyers

Return ONLY valid JSON, no additional text.`;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON from response (in case there's markdown formatting)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating gig:', error);
    throw new Error('Failed to generate gig. Please try again.');
  }
};

/**
 * Generate gig description only
 * @param {string} title - Gig title
 * @param {string} keyPoints - Key points to include
 * @returns {Promise<string>} Generated description
 */
const generateGigDescription = async (title, keyPoints = '') => {
  try {
    const model = getGeminiModel();

    const prompt = `Write a compelling gig description for: "${title}"
${keyPoints ? `Key points to include: ${keyPoints}` : ''}

The description should:
- Hook the reader in the first paragraph
- Clearly explain what they'll receive
- Highlight benefits over features
- Build trust and credibility
- Include a clear call-to-action
- Be 300-500 words
- Use short paragraphs and bullet points for readability

Return only the description text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating description:', error);
    throw new Error('Failed to generate description.');
  }
};

/**
 * Suggest pricing for a gig based on category and experience
 * @param {string} category - Gig category
 * @param {string} description - Gig description
 * @param {number} experienceLevel - Seller's experience (1-5)
 * @returns {Promise<Object>} Pricing suggestions
 */
const suggestPricing = async (category, description, experienceLevel = 3) => {
  try {
    const model = getGeminiModel();

    const prompt = `Analyze this gig and suggest competitive pricing for a freelancing platform.

Category: ${category}
Description: ${description}
Seller Experience Level: ${experienceLevel}/5 (1=new, 5=expert)

Provide pricing recommendations in JSON format:
{
  "basic": {
    "min": number,
    "max": number,
    "recommended": number,
    "reasoning": "brief explanation"
  },
  "standard": {
    "min": number,
    "max": number,
    "recommended": number,
    "reasoning": "brief explanation"
  },
  "premium": {
    "min": number,
    "max": number,
    "recommended": number,
    "reasoning": "brief explanation"
  },
  "marketAnalysis": "brief analysis of typical pricing in this category"
}

Consider:
- Category averages
- Complexity of service
- Experience level
- Value delivered
Return only valid JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (error) {
    console.error('Error suggesting pricing:', error);
    return null;
  }
};

/**
 * Generate SEO tags for a gig
 * @param {string} title - Gig title
 * @param {string} description - Gig description
 * @returns {Promise<Array>} Array of tags
 */
const generateGigTags = async (title, description) => {
  try {
    const model = getGeminiModel();

    const prompt = `Generate 7-10 SEO-friendly tags for this gig. Return only a comma-separated list of tags.

Gig Title: ${title}
Description: ${description}

Tags should:
- Include primary keywords
- Include long-tail variations
- Be specific to the service
- Match common search terms`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    return text.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  } catch (error) {
    console.error('Error generating tags:', error);
    return [];
  }
};

module.exports = {
  generateGig,
  generateGigDescription,
  suggestPricing,
  generateGigTags,
};
