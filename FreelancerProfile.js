const mongoose = require('mongoose');

const freelancerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hourlyRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    availability: {
      type: String,
      enum: ['available', 'unavailable', 'busy'],
      default: 'available',
    },
    responseTime: {
      type: String,
      default: 'within 24 hours',
    },
    portfolio: [
      {
        title: String,
        description: String,
        image: String,
        url: String,
        completedAt: Date,
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        url: String,
        issuedAt: Date,
      },
    ],
    experience: [
      {
        title: String,
        company: String,
        location: String,
        description: String,
        startDate: Date,
        endDate: Date,
        current: Boolean,
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        field: String,
        graduationYear: Number,
      },
    ],
    languages: [
      {
        name: String,
        proficiency: {
          type: String,
          enum: ['basic', 'conversational', 'fluent', 'native'],
        },
      },
    ],
    tests: [
      {
        name: String,
        score: Number,
        percentile: Number,
        takenAt: Date,
      },
    ],
    videoIntroduction: String,
    overview: String,
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FreelancerProfile', freelancerProfileSchema);
