import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'admin': return '/admin/dashboard';
      case 'freelancer': return '/freelancer/dashboard';
      case 'client': return '/client/dashboard';
      default: return '/dashboard';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">Z</span>
              </div>
              <span className="text-xl font-bold gradient-text">Zentasker</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/gigs" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Find Gigs
            </Link>
            <Link to="/jobs" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Find Jobs
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/messages" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                  Messages
                </Link>
                <Link to="/orders" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                  Orders
                </Link>
              </>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()} className="btn-outline">
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-gray-700 font-medium">{user.name}</span>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 animate-fadeIn">
                        <Link
                          to={`/profile/${user._id}`}
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          My Profile
                        </Link>
                        <Link
                          to="/settings"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <hr className="my-2 border-gray-100" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-danger-600 hover:bg-danger-50 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-primary"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fadeIn">
          <div className="px-4 py-4 space-y-4">
            <Link to="/gigs" className="block text-gray-600 hover:text-primary-600 font-medium">
              Find Gigs
            </Link>
            <Link to="/jobs" className="block text-gray-600 hover:text-primary-600 font-medium">
              Find Jobs
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/messages" className="block text-gray-600 hover:text-primary-600 font-medium">
                  Messages
                </Link>
                <Link to={getDashboardLink()} className="block text-gray-600 hover:text-primary-600 font-medium">
                  Dashboard
                </Link>
                <Link to={`/profile/${user._id}`} className="block text-gray-600 hover:text-primary-600 font-medium">
                  Profile
                </Link>
                <Link to="/settings" className="block text-gray-600 hover:text-primary-600 font-medium">
                  Settings
                </Link>
                <button onClick={handleLogout} className="block w-full text-left text-danger-600 font-medium">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-600 font-medium">
                  Login
                </button>
                <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="btn-primary w-full">
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
