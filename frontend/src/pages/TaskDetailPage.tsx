import React from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Users, Star, Heart, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TaskDetailPage: React.FC = () => {
  const { id } = useParams();

  // Mock data - in real app, fetch from API
  const task = {
    id: id,
    title: 'Learn Traditional Italian Cooking',
    description: 'Join Maria for a hands-on cooking class where you\'ll learn authentic Italian recipes passed down through generations. We\'ll make fresh pasta, traditional sauces, and classic Italian desserts.',
    category: 'Cooking',
    type: 'Learning',
    location: 'Downtown Community Center',
    address: '123 Main Street, Downtown',
    date: '2024-01-20',
    time: '2:00 PM - 4:00 PM',
    duration: '2 hours',
    mentor: {
      name: 'Maria Rodriguez',
      rating: 4.9,
      experience: '15 years',
      bio: 'Maria has been cooking traditional Italian dishes for over 15 years, learning from her grandmother in Sicily.',
      avatar: null,
    },
    applicants: 8,
    maxApplicants: 12,
    skills: ['Cooking', 'Italian Cuisine', 'Traditional Methods', 'Pasta Making'],
    requirements: 'No prior cooking experience needed. All ingredients and equipment provided.',
    isApplied: false,
    images: [],
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back Button */}
      <Link
        to="/tasks"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <ArrowLeft className="h-6 w-6 mr-2" />
        <span className="text-elderly-lg font-medium">Back to Tasks</span>
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Task Header */}
          <div className="card card-large">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-elderly-2xl font-bold text-gray-900 mb-4">{task.title}</h1>
                <div className="flex items-center space-x-4 mb-4">
                  <span className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-elderly-base font-medium">
                    {task.type}
                  </span>
                  <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-elderly-base font-medium">
                    {task.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center text-warning-500">
                <Star className="h-6 w-6 mr-1" />
                <span className="text-elderly-lg font-semibold">{task.mentor.rating}</span>
              </div>
            </div>

            <p className="text-elderly-lg text-gray-600 mb-8">{task.description}</p>

            {/* Task Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-center text-elderly-base text-gray-600">
                <MapPin className="h-6 w-6 mr-3 text-primary-600" />
                <div>
                  <p className="font-semibold text-gray-900">{task.location}</p>
                  <p className="text-gray-500">{task.address}</p>
                </div>
              </div>
              <div className="flex items-center text-elderly-base text-gray-600">
                <Calendar className="h-6 w-6 mr-3 text-primary-600" />
                <div>
                  <p className="font-semibold text-gray-900">{task.date}</p>
                  <p className="text-gray-500">{task.time}</p>
                </div>
              </div>
              <div className="flex items-center text-elderly-base text-gray-600">
                <Clock className="h-6 w-6 mr-3 text-primary-600" />
                <span className="font-semibold text-gray-900">{task.duration}</span>
              </div>
              <div className="flex items-center text-elderly-base text-gray-600">
                <Users className="h-6 w-6 mr-3 text-primary-600" />
                <span className="font-semibold text-gray-900">
                  {task.applicants}/{task.maxApplicants} participants
                </span>
              </div>
            </div>

            {/* Skills */}
            <div className="mb-8">
              <h3 className="text-elderly-lg font-semibold text-gray-900 mb-4">Skills You'll Learn:</h3>
              <div className="flex flex-wrap gap-3">
                {task.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-4 py-2 bg-primary-100 text-primary-800 rounded-lg text-elderly-base font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h3 className="text-elderly-lg font-semibold text-gray-900 mb-4">Requirements:</h3>
              <p className="text-elderly-base text-gray-600">{task.requirements}</p>
            </div>
          </div>

          {/* Mentor Information */}
          <div className="card card-large">
            <h3 className="text-elderly-xl font-bold text-gray-900 mb-6">Meet Your Mentor</h3>
            <div className="flex items-start space-x-6">
              <div className="bg-primary-100 p-4 rounded-full">
                <Heart className="h-12 w-12 text-primary-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-elderly-lg font-bold text-gray-900 mb-2">{task.mentor.name}</h4>
                <div className="flex items-center mb-3">
                  <Star className="h-5 w-5 text-warning-500 mr-1" />
                  <span className="text-elderly-base font-semibold text-gray-900 mr-4">
                    {task.mentor.rating}
                  </span>
                  <span className="text-elderly-base text-gray-600">
                    {task.mentor.experience} experience
                  </span>
                </div>
                <p className="text-elderly-base text-gray-600">{task.mentor.bio}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Card */}
          <div className="card card-large">
            <h3 className="text-elderly-lg font-semibold text-gray-900 mb-4">Join This Task</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-elderly-base text-gray-600">Available Spots:</span>
                <span className="text-elderly-base font-semibold text-gray-900">
                  {task.maxApplicants - task.applicants} remaining
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-elderly-base text-gray-600">Duration:</span>
                <span className="text-elderly-base font-semibold text-gray-900">{task.duration}</span>
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

          {/* Share Card */}
          <div className="card">
            <h3 className="text-elderly-lg font-semibold text-gray-900 mb-4">Share This Task</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center text-elderly-base text-gray-700 hover:text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                Share via Email
              </button>
              <button className="w-full flex items-center justify-center text-elderly-base text-gray-700 hover:text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                Share on Social Media
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
