import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, jobAPI, paymentAPI } from '../utils/api';

const ClientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedOrders: 0,
    jobsPosted: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersRes, jobsRes] = await Promise.all([
        orderAPI.getAll({ role: 'client' }),
        jobAPI.getByClient(user._id),
      ]);

      const orders = ordersRes.data?.orders || [];
      const jobs = jobsRes.data?.jobs || [];

      setStats({
        activeOrders: orders.filter(o => o.status === 'active').length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        jobsPosted: jobs.length,
        totalSpent: user.totalSpent || 0,
      });

      setRecentOrders(orders.slice(0, 5));
      setRecentJobs(jobs.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Active Orders', value: stats.activeOrders, icon: '📦', color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completedOrders, icon: '✅', color: 'bg-success-500' },
    { label: 'Jobs Posted', value: stats.jobsPosted, icon: '📋', color: 'bg-warning-500' },
    { label: 'Total Spent', value: `$${stats.totalSpent}`, icon: '💰', color: 'bg-primary-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome back, {user.name}!</h1>
              <p className="text-primary-200 mt-1">Here's what's happening with your projects</p>
            </div>
            <Link to="/create-job" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
              Post a New Job
            </Link>
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
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
                  <p className="text-gray-600">No orders yet</p>
                  <Link to="/gigs" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                    Browse Gigs
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
                          <p className="text-sm text-gray-500">with {order.freelancerId?.name || 'Freelancer'}</p>
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

          {/* Recent Jobs */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Posted Jobs</h2>
                <Link to="/jobs" className="text-sm text-primary-600 hover:text-primary-700">
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner"></div>
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-600">No jobs posted yet</p>
                  <Link to="/create-job" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                    Post Your First Job
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div key={job._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 hover:text-primary-600 cursor-pointer">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>${job.budget?.amount} {job.budget?.type === 'hourly' ? '/hr' : ''}</span>
                          <span>•</span>
                          <span>{job.proposalsCount || 0} proposals</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        job.status === 'open' ? 'bg-success-50 text-success-600' :
                        job.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {job.status}
                      </span>
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

export default ClientDashboard;
