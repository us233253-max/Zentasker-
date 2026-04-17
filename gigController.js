const { supabase } = require('../config/supabase');
const { formatResponse, handleError, getPagination } = require('../utils/helpers');

// @desc    Get all gigs with filtering, sorting, pagination
// @route   GET /api/gigs
// @access  Public
exports.getGigs = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      page = 1,
      limit = 20,
    } = req.query;

    let query = supabase
      .from('gigs')
      .select(`
        *,
        seller:users!gigs_seller_id_fkey (
          id,
          name,
          avatar_url,
          rating,
          reviews_count
        )
      `)
      .eq('is_active', true);

    // Apply filters
    if (category) query = query.eq('category', category);
    if (minPrice) query = query.gte('packages->basic->price', minPrice);
    if (maxPrice) query = query.lte('packages->basic->price', maxPrice);

    // Apply sorting
    const order = sortBy === 'price_low' ? 'asc' : 'desc';
    const sortColumn = sortBy === 'price_low' || sortBy === 'price_high'
      ? 'packages->basic->price'
      : sortBy === 'rating' ? 'rating' : 'created_at';

    query = query.order(sortColumn, { ascending: order === 'asc' });

    // Pagination
    const { start, end } = getPagination(page, limit);
    query = query.range(start, end);

    const { data: gigs, error } = await query;

    if (error) throw error;

    // Get total count
    const { count } = await supabase
      .from('gigs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.json(formatResponse({
      gigs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    }));
  } catch (error) {
    handleError(res, error, 'Failed to fetch gigs');
  }
};

// @desc    Get single gig by ID
// @route   GET /api/gigs/:id
// @access  Public
exports.getGigById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: gig, error } = await supabase
      .from('gigs')
      .select(`
        *,
        seller:users!gigs_seller_id_fkey (
          id,
          name,
          avatar_url,
          rating,
          reviews_count,
          bio,
          skills
        )
      `)
      .eq('id', id)
      .single();

    if (error || !gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    // Get related gigs
    const { data: relatedGigs } = await supabase
      .from('gigs')
      .select('id, title, images, packages, rating, reviews_count')
      .eq('seller_id', gig.seller_id)
      .neq('id', id)
      .eq('is_active', true)
      .limit(4);

    res.json(formatResponse({ gig, relatedGigs: relatedGigs || [] }));
  } catch (error) {
    handleError(res, error, 'Failed to fetch gig');
  }
};

// @desc    Create new gig
// @route   POST /api/gigs
// @access  Private (freelancer)
exports.createGig = async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ success: false, message: 'Only freelancers can create gigs' });
    }

    const { packages, images, ...gigData } = req.body;

    const gigToInsert = {
      ...gigData,
      seller_id: req.user.id,
      packages: packages || {},
      images: images || [],
    };

    const { data: gig, error } = await supabase
      .from('gigs')
      .insert(gigToInsert)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(formatResponse(gig, 'Gig created successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to create gig');
  }
};

// @desc    Update gig
// @route   PUT /api/gigs/:id
// @access  Private (gig owner)
exports.updateGig = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existingGig } = await supabase
      .from('gigs')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existingGig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    if (existingGig.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { packages, images, ...gigData } = req.body;

    const updateData = {
      ...gigData,
      packages: packages || existingGig.packages,
      images: images || existingGig.images,
      updated_at: new Date().toISOString(),
    };

    const { data: gig, error } = await supabase
      .from('gigs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(formatResponse(gig, 'Gig updated successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to update gig');
  }
};

// @desc    Delete gig
// @route   DELETE /api/gigs/:id
// @access  Private (gig owner or admin)
exports.deleteGig = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: gig } = await supabase
      .from('gigs')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    if (gig.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Soft delete
    await supabase
      .from('gigs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    res.json(formatResponse(null, 'Gig deleted successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to delete gig');
  }
};

// @desc    Get user's gigs
// @route   GET /api/gigs/my-gigs
// @access  Private
exports.getMyGigs = async (req, res) => {
  try {
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select('*')
      .eq('seller_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(formatResponse(gigs || []));
  } catch (error) {
    handleError(res, error, 'Failed to fetch gigs');
  }
};

// @desc    Get featured gigs
// @route   GET /api/gigs/featured
// @access  Public
exports.getFeaturedGigs = async (req, res) => {
  try {
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select(`
        *,
        seller:users!gigs_seller_id_fkey (
          id,
          name,
          avatar_url,
          rating
        )
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('rating', { ascending: false })
      .limit(8);

    if (error) throw error;

    res.json(formatResponse(gigs || []));
  } catch (error) {
    handleError(res, error, 'Failed to fetch featured gigs');
  }
};

// @desc    Create order from gig
// @route   POST /api/gigs/:id/order
// @access  Private (client)
exports.createOrderFromGig = async (req, res) => {
  try {
    const { id } = req.params;
    const { package_type, requirements } = req.body;

    // Get gig details
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('*')
      .eq('id', id)
      .single();

    if (gigError || !gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    if (gig.seller_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot order your own gig' });
    }

    const validPackages = ['basic', 'standard', 'premium'];
    if (!validPackages.includes(package_type)) {
      return res.status(400).json({ success: false, message: 'Invalid package type' });
    }

    const selectedPackage = gig.packages[package_type];
    const platformFee = Math.round(selectedPackage.price * 0.15 * 100) / 100;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        gig_id: id,
        client_id: req.user.id,
        freelancer_id: gig.seller_id,
        amount: selectedPackage.price,
        platform_fee: platformFee,
        package_type,
        requirements: requirements || [],
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Update gig stats
    await supabase
      .from('gigs')
      .update({
        orders_in_queue: (gig.orders_in_queue || 0) + 1,
        total_orders: (gig.total_orders || 0) + 1,
      })
      .eq('id', id);

    res.status(201).json(formatResponse(order, 'Order created successfully'));
  } catch (error) {
    handleError(res, error, 'Failed to create order');
  }
};
