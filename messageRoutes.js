const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const messageController = require('../controllers/messageController');

// @route   GET /api/messages/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', protect, messageController.getConversations);

// @route   GET /api/messages/:conversationId
// @desc    Get conversation messages
// @access  Private
router.get('/:conversationId', protect, messageController.getConversationMessages);

// @route   POST /api/messages
// @desc    Send message
// @access  Private
router.post('/', protect, upload.array('attachments', 5), messageController.sendMessage);

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', protect, messageController.markAsRead);

// @route   DELETE /api/messages/:id
// @desc    Delete message
// @access  Private
router.delete('/:id', protect, messageController.deleteMessage);

module.exports = router;
