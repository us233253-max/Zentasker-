const { supabase } = require('../config/supabase');
const { formatResponse, handleError, getPagination } = require('../utils/helpers');

// @desc    Get all jobs with filtering, sorting, pagination
// @route   GET /api/jobs
// @access  Public
exports.getJobs = async (req, res) => {
  try {
    const {
      category,
      experienceLevel,
      budgetType,
      sortBy = 'created_at',
      page = 1,
      limit = 20,
    } = req.query;

    let query = supabase
      .from('jobs')
      .select(`
        *,
        client:users!jobs_client_id_fkey (
          id,
          name,
          avatar_url,
          rating
        )
      `)
      .eq('status', 'open');

    // Apply filters
    if (category) query = query.eq('category', category);
    if (experienceLevel) query = query.eq('experience_level', experienceLevel);
    if (budgetType) query = query.eq('budget->>type', budgetType);

    // Apply sorting
    const order = sortBy === 'budget_high' ? 'desc' : 'asc';
    const sortColumn = sortBy === 'budget_high' || sortBy === 'budget_low'
      ? 'budget->amount'
      : sortBy === 'proposals' ? 'proposals_count' : 'created_at';

    query = query.order(sortColumn, { ascending: order === 'asc' });

    // Pagination
    const { start, end } = getPagination(page, limit);
    query = query.range(start, end);

    const { data: jobs, error } = await query;

    if (error) throw error;

    // Get total count
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    res.json(formatResponse({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    }));
  } catch (error) {
    handleError(res, error, 'Failed to fetch jobs');
  }
};

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Public
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        client:users!jobs_client_id_fkey (
          id,
          name,
          avatar_url,
          rating,
          reviews_count,
          bio
        )
      `)
      .eq('id', id)
      .single();

    if (error || !job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Get proposals for this job (if user is client)
    let proposals = [];
    if (req.user && req.user.id === job.client_id) {
      const { data: props } = await supabase
        .from('proposals')
        .select(`
          *,
          freelancer:users!proposals_freelancer_id_fkey (
            id,
            name,
            avatar_url,
            rating,
            skills
          )
        `)
        .eq('job_id', id);
      proposals = props || [];
    }

    res.json(formatResponse({ job, proposals }));
  } catch (error) {
    handleError(res, error, 'Failed to fetch job');
  }
};

// @desc    Create job
// @route   POST /api/jobs
// @access  Private (client)
exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Only clients can create jobs' });
    }

    const { budget, skills_required, ...jobData } = req.body;

    const jobToInsert = {
      ...jobData,
      client_id: req.user.id,
      budget: budget || { type: 'fixed', amount: 0 },
      skills_required: skills_required || [],
    };

    const { data: job, error } = await supabase
      .from('jobs')
      .insert(jobToInsert)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(formatResponse(job, 'Job created successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to create job');
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (job owner)
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('client_id')
      .eq('id', id)
      .single();

    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (existingJob.client_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { budget, skills_required, ...jobData } = req.body;

    const updateData = {
      ...jobData,
      budget: budget || existingJob.budget,
      skills_required: skills_required || existingJob.skills_required,
      updated_at: new Date().toISOString(),
    };

    const { data: job, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(formatResponse(job, 'Job updated successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to update job');
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (job owner or admin)
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: job } = await supabase
      .from('jobs')
      .select('client_id')
      .eq('id', id)
      .single();

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.client_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await supabase
      .from('jobs')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    res.json(formatResponse(null, 'Job deleted successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to delete job');
  }
};

// @desc    Get user's posted jobs
// @route   GET /api/jobs/my-jobs
// @access  Private
exports.getMyJobs = async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(formatResponse(jobs || []));
  } catch (error) {
    handleError(res, error, 'Failed to fetch jobs');
  }
};

// @desc    Submit proposal for job
// @route   POST /api/jobs/:id/proposal
// @access  Private (freelancer)
exports.submitProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { cover_letter, bid_amount, duration_days, is_ai_generated } = req.body;

    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ success: false, message: 'Only freelancers can submit proposals' });
    }

    // Check if already submitted
    const { data: existing } = await supabase
      .from('proposals')
      .select('id')
      .eq('job_id', id)
      .eq('freelancer_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already submitted a proposal' });
    }

    const proposal = {
      job_id: id,
      freelancer_id: req.user.id,
      cover_letter,
      bid_amount,
      duration_days,
      is_ai_generated: is_ai_generated || false,
    };

    const { data, error } = await supabase
      .from('proposals')
      .insert(proposal)
      .select()
      .single();

    if (error) throw error;

    // Update job proposals count
    await supabase
      .from('jobs')
      .update({ proposals_count: supabase.rpc('increment_proposals_count') })
      .eq('id', id);

    res.status(201).json(formatResponse(data, 'Proposal submitted successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to submit proposal');
  }
};
