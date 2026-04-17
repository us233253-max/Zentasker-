const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['general', 'payment', 'notification', 'feature', 'security', 'ai'],
      default: 'general',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Default settings data
const defaultSettings = [
  { key: 'platformName', value: 'FreelanceAI', category: 'general', isPublic: true },
  { key: 'commissionRate', value: 15, category: 'payment', description: 'Platform commission percentage' },
  { key: 'minWithdrawal', value: 50, category: 'payment', description: 'Minimum withdrawal amount in USD' },
  { key: 'maxWithdrawal', value: 10000, category: 'payment', description: 'Maximum withdrawal amount in USD' },
  { key: 'withdrawalProcessingDays', value: 3, category: 'payment' },
  { key: 'orderAutoCompleteDays', value: 3, category: 'general', description: 'Days after delivery to auto-complete order' },
  { key: 'proposalLimit', value: 50, category: 'general', description: 'Max proposals per freelancer per month' },
  { key: 'freeProposalsPerMonth', value: 10, category: 'general' },
  { key: 'maintenanceMode', value: false, category: 'feature' },
  { key: 'registrationEnabled', value: true, category: 'feature' },
  { key: 'aiProposalGeneration', value: true, category: 'ai' },
  { key: 'aiGigGeneration', value: true, category: 'ai' },
  { key: 'aiChatbotEnabled', value: true, category: 'ai' },
  { key: 'aiMatchingEnabled', value: true, category: 'ai' },
  { key: 'aiReviewAnalysis', value: true, category: 'ai' },
  { key: 'categories', value: [
    { name: 'Graphics & Design', slug: 'graphics-design' },
    { name: 'Digital Marketing', slug: 'digital-marketing' },
    { name: 'Writing & Translation', slug: 'writing-translation' },
    { name: 'Video & Animation', slug: 'video-animation' },
    { name: 'Music & Audio', slug: 'music-audio' },
    { name: 'Programming & Tech', slug: 'programming-tech' },
    { name: 'Business', slug: 'business' },
    { name: 'Lifestyle', slug: 'lifestyle' },
    { name: 'Data', slug: 'data' },
    { name: 'Photography', slug: 'photography' },
  ], category: 'general', isPublic: true },
];

// Initialize default settings
platformSettingsSchema.statics.initializeDefaults = async function () {
  const Settings = this;
  for (const setting of defaultSettings) {
    await Settings.findOneAndUpdate(
      { key: setting.key },
      { ...setting },
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
