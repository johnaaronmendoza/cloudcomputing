import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Users, 
  Star,
  Heart,
  BookOpen,
  Calendar
} from 'lucide-react';

const TasksPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const categories = [
    'All Categories',
    'Cooking',
    'Gardening',
    'Technology',
    'Arts & Crafts',
    'Music',
    'Sports',
    'Volunteering',
    'Education'
  ];

  const types = [
    'All Types',
    'Learning',
    'Volunteering',
    'Mentoring',
    'Community Service'
  ];

  const tasks = [
    {
      id: 1,
      title: 'Learn Traditional Italian Cooking',
      description: 'Join Maria for a hands-on cooking class where you\'ll learn authentic Italian recipes passed down through generations.',
      category: 'Cooking',
      type: 'Learning',
      location: 'Downtown Community Center',
      date: '2024-01-20',
      time: '2:00 PM - 4:00 PM',
      mentor: 'Maria Rodriguez',
      rating: 4.9,
      applicants: 8,
      maxApplicants: 12,
      skills: ['Cooking', 'Italian Cuisine', 'Traditional Methods'],
      isApplied: false,
    },
    {
      id: 2,
      title: 'Community Garden Maintenance',
      description: 'Help maintain our beautiful community garden. Learn about sustainable gardening practices while giving back to the community.',
      category: 'Gardening',
      type: 'Volunteering',
      location: 'Riverside Community Garden',
      date: '2024-01-22',
      time: '9:00 AM - 12:00 PM',
      mentor: 'Green Thumb Society',
      rating: 4.8,
      applicants: 15,
      maxApplicants: 20,
      skills: ['Gardening', 'Sustainability', 'Community Service'],
      isApplied: true,
    },
    {
      id: 3,
      title: 'Digital Skills Workshop',
      description: 'Learn essential computer skills including email, internet browsing, and online safety. Perfect for beginners.',
      category: 'Technology',
      type: 'Learning',
      location: 'Public Library',
      date: '2024-01-25',
      time: '10:00 AM - 12:00 PM',
      mentor: 'Tech Savvy Seniors',
      rating: 4.7,
      applicants: 6,
      maxApplicants: 10,
      skills: ['Computer Basics', 'Internet Safety', 'Email'],
      isApplied: false,
    },
    {
      id: 4,
      title: 'Woodworking Basics',
      description: 'Learn traditional woodworking techniques from master craftsman Robert. Create your own small project to take home.',
      category: 'Arts & Crafts',
      type: 'Learning',
      location: 'Community Workshop',
      date: '2024-01-28',
      time: '1:00 PM - 5:00 PM',
      mentor: 'Robert Chen',
      rating: 4.9,
      applicants: 4,
      maxApplicants: 8,
      skills: ['Woodworking', 'Craftsmanship', 'Tools'],
      isApplied: false,
    },
  ];

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    const matchesType = selectedType === 'all' || task.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Learning':
        return 'bg-primary-100 text-primary-800';
      case 'Volunteering':
        return 'bg-success-100 text-success-800';
      case 'Mentoring':
        return 'bg-warning-100 text-warning-800';
      case 'Community Service':
        return 'bg-secondary-100 text-secondary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-elderly-2xl font-bold text-gray-900 mb-2">Available Tasks</h1>
          <p className="text-elderly-lg text-gray-600">
            Discover learning opportunities and volunteer activities in your community
          </p>
        </div>
        <Link
          to="/tasks/create"
          className="btn-primary btn-large touch-target-large mt-4 lg:mt-0 inline-flex items-center justify-center"
        >
          <Plus className="h-6 w-6 mr-2" />
          Create New Task
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card card-large">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search */}
          <div>
            <label className="block text-elderly-lg font-semibold text-gray-700 mb-3">
              Search Tasks
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for tasks..."
                className="input-primary input-large w-full pl-12"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-elderly-lg font-semibold text-gray-700 mb-3">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-primary input-large w-full"
            >
              {categories.map((category) => (
                <option key={category} value={category === 'All Categories' ? 'all' : category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-elderly-lg font-semibold text-gray-700 mb-3">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input-primary input-large w-full"
            >
              {types.map((type) => (
                <option key={type} value={type === 'All Types' ? 'all' : type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="card card-large hover:shadow-large transition-all duration-200">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-elderly-xl font-bold text-gray-900 mb-2">{task.title}</h3>
                    <p className="text-elderly-lg text-gray-600 mb-4">{task.description}</p>
                  </div>
                  <div className="flex items-center text-warning-500 ml-4">
                    <Star className="h-6 w-6 mr-1" />
                    <span className="text-elderly-lg font-semibold">{task.rating}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                  <span className={`px-4 py-2 rounded-full text-elderly-base font-medium ${getTypeColor(task.type)}`}>
                    {task.type}
                  </span>
                  <span className="px-4 py-2 rounded-full text-elderly-base font-medium bg-gray-100 text-gray-800">
                    {task.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center text-elderly-base text-gray-600">
                    <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                    {task.location}
                  </div>
                  <div className="flex items-center text-elderly-base text-gray-600">
                    <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                    {task.date}
                  </div>
                  <div className="flex items-center text-elderly-base text-gray-600">
                    <Clock className="h-5 w-5 mr-2 text-primary-600" />
                    {task.time}
                  </div>
                  <div className="flex items-center text-elderly-base text-gray-600">
                    <Users className="h-5 w-5 mr-2 text-primary-600" />
                    {task.applicants}/{task.maxApplicants} people
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-elderly-lg font-semibold text-gray-900 mb-3">Skills You'll Learn:</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-primary-100 text-primary-800 rounded-lg text-elderly-base"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center text-elderly-base text-gray-600">
                  <Heart className="h-5 w-5 mr-2 text-primary-600" />
                  <span className="font-medium">Mentor:</span>
                  <span className="ml-2">{task.mentor}</span>
                </div>
              </div>

              <div className="mt-6 lg:mt-0 lg:ml-8 lg:w-80">
                <div className="card bg-gray-50 p-6">
                  <h4 className="text-elderly-lg font-semibold text-gray-900 mb-4">Task Details</h4>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-elderly-base text-gray-600">Available Spots:</span>
                      <span className="text-elderly-base font-semibold text-gray-900">
                        {task.maxApplicants - task.applicants} remaining
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-elderly-base text-gray-600">Duration:</span>
                      <span className="text-elderly-base font-semibold text-gray-900">2-4 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-elderly-base text-gray-600">Difficulty:</span>
                      <span className="text-elderly-base font-semibold text-gray-900">Beginner</span>
                    </div>
                  </div>

                  {task.isApplied ? (
                    <button
                      disabled
                      className="w-full bg-success-100 text-success-800 font-semibold py-4 px-6 rounded-xl text-elderly-lg touch-target-large"
                    >
                      ✓ Applied
                    </button>
                  ) : (
                    <button className="btn-primary btn-large w-full touch-target-large">
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredTasks.length === 0 && (
        <div className="card card-large text-center py-16">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-elderly-xl font-semibold text-gray-900 mb-4">No tasks found</h3>
          <p className="text-elderly-lg text-gray-600 mb-8">
            Try adjusting your search criteria or create a new task.
          </p>
          <Link
            to="/tasks/create"
            className="btn-primary btn-large touch-target-large"
          >
            Create New Task
          </Link>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
