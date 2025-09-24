import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Tasks, 
  Plus, 
  User, 
  BookOpen, 
  Heart, 
  LogOut, 
  Menu, 
  X,
  Settings,
  Bell,
  Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Tasks', href: '/tasks', icon: Tasks },
    { name: 'Create Task', href: '/tasks/create', icon: Plus },
    { name: 'Content Library', href: '/content', icon: BookOpen },
    { name: 'Matching', href: '/matching', icon: Heart },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-80 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-elderly-lg font-bold text-gray-900">
                Skills Platform
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="touch-target text-gray-500 hover:text-gray-700"
            >
              <X className="h-8 w-8" />
            </button>
          </div>
          
          <nav className="flex-1 px-6 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-link touch-target-large flex items-center ${
                    isActive(item.href) ? 'nav-link-active' : ''
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-8 w-8 mr-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white shadow-lg">
          <div className="flex h-16 items-center px-6">
            <Heart className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-elderly-lg font-bold text-gray-900">
              Skills Platform
            </span>
          </div>
          
          <nav className="flex-1 px-6 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-link touch-target-large flex items-center ${
                    isActive(item.href) ? 'nav-link-active' : ''
                  }`}
                >
                  <Icon className="h-8 w-8 mr-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="bg-primary-100 p-3 rounded-full">
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-elderly-lg font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-elderly-base text-gray-600 capitalize">
                  {user?.userType}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center text-elderly-lg text-gray-700 hover:text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <LogOut className="h-6 w-6 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-80">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden touch-target text-gray-500 hover:text-gray-700"
              >
                <Menu className="h-8 w-8" />
              </button>
              
              <div className="hidden lg:block">
                <h1 className="text-elderly-xl font-semibold text-gray-900">
                  {navigation.find(item => isActive(item.href))?.name || 'Skills Platform'}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <button className="touch-target text-gray-500 hover:text-gray-700">
                <Search className="h-8 w-8" />
              </button>
              
              {/* Notifications */}
              <button className="touch-target text-gray-500 hover:text-gray-700 relative">
                <Bell className="h-8 w-8" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-error-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">3</span>
                </span>
              </button>

              {/* Settings */}
              <button className="touch-target text-gray-500 hover:text-gray-700">
                <Settings className="h-8 w-8" />
              </button>

              {/* Theme and Font Size Controls */}
              <div className="hidden lg:flex items-center space-x-2">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="text-elderly-base border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="high-contrast">High Contrast</option>
                </select>
                
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="text-elderly-base border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                  <option value="extra-large">Extra Large</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
