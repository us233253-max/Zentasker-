import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, aiAPI } from '../utils/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, insightsRes, reviewsRes, usersRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        aiAPI.getAIInsights(),
        adminAPI.getFlaggedReviews(),
        adminAPI.getAllUsers({ limit: 10 }),
      ]);

      setStats(statsRes.data.data);
      setAiInsights(insightsRes.data.data);
      setFlaggedReviews(reviewsRes.data.data || []);
      setRecentUsers(usersRes.data.data?.users || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">ADMIN</span>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              </div>
              <p className="text-gray-400">Full platform control and analytics</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'users', label: '👥 Users', icon: '👥' },
            { id: 'gigs', label: '🎯 Gigs', icon: '🎯' },
            { id: 'jobs', label: '📋 Jobs', icon: '📋' },
            { id: 'orders', label: '📦 Orders', icon: '📦' },
            { id: 'financial', label: '💰 Financial', icon: '💰' },
            { id: 'reviews', label: '⭐ Reviews', icon: '⭐' },
            { id: 'ai-tools', label: '🤖 AI Tools', icon: '🤖' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.users?.total || 0}</p>
                    <p className="text-xs text-success-600 mt-1">
                      +{stats.users?.newThisMonth || 0} this month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-2xl">
                    👥
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Total Gigs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.gigs?.total || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.gigs?.active || 0} active
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-warning-500 rounded-xl flex items-center justify-center text-2xl">
                    🎯
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.orders?.total || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {stats.orders?.active || 0} active
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl">
                    📦
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Revenue (Month)</p>
                    <p className="text-2xl font-bold text-gray-900">${stats.financial?.monthlyRevenue || 0}</p>
                    <p className="text-xs text-success-600 mt-1">
                      Total: ${stats.financial?.totalRevenue || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-success-500 rounded-xl flex items-center justify-center text-2xl">
                    💰
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {aiInsights && (
              <div className="card mb-6 overflow-hidden ai-glow">
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      🤖
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">AI Platform Insights</h2>
                      <p className="text-primary-200 text-sm">Intelligent analysis and recommendations</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{aiInsights.summary}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="text-success-500">📈</span> Opportunities
                      </h3>
                      <ul className="space-y-2">
                        {aiInsights.opportunities?.map((opp, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-success-500 mt-1">•</span>
                            {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="text-danger-500">⚠️</span> Risks
                      </h3>
                      <ul className="space-y-2">
                        {aiInsights.risks?.map((risk, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-danger-500 mt-1">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Recent Users */}
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Recent Users</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {recentUsers.slice(0, 5).map((user) => (
                      <div key={user._id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {user.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.role} • {user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flagged Reviews */}
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Flagged Reviews</h3>
                </div>
                <div className="p-4">
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">⚠️</div>
                    <p className="text-2xl font-bold text-gray-900">{flaggedReviews.length}</p>
                    <p className="text-sm text-gray-500">Reviews need attention</p>
                  </div>
                </div>
              </div>

              {/* Disputes */}
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Open Disputes</h3>
                </div>
                <div className="p-4">
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">⚖️</div>
                    <p className="text-2xl font-bold text-gray-900">{stats.disputes?.open || 0}</p>
                    <p className="text-sm text-gray-500">Disputes need resolution</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="input-base w-64"
                  />
                  <select className="input-base">
                    <option value="">All Roles</option>
                    <option value="client">Clients</option>
                    <option value="freelancer">Freelancers</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-medium">
                            {user.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'freelancer' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.isBanned && <span className="badge badge-danger">Banned</span>}
                          {user.isVerified ? <span className="badge badge-success">Verified</span> : <span className="badge badge-warning">Unverified</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span>⭐</span>
                          <span className="font-medium">{user.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="text-sm text-primary-600 hover:text-primary-700">Edit</button>
                          <button className="text-sm text-danger-600 hover:text-danger-700">Ban</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Tools Tab */}
        {activeTab === 'ai-tools' && (
          <div className="space-y-6">
            <div className="card">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Moderation Tools</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <button className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all text-left">
                    <div className="text-2xl mb-2">🔍</div>
                    <h3 className="font-medium text-gray-900">Detect Fake Reviews</h3>
                    <p className="text-sm text-gray-500 mt-1">Analyze reviews for spam patterns</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all text-left">
                    <div className="text-2xl mb-2">👤</div>
                    <h3 className="font-medium text-gray-900">User Behavior Analysis</h3>
                    <p className="text-sm text-gray-500 mt-1">Identify suspicious accounts</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all text-left">
                    <div className="text-2xl mb-2">💳</div>
                    <h3 className="font-medium text-gray-900">Fraud Detection</h3>
                    <p className="text-sm text-gray-500 mt-1">Detect fraudulent transactions</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Operations</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                    <div>
                      <h3 className="font-medium text-gray-900">Analyze All Flagged Reviews</h3>
                      <p className="text-sm text-gray-500">Run AI analysis on all flagged reviews</p>
                    </div>
                    <button className="btn-primary">Run Analysis</button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                    <div>
                      <h3 className="font-medium text-gray-900">User Risk Assessment</h3>
                      <p className="text-sm text-gray-500">Generate risk scores for all users</p>
                    </div>
                    <button className="btn-primary">Generate Report</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {['gigs', 'jobs', 'orders', 'financial', 'reviews'].includes(activeTab) && (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
            </h3>
            <p className="text-gray-600">Full management interface coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
