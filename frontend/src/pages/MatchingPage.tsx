import React, { useState } from 'react';
import { Heart, Star, MapPin, Clock, Users, Filter, Search } from 'lucide-react';

const MatchingPage: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState({
    distance: 'all',
    skills: [] as string[],
    availability: 'all',
  });

  const skillOptions = [
    'Cooking', 'Gardening', 'Technology', 'Arts & Crafts', 'Music',
    'Sports', 'Volunteering', 'Teaching', 'Mentoring'
  ];

  const matches = [
    {
      id: 1,
      name: 'Maria Rodriguez',
      age: 65,
      location: 'Downtown',
      distance: '2 miles',
      skills: ['Cooking', 'Italian Cuisine', 'Teaching'],
      availability: 'Weekends',
      rating: 4.9,
      bio: 'Passionate about sharing traditional Italian cooking techniques. 15 years of experience teaching others.',
      interests: ['Cooking', 'Gardening', 'Community Service'],
      avatar: null,
      compatibility: 95,
    },
    {
      id: 2,
      name: 'Robert Chen',
      age: 58,
      location: 'Riverside',
      distance: '3 miles',
      skills: ['Woodworking', 'Craftsmanship', 'Teaching'],
      availability: 'Weekdays',
      rating: 4.8,
      bio: 'Master craftsman with 20 years of woodworking experience. Loves teaching traditional techniques.',
      interests: ['Arts & Crafts', 'Teaching', 'Community Service'],
      avatar: null,
      compatibility: 88,
    },
    {
      id: 3,
      name: 'Sarah Johnson',
      age: 62,
      location: 'Westside',
      distance: '1 mile',
      skills: ['Technology', 'Digital Skills', 'Teaching'],
      availability: 'Flexible',
      rating: 4.7,
      bio: 'Tech-savvy senior helping others learn digital skills. Patient and encouraging teacher.',
      interests: ['Technology', 'Education', 'Community Service'],
      avatar: null,
      compatibility: 92,
    },
  ];

  const handleSkillToggle = (skill: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-elderly-2xl font-bold text-gray-900 mb-4">Find Your Perfect Match</h1>
        <p className="text-elderly-lg text-gray-600">
          Discover mentors and learning partners based on your interests and skills
        </p>
      </div>

      {/* Filters */}
      <div className="card card-large">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-elderly-xl font-bold text-gray-900">Filters</h2>
          <button className="text-primary-600 hover:text-primary-700 font-medium text-elderly-base">
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distance Filter */}
          <div>
            <label className="block text-elderly-lg font-semibold text-gray-700 mb-3">
              Distance
            </label>
            <select
              value={selectedFilters.distance}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, distance: e.target.value }))}
              className="input-primary input-large w-full"
            >
              <option value="all">Any Distance</option>
              <option value="1">Within 1 mile</option>
              <option value="5">Within 5 miles</option>
              <option value="10">Within 10 miles</option>
              <option value="25">Within 25 miles</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-elderly-lg font-semibold text-gray-700 mb-3">
              Availability
            </label>
            <select
              value={selectedFilters.availability}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, availability: e.target.value }))}
              className="input-primary input-large w-full"
            >
              <option value="all">Any Time</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          {/* Skills Filter */}
          <div>
            <label className="block text-elderly-lg font-semibold text-gray-700 mb-3">
              Skills
            </label>
            <div className="max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {skillOptions.map((skill) => (
                  <label key={skill} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFilters.skills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-elderly-base text-gray-700">{skill}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-elderly-xl font-bold text-gray-900">
            Recommended Matches ({matches.length})
          </h2>
          <div className="flex items-center space-x-4">
            <button className="text-primary-600 hover:text-primary-700 font-medium text-elderly-base">
              Sort by Compatibility
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          {matches.map((match) => (
            <div key={match.id} className="card card-large hover:shadow-large transition-all duration-200">
              <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
                <div className="flex-shrink-0 mb-6 lg:mb-0">
                  <div className="bg-primary-100 p-6 rounded-full w-24 h-24 flex items-center justify-center">
                    <Heart className="h-12 w-12 text-primary-600" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-elderly-xl font-bold text-gray-900 mb-2">{match.name}</h3>
                      <div className="flex items-center space-x-4 text-elderly-base text-gray-600">
                        <span>Age {match.age}</span>
                        <span>•</span>
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 mr-1" />
                          {match.location} ({match.distance})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-warning-500 mb-2">
                        <Star className="h-5 w-5 mr-1" />
                        <span className="text-elderly-lg font-semibold">{match.rating}</span>
                      </div>
                      <div className="text-elderly-base text-gray-600">
                        {match.compatibility}% match
                      </div>
                    </div>
                  </div>

                  <p className="text-elderly-base text-gray-600 mb-4">{match.bio}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center text-elderly-base text-gray-600">
                      <Clock className="h-5 w-5 mr-2 text-primary-600" />
                      Available: {match.availability}
                    </div>
                    <div className="flex items-center text-elderly-base text-gray-600">
                      <Users className="h-5 w-5 mr-2 text-primary-600" />
                      {match.skills.length} skills
                    </div>
                    <div className="text-elderly-base text-gray-600">
                      {match.interests.length} interests
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-elderly-lg font-semibold text-gray-900 mb-3">Skills:</h4>
                    <div className="flex flex-wrap gap-2">
                      {match.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-primary-100 text-primary-800 rounded-lg text-elderly-base font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button className="btn-primary btn-large flex-1 touch-target-large">
                      <Heart className="h-6 w-6 mr-2" />
                      Connect
                    </button>
                    <button className="btn-secondary btn-large touch-target-large">
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchingPage;
