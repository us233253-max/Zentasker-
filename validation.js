const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  next();
};

// Registration schema
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('client', 'freelancer').default('client'),
});

// Login schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Profile update schema
const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  bio: Joi.string().max(500),
  location: Joi.string().max(100),
  timezone: Joi.string(),
  phone: Joi.string(),
  website: Joi.string().uri(),
  company: Joi.string(),
  title: Joi.string(),
});

// Gig schema
const gigSchema = Joi.object({
  title: Joi.string().min(10).max(100).required(),
  description: Joi.string().min(50).max(5000).required(),
  category: Joi.string().required(),
  subcategory: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).min(3).max(10).required(),
  packages: Joi.object({
    basic: Joi.object({
      title: Joi.string(),
      description: Joi.string().required(),
      price: Joi.number().min(5).required(),
      deliveryDays: Joi.number().min(1).required(),
      revisions: Joi.number().min(0),
      features: Joi.array().items(Joi.string()),
    }).required(),
    standard: Joi.object({
      title: Joi.string(),
      description: Joi.string().required(),
      price: Joi.number().min(5).required(),
      deliveryDays: Joi.number().min(1).required(),
      revisions: Joi.number().min(0),
      features: Joi.array().items(Joi.string()),
    }).required(),
    premium: Joi.object({
      title: Joi.string(),
      description: Joi.string().required(),
      price: Joi.number().min(5).required(),
      deliveryDays: Joi.number().min(1).required(),
      revisions: Joi.number().min(0),
      features: Joi.array().items(Joi.string()),
    }).required(),
  }).required(),
  faqs: Joi.array().items(
    Joi.object({
      question: Joi.string().required(),
      answer: Joi.string().required(),
    })
  ),
  requirements: Joi.array().items(
    Joi.object({
      question: Joi.string().required(),
      required: Joi.boolean(),
    })
  ),
});

// Job schema
const jobSchema = Joi.object({
  title: Joi.string().min(10).max(100).required(),
  description: Joi.string().min(50).max(5000).required(),
  category: Joi.string().required(),
  subcategory: Joi.string(),
  budget: Joi.object({
    type: Joi.string().valid('fixed', 'hourly').required(),
    amount: Joi.number().min(1).required(),
    currency: Joi.string().default('USD'),
  }).required(),
  skillsRequired: Joi.array().items(Joi.string()).min(1).required(),
  experienceLevel: Joi.string().valid('entry', 'intermediate', 'expert'),
  projectLength: Joi.string(),
  deadline: Joi.date(),
  isUrgent: Joi.boolean(),
});

// Proposal schema
const proposalSchema = Joi.object({
  jobId: Joi.string().required(),
  coverLetter: Joi.string().min(50).max(3000).required(),
  bidAmount: Joi.number().min(1).required(),
  deliveryDays: Joi.number().min(1).required(),
  questions: Joi.array().items(
    Joi.object({
      question: Joi.string(),
      answer: Joi.string().required(),
    })
  ),
});

// Review schema
const reviewSchema = Joi.object({
  orderId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(1000).required(),
  categories: Joi.object({
    communication: Joi.number().min(1).max(5),
    quality: Joi.number().min(1).max(5),
    value: Joi.number().min(1).max(5),
    delivery: Joi.number().min(1).max(5),
  }),
});

// Message schema
const messageSchema = Joi.object({
  conversationId: Joi.string().required(),
  content: Joi.string().min(1).max(2000).required(),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string(),
      url: Joi.string().uri(),
      type: Joi.string(),
    })
  ),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  gigSchema,
  jobSchema,
  proposalSchema,
  reviewSchema,
  messageSchema,
};
