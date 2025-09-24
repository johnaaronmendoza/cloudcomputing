import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Heart, 
  BookOpen, 
  Users, 
  TrendingUp, 
  Clock,
  Star,
  ArrowRight,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Active Tasks',
      value: '12',
      change: '+2 this week',
      changeType: 'positive',
      icon: BookOpen,
    },
    {
      name: 'Connections Made',
      value: '8',
      change: '+3 this month',
      changeType: 'positive',
      icon: Heart,
    },
    {
      name: 'Skills Shared',
      value: '15',
      change: '+5 this month',
      changeType: 'positive',
      icon: TrendingUp,
    },
    {
      name: 'Hours Volunteered',
      value: '24',
      change: '+8 this month',
      changeType: 'positive',
      icon: Clock,
    },
  ];

  const recentTasks = [
    {
      id: 1,
      title: 'Learn Traditional Cooking',
      description: 'Join Maria for a hands-on cooking class',
      type: 'learning',
      status: 'active',
      date: '2024-01-15',
      mentor: 'Maria Rodriguez',
    },
    {
      id: 2,
      title: 'Garden Maintenance Help',
      description: 'Help maintain the community garden',
      type: 'volunteering',
      status: 'pending',
      date: '2024-01-18',
      mentor: 'John Smith',
    },
    {
      id: 3,
      title: 'Digital Skills Workshop',
      description: 'Learn basic computer skills',
      type: 'learning',
      status: 'completed',
      date: '2024-01-10',
      mentor: 'Sarah Johnson',
    },
  ];

  const recommendations = [
    {
      id: 1,
      title: 'Woodworking Basics',
      description: 'Learn traditional woodworking techniques',
      mentor: 'Robert Chen',
      rating: 4.9,
      distance: '2 miles away',
    },
    {
      id: 2,
      title: 'Photography Workshop',
      description: 'Capture beautiful moments with your camera',
      mentor: 'Emma Wilson',
      rating: 4.8,
      distance: '5 miles away',
    },
    {
      id: 3,
      title: 'Community Garden',
      description: 'Help grow fresh vegetables for the community',
      mentor: 'Green Thumb Society',
      rating: 4.7,
      distance: '1 mile away',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-100 text-success-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'completed':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'learning':
        return 'bg-secondary-100 text-secondary-800';
      case 'volunteering':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-8 text-white">
        <h1 className="text-elderly-2xl font-bold mb-4">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-elderly-lg text-primary-100 mb-6">
          Ready to continue your learning journey? Here's what's happening in your community.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/tasks/create"
            className="bg-white text-primary-600 hover:bg-primary-50 font-semibold py-4 px-8 rounded-xl text-elderly-lg transition-all duration-200 shadow-medium hover:shadow-large transform hover:scale-105 touch-target-large inline-flex items-center justify-center"
          >
            <Plus className="h-6 w-6 mr-2" />
            Create New Task
          </Link>
          <Link
            to="/matching"
            className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-xl text-elderly-lg transition-all duration-200 touch-target-large inline-flex items-center justify-center"
          >
            <Heart className="h-6 w-6 mr-2" />
            Find Matches
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className="bg-primary-100 p-3 rounded-xl">
                  <Icon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-elderly-base text-gray-600">{stat.name}</p>
                  <p className="text-elderly-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <p className={`mt-4 text-elderly-base ${
                stat.changeType === 'positive' ? 'text-success-600' : 'text-gray-600'
              }`}>
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="card card-large">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-elderly-xl font-bold text-gray-900">Recent Tasks</h2>
            <Link
              to="/tasks"
              className="text-primary-600 hover:text-primary-700 font-medium text-elderly-lg flex items-center"
            >
              View All
              <ArrowRight className="h-5 w-5 ml-1" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-soft transition-shadow duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-elderly-lg font-semibold text-gray-900">{task.title}</h3>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-elderly-sm font-medium ${getTypeColor(task.type)}`}>
                      {task.type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-elderly-sm font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
                <p className="text-elderly-base text-gray-600 mb-3">{task.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-elderly-base text-gray-500">
                    <Users className="h-5 w-5 mr-2" />
                    {task.mentor}
                  </div>
                  <div className="flex items-center text-elderly-base text-gray-500">
                    <Calendar className="h-5 w-5 mr-2" />
                    {task.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="card card-large">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-elderly-xl font-bold text-gray-900">Recommended for You</h2>
            <Link
              to="/matching"
              className="text-primary-600 hover:text-primary-700 font-medium text-elderly-lg flex items-center"
            >
              View All
              <ArrowRight className="h-5 w-5 ml-1" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-soft transition-shadow duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-elderly-lg font-semibold text-gray-900">{rec.title}</h3>
                  <div className="flex items-center text-warning-500">
                    <Star className="h-5 w-5 mr-1" />
                    <span className="text-elderly-base font-medium">{rec.rating}</span>
                  </div>
                </div>
                <p className="text-elderly-base text-gray-600 mb-3">{rec.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-elderly-base text-gray-500">
                    <Users className="h-5 w-5 mr-2" />
                    {rec.mentor}
                  </div>
                  <div className="text-elderly-base text-gray-500">
                    {rec.distance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card card-large">
        <h2 className="text-elderly-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/tasks/create"
            className="card hover:shadow-medium transition-all duration-200 transform hover:scale-105 text-center group"
          >
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors duration-200">
              <Plus className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-elderly-lg font-semibold text-gray-900 mb-2">Create Task</h3>
            <p className="text-elderly-base text-gray-600">Share your skills or request help</p>
          </Link>
          
          <Link
            to="/content"
            className="card hover:shadow-medium transition-all duration-200 transform hover:scale-105 text-center group"
          >
            <div className="bg-secondary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary-200 transition-colors duration-200">
              <BookOpen className="h-8 w-8 text-secondary-600" />
            </div>
            <h3 className="text-elderly-lg font-semibold text-gray-900 mb-2">Content Library</h3>
            <p className="text-elderly-base text-gray-600">Browse educational materials</p>
          </Link>
          
          <Link
            to="/matching"
            className="card hover:shadow-medium transition-all duration-200 transform hover:scale-105 text-center group"
          >
            <div className="bg-warning-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-warning-200 transition-colors duration-200">
              <Heart className="h-8 w-8 text-warning-600" />
            </div>
            <h3 className="text-elderly-lg font-semibold text-gray-900 mb-2">Find Matches</h3>
            <p className="text-elderly-base text-gray-600">Discover learning opportunities</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
