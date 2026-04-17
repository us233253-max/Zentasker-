// Helper functions for Supabase backend

// Format Supabase response
exports.formatResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data,
});

// Error handler
exports.handleError = (res, error, message = 'Server error') => {
  console.error(error);
  return res.status(500).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

// Parse filters for Supabase queries
exports.parseFilters = (query, filters) => {
  const result = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  }

  return result;
};

// Pagination helper
exports.getPagination = (page = 1, limit = 20) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;

  return { start, end, page: pageNum, limit: limitNum };
};

// Transform user object for response
exports.transformUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar_url: user.avatar_url,
  role: user.role,
  bio: user.bio,
  headline: user.headline,
  skills: user.skills,
  rating: user.rating,
  reviews_count: user.reviews_count,
  is_verified: user.is_verified,
  hourly_rate: user.hourly_rate,
  availability: user.availability,
  country: user.country,
  created_at: user.created_at,
});

// Transform gig for response
exports.transformGig = (gig) => ({
  ...gig,
  sellerId: gig.seller,
});

// Transform job for response
exports.transformJob = (job) => ({
  ...job,
  clientId: job.client,
});
