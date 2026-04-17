const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'view_dashboard',
        'view_user',
        'update_user',
        'ban_user',
        'unban_user',
        'verify_user',
        'delete_user',
        'hard_delete_user',
        'soft_delete_user',
        'update_freelancer_profile',
        'view_gig',
        'update_gig',
        'feature_gig',
        'unfeature_gig',
        'approve_gig',
        'reject_gig',
        'delete_gig',
        'view_job',
        'update_job',
        'delete_job',
        'view_order',
        'update_order_status',
        'cancel_order',
        'view_dispute',
        'assign_dispute',
        'add_dispute_note',
        'resolve_dispute',
        'view_transaction',
        'process_withdrawal',
        'view_review',
        'flag_review',
        'unflag_review',
        'delete_review',
        'analyze_review',
        'batch_analyze_reviews',
        'ai_fraud_detection',
        'analyze_behavior',
        'update_setting',
        'update_commission',
        'broadcast_notification',
        'update_cms',
        'update_categories',
        'export_data',
        'other',
      ],
    },
    target: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Auto-delete logs older than 1 year
adminAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
