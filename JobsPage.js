import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobAPI } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';

const JobsPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    experienceLevel: '',
    budgetType: '',
    sortBy: 'newest',
  });

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'graphics-design', label: 'Graphics & Design' },
    { value: 'digital-marketing', label: 'Digital Marketing' },
    { value: 'writing-translation', label: 'Writing & Translation' },
    { value: 'video-animation', label: 'Video & Animation' },
    { value: 'music-audio', label: 'Music & Audio' },
    { value: 'programming-tech', label: 'Programming & Tech' },
    { value: 'business', label: 'Business' },
    { value: 'data', label: 'Data' },
  ];

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data } = await jobAPI.getAll(filters);
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBudgetDisplay = (job) => {
    if (job.budget?.type === 'hourly') {
      return `$${job.budget.amount}/hr`;
    }
    return `$${job.budget.amount}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Find Your Next Project</h1>
              <p className="text-primary-200">Browse jobs and submit proposals</p>
            </div>
            {isAuthenticated && user.role === 'client' && (
              <Link to="/create-job" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
                Post a Job
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Category</h3>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="input-base"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Experience Level</h3>
              <select
                value={filters.experienceLevel}
                onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                className="input-base"
              >
                <option value="">Any Level</option>
                <option value="entry">Entry Level</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Budget Type</h3>
              <select
                value={filters.budgetType}
                onChange={(e) => setFilters({ ...filters, budgetType: e.target.value })}
                className="input-base"
              >
                <option value="">Any Budget</option>
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Sort By</h3>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="input-base"
              >
                <option value="newest">Newest First</option>
                <option value="budget-high">Highest Budget</option>
                <option value="budget-low">Lowest Budget</option>
                <option value="proposals">Most Proposals</option>
              </select>
            </div>
          </aside>

          {/* Jobs List */}
          <main className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Link
                    key={job._id}
                    to={`/jobs/${job._id}`}
                    className="card p-6 hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge badge-primary">{job.category?.replace('-', ' ')}</span>
                          {job.isUrgent && <span className="badge badge-danger">Urgent</span>}
                          {job.status === 'open' && <span className="badge badge-success">Open</span>}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{job.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            💰 {getBudgetDisplay(job)}
                          </span>
                          <span className="flex items-center gap-1">
                            📊 {job.experienceLevel}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {job.proposalsCount || 0} proposals
                          </span>
                          <span className="flex items-center gap-1">
                            🕐 {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <button className="btn-outline text-sm py-2 px-4">
                          View Details
                        </button>
                      </div>
                    </div>
                    {job.skillsRequired?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skillsRequired.slice(0, 5).map((skill, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
