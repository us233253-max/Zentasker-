const { getGeminiModel, getModerationModel } = require('../../config/gemini');

/**
 * Analyze a review for spam detection and sentiment
 * @param {Object} review - Review object
 * @returns {Promise<Object>} Analysis results
 */
const analyzeReview = async (review) => {
  try {
    const model = getModerationModel();

    // Check for spam/fake review patterns
    const spamAnalysis = await detectSpam(review);

    // Analyze sentiment
    const sentiment = await analyzeSentiment(review.comment);

    // Extract themes
    const themes = await extractThemes(review.comment);

    return {
      sentiment,
      isSpam: spamAnalysis.isSpam,
      spamScore: spamAnalysis.spamScore,
      spamReasons: spamAnalysis.reasons,
      themes,
      analyzedAt: new Date(),
    };
  } catch (error) {
    console.error('Error analyzing review:', error);
    return {
      sentiment: 'neutral',
      isSpam: false,
      spamScore: 0,
      themes: [],
      analyzedAt: new Date(),
      error: error.message,
    };
  }
};

/**
 * Detect if a review is potentially spam or fake
 * @param {Object} review - Review object
 * @returns {Promise<Object>} Spam analysis
 */
const detectSpam = async (review) => {
  try {
    const model = getGeminiModel();

    const prompt = `Analyze this review for signs of being spam, fake, or manipulative.

REVIEW:
Rating: ${review.rating}/5
Comment: ${review.comment}
Reviewer: ${review.reviewerId ? 'Verified buyer' : 'Unknown'}
Order Value: $${review.orderId ? 'Paid order' : 'Unknown'}

Check for:
- Generic/vague language that could apply to any service
- Excessive promotional language
- Unnatural phrasing or obvious template use
- Suspicious patterns (multiple similar reviews, etc.)
- Incentivized review indicators

Return JSON:
{
  "isSpam": boolean,
  "spamScore": number (0-1),
  "reasons": ["reason 1", "reason 2"] or []
}

Be conservative - only flag clear spam indicators.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    return {
      isSpam: analysis.isSpam || false,
      spamScore: analysis.spamScore || 0,
      reasons: analysis.reasons || [],
    };
  } catch (error) {
    console.error('Error detecting spam:', error);
    return { isSpam: false, spamScore: 0, reasons: [] };
  }
};

/**
 * Analyze sentiment of review comment
 * @param {string} comment - Review comment text
 * @returns {Promise<string>} Sentiment: positive, negative, or neutral
 */
const analyzeSentiment = async (comment) => {
  try {
    const model = getGeminiModel();

    const prompt = `Analyze the sentiment of this review comment. Return ONLY one word: "positive", "negative", or "neutral".

Comment: ${comment}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim().toLowerCase();

    if (text.includes('positive')) return 'positive';
    if (text.includes('negative')) return 'negative';
    return 'neutral';
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 'neutral';
  }
};

/**
 * Extract key themes from review
 * @param {string} comment - Review comment text
 * @returns {Promise<Array>} Array of themes
 */
const extractThemes = async (comment) => {
  try {
    const model = getGeminiModel();

    const prompt = `Extract 2-4 key themes or topics mentioned in this review. Return as a comma-separated list.

Review: ${comment}

Examples of themes: "communication", "quality", "delivery time", "value for money", "creativity", "professionalism"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    return text.split(',').map(theme => theme.trim()).filter(theme => theme.length > 0);
  } catch (error) {
    console.error('Error extracting themes:', error);
    return [];
  }
};

/**
 * Generate suggested response to a review
 * @param {Object} review - Review object
 * @param {string} sellerTone - Desired tone (professional, friendly, apologetic)
 * @returns {Promise<string>} Suggested response
 */
const generateReviewResponse = async (review, sellerTone = 'professional') => {
  try {
    const model = getGeminiModel();

    const toneInstructions = {
      professional: 'Be professional and courteous.',
      friendly: 'Be warm and friendly.',
      apologetic: 'Be apologetic and show commitment to improvement.',
    };

    const prompt = `Generate a seller response to this review.

REVIEW:
Rating: ${review.rating}/5
Comment: ${review.comment}

Tone: ${sellerTone} - ${toneInstructions[sellerTone] || toneInstructions.professional}

Guidelines:
- Thank the reviewer
- Address any concerns mentioned
- Keep it brief (2-3 sentences)
- Stay professional regardless of rating
- For positive reviews, express appreciation
- For negative reviews, acknowledge and offer to improve

Return only the response text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating review response:', error);
    return 'Thank you for your feedback!';
  }
};

/**
 * Batch analyze multiple reviews for admin dashboard
 * @param {Array} reviews - Array of review objects
 * @returns {Promise<Object>} Summary statistics
 */
const batchAnalyzeReviews = async (reviews) => {
  try {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let spamCount = 0;
    const allThemes = [];

    for (const review of reviews) {
      const analysis = await analyzeReview(review);

      if (analysis.sentiment === 'positive') positiveCount++;
      else if (analysis.sentiment === 'negative') negativeCount++;
      else neutralCount++;

      if (analysis.isSpam) spamCount++;
      allThemes.push(...analysis.themes);
    }

    // Count theme frequency
    const themeCounts = {};
    allThemes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });

    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    return {
      total: reviews.length,
      sentiment: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
      },
      spamDetected: spamCount,
      topThemes,
      averageSpamScore: reviews.length > 0 ? (spamCount / reviews.length).toFixed(2) : 0,
    };
  } catch (error) {
    console.error('Error in batch review analysis:', error);
    return { error: error.message };
  }
};

module.exports = {
  analyzeReview,
  detectSpam,
  analyzeSentiment,
  extractThemes,
  generateReviewResponse,
  batchAnalyzeReviews,
};
