import React, { useState } from 'react';
import { Search, Filter, Play, Download, Heart, BookOpen, Video, Image } from 'lucide-react';

const ContentLibraryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    'All Categories',
    'Cooking',
    'Gardening',
    'Technology',
    'Arts & Crafts',
    'Music',
    'Health & Wellness'
  ];

  const content = [
    {
      id: 1,
      title: 'Traditional Italian Pasta Making',
      description: 'Learn the art of making fresh pasta from scratch with traditional techniques.',
      type: 'video',
      category: 'Cooking',
      duration: '45 min',
      author: 'Maria Rodriguez',
      rating: 4.9,
      views: 1240,
      thumbnail: null,
    },
    {
      id: 2,
      title: 'Garden Planning Guide',
      description: 'A comprehensive guide to planning and maintaining your garden throughout the seasons.',
      type: 'document',
      category: 'Gardening',
      duration: '30 min read',
      author: 'Green Thumb Society',
      rating: 4.8,
      views: 890,
      thumbnail: null,
    },
    {
      id: 3,
      title: 'Digital Photography Basics',
      description: 'Master the fundamentals of digital photography and composition.',
      type: 'video',
      category: 'Arts & Crafts',
      duration: '60 min',
      author: 'Emma Wilson',
      rating: 4.7,
      views: 1560,
      thumbnail: null,
    },
    {
      id: 4,
      title: 'Healthy Cooking Recipes',
      description: 'A collection of nutritious and delicious recipes for everyday cooking.',
      type: 'document',
      category: 'Cooking',
      duration: '20 min read',
      author: 'Health First',
      rating: 4.6,
      views: 2100,
      thumbnail: null,
    },
  ];

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="h-6 w-6" />;
      case 'document':
        return <BookOpen className="h-6 w-6" />;
      case 'image':
        return <Image className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-primary-100 text-primary-800';
      case 'document':
        return 'bg-secondary-100 text-secondary-800';
      case 'image':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-elderly-2xl font-bold text-gray-900 mb-4">Content Library</h1>
        <p className="text-elderly-lg text-gray-600">
          Discover educational content and resources shared by our community
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card card-large">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search */}
          <div>
            <label className="block text-elderly-lg font-semibold text-gray-700 mb-3">
              Search Content
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for content..."
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
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <div key={item.id} className="card hover:shadow-large transition-all duration-200">
            <div className="aspect-video bg-gray-100 rounded-xl mb-4 flex items-center justify-center">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="text-gray-400">
                  {getTypeIcon(item.type)}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-elderly-lg font-bold text-gray-900 line-clamp-2">{item.title}</h3>
                <span className={`px-3 py-1 rounded-full text-elderly-sm font-medium ${getTypeColor(item.type)}`}>
                  {item.type}
                </span>
              </div>

              <p className="text-elderly-base text-gray-600 line-clamp-2">{item.description}</p>

              <div className="flex items-center justify-between text-elderly-base text-gray-500">
                <span>{item.author}</span>
                <span>{item.duration}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-warning-500">
                  <Heart className="h-5 w-5 mr-1" />
                  <span className="text-elderly-base font-semibold">{item.rating}</span>
                </div>
                <span className="text-elderly-base text-gray-500">{item.views} views</span>
              </div>

              <div className="flex space-x-3">
                <button className="btn-primary flex-1 touch-target">
                  <Play className="h-5 w-5 mr-2" />
                  View
                </button>
                <button className="btn-secondary touch-target">
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredContent.length === 0 && (
        <div className="card card-large text-center py-16">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-elderly-xl font-semibold text-gray-900 mb-4">No content found</h3>
          <p className="text-elderly-lg text-gray-600">
            Try adjusting your search criteria or check back later for new content.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentLibraryPage;
