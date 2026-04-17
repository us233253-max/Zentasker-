const { supabase } = require('../config/supabase');
const { formatResponse, handleError } = require('../utils/helpers');

// @desc    Get all orders (with filters)
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        gig:gigs (
          id,
          title,
          images
        ),
        client:users!orders_client_id_fkey (
          id,
          name,
          avatar_url
        ),
        freelancer:users!orders_freelancer_id_fkey (
          id,
          name,
          avatar_url,
          rating
        )
      `);

    // Filter by user role
    if (role === 'client') {
      query = query.eq('client_id', req.user.id);
    } else if (role === 'freelancer') {
      query = query.eq('freelancer_id', req.user.id);
    } else {
      // Admin sees all
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json(formatResponse({ orders: orders || [] }));
  } catch (error) {
    handleError(res, error, 'Failed to fetch orders');
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        gig:gigs (
          id,
          title,
          description,
          images
        ),
        client:users!orders_client_id_fkey (
          id,
          name,
          avatar_url,
          email
        ),
        freelancer:users!orders_freelancer_id_fkey (
          id,
          name,
          avatar_url,
          email,
          rating
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check access
    if (
      order.client_id !== req.user.id &&
      order.freelancer_id !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get messages
    const { data: messages } = await supabase
      .from('order_messages')
      .select(`
        *,
        sender:users!order_messages_sender_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    res.json(formatResponse({ order, messages: messages || [] }));
  } catch (error) {
    handleError(res, error, 'Failed to fetch order');
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliverables, revisions_count } = req.body;

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check access
    const isClient = order.client_id === req.user.id;
    const isFreelancer = order.freelancer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isFreelancer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (deliverables) updateData.deliverables = deliverables;
    if (revisions_count !== undefined) updateData.revisions_count = revisions_count;

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(formatResponse(updatedOrder, 'Order updated successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to update order');
  }
};

// @desc    Send order message
// @route   POST /api/orders/:id/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;

    const { data: order } = await supabase
      .from('orders')
      .select('client_id, freelancer_id')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check access
    if (order.client_id !== req.user.id && order.freelancer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const newMessage = {
      order_id: id,
      sender_id: req.user.id,
      message,
      attachments: attachments || [],
      is_read: false,
    };

    const { data, error } = await supabase
      .from('order_messages')
      .insert(newMessage)
      .select(`
        *,
        sender:users!order_messages_sender_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(formatResponse(data, 'Message sent successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to send message');
  }
};

// @desc    Submit order deliverable
// @route   POST /api/orders/:id/deliver
// @access  Private (freelancer)
exports.submitDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliverables, message } = req.body;

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.freelancer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only freelancer can submit deliverables' });
    }

    // Update order
    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        deliverables: deliverables || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Send message
    await supabase
      .from('order_messages')
      .insert({
        order_id: id,
        sender_id: req.user.id,
        message: message || 'Deliverables submitted',
        attachments: deliverables,
      });

    res.json(formatResponse(null, 'Deliverables submitted successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to submit deliverables');
  }
};

// @desc    Request revision
// @route   POST /api/orders/:id/revision
// @access  Private (client)
exports.requestRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.client_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only client can request revisions' });
    }

    if (order.revisions_count >= order.max_revisions) {
      return res.status(400).json({ success: false, message: 'Maximum revisions reached' });
    }

    await supabase
      .from('orders')
      .update({
        status: 'in_progress',
        revisions_count: order.revisions_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await supabase
      .from('order_messages')
      .insert({
        order_id: id,
        sender_id: req.user.id,
        message: `Revision requested: ${reason}`,
      });

    res.json(formatResponse(null, 'Revision requested'));
  } catch (error) {
    handleError(res, error, 'Failed to request revision');
  }
};

// @desc    Approve and complete order
// @route   POST /api/orders/:id/complete
// @access  Private (client)
exports.completeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.client_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only client can complete order' });
    }

    await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Update freelancer stats
    await supabase.rpc('increment_completed_orders', { user_id: order.freelancer_id });
    await supabase.rpc('add_earnings', { user_id: order.freelancer_id, amount: order.amount - order.platform_fee });

    res.json(formatResponse(null, 'Order completed successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to complete order');
  }
};
