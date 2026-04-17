import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, gigAPI, proposalAPI } from '../utils/api';
import { aiAPI } from '../utils/api';

const FreelancerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedOrders: 0,
    totalEarnings: 0,
    gigsActive: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [myGigs, setMyGigs] = useState([]);
  const [aiMatches, setAiMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAiMatches, setShowAiMatches] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchAiMatches();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersRes, gigsRes] = await Promise.all([
        orderAPI.getAll({ role: 'freelancer' }),
        gigAPI.getBySeller(user._id),
      ]);

      const orders = ordersRes.data?.orders || [];
      const gigs = gigsRes.data?.gigs || [];

      setStats({
        activeOrders: orders.filter(o => o.status === 'active').length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        totalEarnings: user.totalEarnings || 0,
        gigsActive: gigs.filter(g => g.isActive).length,
      });

      setRecentOrders(orders.slice(0, 5));
      setMyGigs(gigs.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiMatches = async () => {
    try {
      const { data } = await aiAPI.findMatchingJobs(10);
      setAiMatches(data.data?.jobs || []);
    } catch (error) {
      console.error('Failed to fetch AI matches:', error);
    }
  };

  const statCards = [
    { label: 'Active Orders', value: stats.activeOrders, icon: '📦', color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completedOrders, icon: '✅', color: 'bg-success-500' },
    { label: 'Total Earnings', value: `$${stats.totalEarnings}`, icon: '💰', color: 'bg-primary-600' },
    { label: 'Active Gigs', value: stats.gigsActive, icon: '🎯', color: 'bg-warning-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome back, {user.name}!</h1>
              <p className="text-primary-200 mt-1">Here's your freelancing overview</p>
            </div>
            <div className="flex gap-3">
              <Link to="/create-gig" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
                Create New Gig
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Job Matches */}
        {aiMatches.length > 0 && (
          <div className="card mb-6 overflow-hidden ai-glow">
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    🤖
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">AI Job Matches for You</h2>
                    <p className="text-primary-200 text-sm">Jobs that match your skills and experience</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiMatches(!showAiMatches)}
                  className="text-white/80 hover:text-white text-sm font-medium"
                >
                  {showAiMatches ? 'Hide' : 'View All'} →
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiMatches.slice(0, showAiMatches ? aiMatches.length : 3).map((job) => (
                  <Link
                    key={job._id}
                    to={`/jobs/${job._id}`}
                    className="p-4 border border-gray-100 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-primary">🤖 AI Match</span>
                      <span className="badge badge-success">{job.category?.replace('-', ' ')}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">{job.title}</h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{job.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-600">
                        ${job.budget?.amount} {job.budget?.type === 'hourly' ? '/hr' : ''}
                      </span>
                      <button className="text-xs btn-outline py-1 px-3">View Job</button>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Active Orders</h2>
                <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-700">
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner"></div>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-gray-600">No active orders</p>
                  <Link to="/jobs" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          📦
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.gigId?.title || 'Order'}</p>
                          <p className="text-sm text-gray-500">from {order.clientId?.name || 'Client'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${order.amount}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'completed' ? 'bg-success-50 text-success-600' :
                          order.status === 'active' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Gigs */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">My Gigs</h2>
                <Link to="/create-gig" className="text-sm text-primary-600 hover:text-primary-700">
                  Create New
                </Link>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner"></div>
                </div>
              ) : myGigs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-gray-600">No gigs created yet</p>
                  <Link to="/create-gig" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                    Create Your First Gig
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {myGigs.map((gig) => (
                    <div key={gig._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                          🎯
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 hover:text-primary-600 cursor-pointer">
                            {gig.title}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>⭐ {gig.rating?.toFixed(1) || 'New'}</span>
                            <span>•</span>
                            <span>{gig.totalOrders || 0} orders</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${gig.packages?.basic?.price || 0}+</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          gig.isActive ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {gig.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelancerDashboard;
