const { supabase } = require('../config/supabase');
const { formatResponse, handleError } = require('../utils/helpers');

// @desc    Get all proposals for a job
// @route   GET /api/proposals/job/:jobId
// @access  Private (client)
exports.getProposalsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const { data: job } = await supabase
      .from('jobs')
      .select('client_id')
      .eq('id', jobId)
      .single();

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.client_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { data: proposals, error } = await supabase
      .from('proposals')
      .select(`
        *,
        freelancer:users!proposals_freelancer_id_fkey (
          id,
          name,
          avatar_url,
          rating,
          skills,
          hourly_rate
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(formatResponse(proposals || []));
  } catch (error) {
    handleError(res, error, 'Failed to fetch proposals');
  }
};

// @desc    Get freelancer's proposals
// @route   GET /api/proposals/my-proposals
// @access  Private
exports.getMyProposals = async (req, res) => {
  try {
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select(`
        *,
        job:jobs (
          id,
          title,
          budget,
          status
        )
      `)
      .eq('freelancer_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(formatResponse(proposals || []));
  } catch (error) {
    handleError(res, error, 'Failed to fetch proposals');
  }
};

// @desc    Submit proposal
// @route   POST /api/proposals
// @access  Private (freelancer)
exports.submitProposal = async (req, res) => {
  try {
    const { job_id, cover_letter, bid_amount, duration_days, attachments } = req.body;

    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ success: false, message: 'Only freelancers can submit proposals' });
    }

    // Check if already submitted
    const { data: existing } = await supabase
      .from('proposals')
      .select('id')
      .eq('job_id', job_id)
      .eq('freelancer_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ success: false, message: 'Proposal already submitted' });
    }

    const proposal = {
      job_id,
      freelancer_id: req.user.id,
      cover_letter,
      bid_amount,
      duration_days,
      attachments: attachments || [],
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('proposals')
      .insert(proposal)
      .select()
      .single();

    if (error) throw error;

    // Increment job proposals count
    await supabase.rpc('increment_proposals_count', { job_id });

    res.status(201).json(formatResponse(data, 'Proposal submitted successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to submit proposal');
  }
};

// @desc    Accept proposal
// @route   POST /api/proposals/:id/accept
// @access  Private (client)
exports.acceptProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: proposal } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    // Verify client owns the job
    const { data: job } = await supabase
      .from('jobs')
      .select('client_id')
      .eq('id', proposal.job_id)
      .single();

    if (job.client_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update proposal status
    await supabase
      .from('proposals')
      .update({ status: 'accepted' })
      .eq('id', id);

    // Reject other proposals for this job
    await supabase
      .from('proposals')
      .update({ status: 'rejected' })
      .eq('job_id', proposal.job_id)
      .neq('id', id);

    // Close the job
    await supabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', proposal.job_id);

    // Create order
    const { data: order } = await supabase
      .from('orders')
      .insert({
        job_id: proposal.job_id,
        client_id: req.user.id,
        freelancer_id: proposal.freelancer_id,
        proposal_id: id,
        amount: proposal.bid_amount,
        status: 'active',
      })
      .select()
      .single();

    res.json(formatResponse(order, 'Proposal accepted and order created'));
  } catch (error) {
    handleError(res, error, 'Failed to accept proposal');
  }
};

// @desc    Reject proposal
// @route   POST /api/proposals/:id/reject
// @access  Private (client)
exports.rejectProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: proposal } = await supabase
      .from('proposals')
      .select('job_id')
      .eq('id', id)
      .single();

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('client_id')
      .eq('id', proposal.job_id)
      .single();

    if (job.client_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await supabase
      .from('proposals')
      .update({ status: 'rejected' })
      .eq('id', id);

    res.json(formatResponse(null, 'Proposal rejected'));
  } catch (error) {
    handleError(res, error, 'Failed to reject proposal');
  }
};

// @desc    Withdraw proposal
// @route   POST /api/proposals/:id/withdraw
// @access  Private (freelancer)
exports.withdrawProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: proposal } = await supabase
      .from('proposals')
      .select('freelancer_id')
      .eq('id', id)
      .single();

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (proposal.freelancer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await supabase
      .from('proposals')
      .update({ status: 'withdrawn' })
      .eq('id', id);

    res.json(formatResponse(null, 'Proposal withdrawn'));
  } catch (error) {
    handleError(res, error, 'Failed to withdraw proposal');
  }
};
