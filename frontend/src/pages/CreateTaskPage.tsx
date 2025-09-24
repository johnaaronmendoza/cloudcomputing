import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, Clock, Users, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface TaskFormData {
  title: string;
  description: string;
  category: string;
  type: string;
  location: string;
  date: string;
  time: string;
  maxParticipants: number;
  skills: string[];
  requirements: string;
}

const CreateTaskPage: React.FC = () => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>();

  const categories = [
    'Cooking', 'Gardening', 'Technology', 'Arts & Crafts', 'Music', 
    'Sports', 'Volunteering', 'Education', 'Health & Wellness', 'Other'
  ];

  const types = [
    'Learning', 'Volunteering', 'Mentoring', 'Community Service', 'Workshop'
  ];

  const skillOptions = [
    'Cooking', 'Gardening', 'Woodworking', 'Sewing', 'Music', 'Art',
    'Technology', 'Teaching', 'Mentoring', 'Communication', 'Leadership',
    'Problem Solving', 'Creativity', 'Patience', 'Organization'
  ];

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      const taskData = {
        ...data,
        skills: selectedSkills,
      };
      
      // Here you would call your API to create the task
      console.log('Creating task:', taskData);
      
      toast.success('Task created successfully!');
      navigate('/tasks');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-elderly-2xl font-bold text-gray-900 mb-4">Create New Task</h1>
        <p className="text-elderly-lg text-gray-600">
          Share your skills or create a learning opportunity for others
        </p>
      </div>

      {/* Form */}
      <div className="card card-large">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-elderly-xl font-bold text-gray-900">Basic Information</h2>
            
            <div>
              <label htmlFor="title" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                Task Title *
              </label>
              <input
                {...register('title', { required: 'Title is required' })}
                type="text"
                id="title"
                className="input-primary input-large w-full"
                placeholder="Enter a clear, descriptive title"
              />
              {errors.title && (
                <p className="mt-2 text-elderly-base text-error-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                Description *
              </label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                id="description"
                rows={4}
                className="input-primary input-large w-full"
                placeholder="Describe what participants will learn or do"
              />
              {errors.description && (
                <p className="mt-2 text-elderly-base text-error-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  id="category"
                  className="input-primary input-large w-full"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="type" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Type *
                </label>
                <select
                  {...register('type', { required: 'Type is required' })}
                  id="type"
                  className="input-primary input-large w-full"
                >
                  <option value="">Select a type</option>
                  {types.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.type.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Location and Time */}
          <div className="space-y-6">
            <h2 className="text-elderly-xl font-bold text-gray-900">Location and Time</h2>
            
            <div>
              <label htmlFor="location" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                <input
                  {...register('location', { required: 'Location is required' })}
                  type="text"
                  id="location"
                  className="input-primary input-large w-full pl-12"
                  placeholder="Enter the location or venue"
                />
              </div>
              {errors.location && (
                <p className="mt-2 text-elderly-base text-error-600">
                  {errors.location.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  <input
                    {...register('date', { required: 'Date is required' })}
                    type="date"
                    id="date"
                    className="input-primary input-large w-full pl-12"
                  />
                </div>
                {errors.date && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="time" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  <input
                    {...register('time', { required: 'Time is required' })}
                    type="time"
                    id="time"
                    className="input-primary input-large w-full pl-12"
                  />
                </div>
                {errors.time && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.time.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Participants and Skills */}
          <div className="space-y-6">
            <h2 className="text-elderly-xl font-bold text-gray-900">Participants and Skills</h2>
            
            <div>
              <label htmlFor="maxParticipants" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                Maximum Participants *
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                <input
                  {...register('maxParticipants', { 
                    required: 'Maximum participants is required',
                    min: { value: 1, message: 'Must be at least 1' },
                    max: { value: 50, message: 'Maximum 50 participants' }
                  })}
                  type="number"
                  id="maxParticipants"
                  min="1"
                  max="50"
                  className="input-primary input-large w-full pl-12"
                  placeholder="How many people can join?"
                />
              </div>
              {errors.maxParticipants && (
                <p className="mt-2 text-elderly-base text-error-600">
                  {errors.maxParticipants.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-elderly-lg font-semibold text-gray-700 mb-4">
                Skills Required or Taught *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {skillOptions.map((skill) => (
                  <label key={skill} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      className="h-6 w-6 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-elderly-base text-gray-700">
                      {skill}
                    </span>
                  </label>
                ))}
              </div>
              {selectedSkills.length === 0 && (
                <p className="mt-2 text-elderly-base text-error-600">
                  Please select at least one skill
                </p>
              )}
            </div>

            <div>
              <label htmlFor="requirements" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                Additional Requirements
              </label>
              <textarea
                {...register('requirements')}
                id="requirements"
                rows={3}
                className="input-primary input-large w-full"
                placeholder="Any special requirements or materials needed?"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              className="btn-primary btn-large flex-1 touch-target-large"
            >
              <Plus className="h-6 w-6 mr-2" />
              Create Task
            </button>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="btn-secondary btn-large flex-1 touch-target-large"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskPage;
