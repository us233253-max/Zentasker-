import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  googleLogin: (tokenId) => api.post('/auth/google', { tokenId }),
};

// User APIs
export const userAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  searchFreelancers: (params) => api.get('/users/freelancers', { params }),
  searchClients: (params) => api.get('/users/clients', { params }),
};

// Gig APIs
export const gigAPI = {
  getAll: (params) => api.get('/gigs', { params }),
  getById: (id) => api.get(`/gigs/${id}`),
  create: (data) => api.post('/gigs', data),
  update: (id, data) => api.put(`/gigs/${id}`, data),
  delete: (id) => api.delete(`/gigs/${id}`),
  search: (query) => api.get('/gigs/search', { params: { q: query } }),
  getBySeller: (sellerId) => api.get(`/gigs/seller/${sellerId}`),
  toggleActive: (id) => api.patch(`/gigs/${id}/toggle-active`),
};

// Job APIs
export const jobAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  search: (query) => api.get('/jobs/search', { params: { q: query } }),
  getByClient: (clientId) => api.get(`/jobs/client/${clientId}`),
  closeJob: (id) => api.patch(`/jobs/${id}/close`),
};

// Proposal APIs
export const proposalAPI = {
  create: (jobId, data) => api.post(`/proposals/job/${jobId}`, data),
  getProposals: (jobId) => api.get(`/proposals/job/${jobId}`),
  getMyProposals: () => api.get('/proposals/my-proposals'),
  updateStatus: (id, status) => api.patch(`/proposals/${id}/status`, { status }),
  getById: (id) => api.get(`/proposals/${id}`),
};

// Order APIs
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  submitDelivery: (id, data) => api.post(`/orders/${id}/deliver`, data),
  requestRevision: (id, data) => api.post(`/orders/${id}/revision`, data),
  completeOrder: (id) => api.post(`/orders/${id}/complete`),
  cancelOrder: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
  disputeOrder: (id, reason) => api.post(`/orders/${id}/dispute`, { reason }),
};

// Message APIs
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (conversationId) => api.get(`/messages/conversation/${conversationId}`),
  sendMessage: (conversationId, content) => api.post('/messages', { conversationId, content }),
  createConversation: (participantId) => api.post('/messages/conversation', { participantId }),
  markAsRead: (conversationId) => api.patch(`/messages/conversation/${conversationId}/read`),
};

// Review APIs
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getReviews: (params) => api.get('/reviews', { params }),
  getReview: (id) => api.get(`/reviews/${id}`),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  getMyReviews: () => api.get('/reviews/my-reviews'),
};

// Payment APIs
export const paymentAPI = {
  createPaymentIntent: (orderId) => api.post('/payments/create-intent', { orderId }),
  createOrder: (gigId, packageType) => api.post('/payments/create-order', { gigId, packageType }),
  verifyPayment: (paymentId, orderId) => api.post('/payments/verify', { paymentId, orderId }),
  getTransactions: (params) => api.get('/payments/transactions', { params }),
  getBalance: () => api.get('/payments/balance'),
  requestWithdrawal: (amount, method) => api.post('/payments/withdraw', { amount, method }),
  getWithdrawalHistory: () => api.get('/payments/withdrawals'),
};

