import React from 'react';
import { User, Edit, Heart, BookOpen, Clock, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Tasks Completed', value: '12', icon: BookOpen },
    { label: 'Hours Volunteered', value: '48', icon: Clock },
    { label: 'Connections Made', value: '8', icon: Heart },
    { label: 'Average Rating', value: '4.9', icon: Star },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-elderly-2xl font-bold text-gray-900 mb-4">My Profile</h1>
        <p className="text-elderly-lg text-gray-600">
          Manage your profile and view your activity
        </p>
      </div>

      {/* Profile Card */}
      <div className="card card-large">
        <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
          <div className="flex-shrink-0 mb-6 lg:mb-0">
            <div className="bg-primary-100 p-8 rounded-full w-32 h-32 flex items-center justify-center">
              <User className="h-16 w-16 text-primary-600" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-elderly-xl font-bold text-gray-900 mb-2">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-elderly-lg text-gray-600 capitalize mb-4">
                  {user?.userType} • {user?.location}
                </p>
                <div className="flex items-center text-warning-500">
                  <Star className="h-6 w-6 mr-1" />
                  <span className="text-elderly-lg font-semibold">4.9</span>
                  <span className="text-elderly-base text-gray-600 ml-2">(24 reviews)</span>
                </div>
              </div>
              <button className="btn-secondary touch-target">
                <Edit className="h-5 w-5 mr-2" />
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-elderly-lg font-semibold text-gray-900 mb-3">About Me</h3>
                <p className="text-elderly-base text-gray-600">
                  Passionate about sharing knowledge and learning from others. 
                  I believe in the power of intergenerational connections to build stronger communities.
                </p>
              </div>
              
              <div>
                <h3 className="text-elderly-lg font-semibold text-gray-900 mb-3">Contact</h3>
                <p className="text-elderly-base text-gray-600 mb-2">{user?.email}</p>
                <p className="text-elderly-base text-gray-600">{user?.location}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card text-center">
              <div className="bg-primary-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Icon className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-elderly-xl font-bold text-gray-900 mb-2">{stat.value}</h3>
              <p className="text-elderly-base text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Skills and Interests */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card card-large">
          <h3 className="text-elderly-xl font-bold text-gray-900 mb-6">My Skills</h3>
          <div className="flex flex-wrap gap-3">
            {user?.skills?.map((skill) => (
              <span
                key={skill}
                className="px-4 py-2 bg-primary-100 text-primary-800 rounded-lg text-elderly-base font-medium"
              >
                {skill}
              </span>
            )) || (
              <p className="text-elderly-base text-gray-600">No skills added yet</p>
            )}
          </div>
        </div>

        <div className="card card-large">
          <h3 className="text-elderly-xl font-bold text-gray-900 mb-6">My Interests</h3>
          <div className="flex flex-wrap gap-3">
            {user?.interests?.map((interest) => (
              <span
                key={interest}
                className="px-4 py-2 bg-secondary-100 text-secondary-800 rounded-lg text-elderly-base font-medium"
              >
                {interest}
              </span>
            )) || (
              <p className="text-elderly-base text-gray-600">No interests added yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
