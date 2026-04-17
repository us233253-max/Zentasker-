import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const categories = [
    { name: 'Graphics & Design', icon: '🎨', count: '2.5K+ gigs' },
    { name: 'Digital Marketing', icon: '📈', count: '1.8K+ gigs' },
    { name: 'Writing & Translation', icon: '✍️', count: '3.2K+ gigs' },
    { name: 'Video & Animation', icon: '🎬', count: '1.5K+ gigs' },
    { name: 'Music & Audio', icon: '🎵', count: '900+ gigs' },
    { name: 'Programming & Tech', icon: '💻', count: '4.1K+ gigs' },
    { name: 'Business', icon: '💼', count: '1.2K+ gigs' },
    { name: 'Data', icon: '📊', count: '800+ gigs' },
  ];

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Matching',
      description: 'Our advanced AI matches you with the perfect jobs or freelancers based on skills, experience, and preferences.',
    },
    {
      icon: '✍️',
      title: 'Smart Proposal Generator',
      description: 'Generate professional, personalized proposals in seconds with our AI writing assistant.',
    },
    {
      icon: '💬',
      title: 'AI Gig Creator',
      description: 'Transform your ideas into complete, professional gigs with AI-generated descriptions and pricing.',
    },
    {
      icon: '🛡️',
      title: 'Secure Payments',
      description: 'Escrow-based payment protection ensures freelancers get paid and clients receive quality work.',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Active Freelancers' },
    { value: '25K+', label: 'Happy Clients' },
    { value: '100K+', label: 'Projects Completed' },
    { value: '$10M+', label: 'Payments Processed' },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full text-primary-200 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></span>
              AI-Powered Freelancing Marketplace
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Find Perfect Talent or
              <span className="block gradient-text bg-gradient-to-r from-primary-300 via-white to-primary-300 bg-clip-text text-transparent">
                Amazing Opportunities
              </span>
            </h1>

            <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
              Connect with skilled freelancers or discover your next project.
              Powered by advanced AI for smarter matching and better outcomes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => navigate('/register')} className="btn-primary w-full sm:w-auto text-lg px-8 py-4">
                    Get Started Free
                  </button>
                  <button onClick={() => navigate('/gigs')} className="btn-secondary w-full sm:w-auto text-lg px-8 py-4 bg-white/10 text-white border-white/30 hover:bg-white/20">
                    Browse Gigs
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/create-job')} className="btn-primary w-full sm:w-auto text-lg px-8 py-4">
                    Post a Job
                  </button>
                  <button onClick={() => navigate('/create-gig')} className="btn-secondary w-full sm:w-auto text-lg px-8 py-4 bg-white/10 text-white border-white/30 hover:bg-white/20">
                    Create a Gig
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-gray-600">Find the perfect service for your needs</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category, index) => (
              <Link
                key={index}
                to={`/gigs?category=${category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                className="card p-6 hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.count}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Zentasker?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform makes freelancing easier, faster, and more effective for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-lg transition-all duration-200">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            Join thousands of freelancers and clients already using Zentasker
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="btn-primary w-full sm:w-auto bg-white text-primary-600 hover:bg-gray-100">
              Create Free Account
            </button>
            <Link to="/gigs" className="btn-secondary w-full sm:w-auto bg-transparent text-white border-white hover:bg-white/10">
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