// AI APIs
export const aiAPI = {
  // Proposal generation
  generateProposal: (job, customNotes) => api.post('/ai/proposals/generate', { job, customNotes }),
  improveProposal: (existingProposal) => api.post('/ai/proposals/improve', { existingProposal }),

  // Gig generation
  generateGig: (idea, category) => api.post('/ai/gigs/generate', { idea, category }),
  generateGigDescription: (title, keyPoints) => api.post('/ai/gigs/description', { title, keyPoints }),
  suggestPricing: (category, description, experienceLevel) => api.post('/ai/gigs/pricing', { category, description, experienceLevel }),
  generateGigTags: (title, description) => api.post('/ai/gigs/tags', { title, description }),

  // Chatbot
  chat: (message, context, conversationHistory) => api.post('/ai/chatbot', { message, context, conversationHistory }),
  helpWriteJobDescription: (jobTitle, requirements) => api.post('/ai/chatbot/job-description', { jobTitle, requirements }),
  improveGigContent: (currentContent, improvementType) => api.post('/ai/chatbot/improve-gig', { currentContent, improvementType }),

  // Matching
  findMatchingFreelancers: (job, limit) => api.post('/ai/matching/freelancers', { job, limit }),
  findMatchingJobs: (limit) => api.post('/ai/matching/jobs', { limit }),
  generateMatchExplanation: (job, freelancer) => api.post('/ai/matching/explain', { job, freelancer }),

  // Review analysis
  analyzeReview: (review) => api.post('/ai/reviews/analyze', { review }),
  batchAnalyzeReviews: (reviews) => api.post('/ai/reviews/batch-analyze', { reviews }),
  generateReviewResponse: (review, tone) => api.post('/ai/reviews/generate-response', { review, tone }),
};

// Admin APIs
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),

  // User management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateFreelancerProfile: (id, data) => api.put(`/admin/users/${id}/freelancer-profile`, data),
  banUser: (id, data) => api.post(`/admin/users/${id}/ban`, data),
  verifyUser: (id) => api.post(`/admin/users/${id}/verify`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Gig management
  getAllGigs: (params) => api.get('/admin/gigs', { params }),
  getGigDetails: (id) => api.get(`/admin/gigs/${id}`),
  updateGig: (id, data) => api.put(`/admin/gigs/${id}`, data),
  featureGig: (id) => api.post(`/admin/gigs/${id}/feature`),
  approveGig: (id, data) => api.post(`/admin/gigs/${id}/approve`, data),
  deleteGig: (id) => api.delete(`/admin/gigs/${id}`),

  // Job management
  getAllJobs: (params) => api.get('/admin/jobs', { params }),
  getJobDetails: (id) => api.get(`/admin/jobs/${id}`),
  updateJob: (id, data) => api.put(`/admin/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/admin/jobs/${id}`),

  // Order management
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  getOrderDetails: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }),
  cancelOrder: (id, data) => api.post(`/admin/orders/${id}/cancel`, data),

  // Dispute management
  getAllDisputes: (params) => api.get('/admin/disputes', { params }),
  getDisputeDetails: (id) => api.get(`/admin/disputes/${id}`),
  assignDispute: (id, adminId) => api.post(`/admin/disputes/${id}/assign`, { adminId }),
  addDisputeNote: (id, note) => api.post(`/admin/disputes/${id}/note`, { note }),
  resolveDispute: (id, data) => api.post(`/admin/disputes/${id}/resolve`, data),

  // Financial management
  getAllTransactions: (params) => api.get('/admin/transactions', { params }),
  getFinancialDashboard: () => api.get('/admin/financial/dashboard'),
  processWithdrawal: (id, data) => api.post(`/admin/transactions/${id}/process-withdrawal`, data),
  exportFinancialReport: (params) => api.get('/admin/financial/export', { params }),

  // Review management
  getAllReviews: (params) => api.get('/admin/reviews', { params }),
  getFlaggedReviews: () => api.get('/admin/reviews/flagged'),
  analyzeReview: (id) => api.post(`/admin/reviews/${id}/analyze`),
  batchAnalyzeReviews: (data) => api.post('/admin/reviews/batch-analyze', data),
  flagReview: (id, data) => api.post(`/admin/reviews/${id}/flag`, data),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),

  // AI tools
  detectFraud: (data) => api.post('/admin/ai/detect-fraud', data),
  analyzeBehavior: (data) => api.post('/admin/ai/analyze-behavior', data),
  getAIInsights: () => api.get('/admin/ai/insights'),

  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  updateCommission: (rate) => api.post('/admin/settings/commission', { rate }),
  broadcastNotification: (data) => api.post('/admin/notifications/broadcast', data),

  // Audit logs
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export default api;
