import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Heart, ArrowLeft, User, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  userType: 'senior' | 'youth';
  dateOfBirth: string;
  location: string;
  interests: string[];
  skills: string[];
}

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const interestOptions = [
    'Cooking', 'Gardening', 'Crafts', 'Music', 'Art', 'Technology',
    'Sports', 'Reading', 'Writing', 'Photography', 'Volunteering',
    'Teaching', 'Mentoring', 'Community Service'
  ];

  const skillOptions = [
    'Cooking', 'Gardening', 'Woodworking', 'Sewing', 'Music', 'Art',
    'Technology', 'Teaching', 'Mentoring', 'Communication', 'Leadership',
    'Problem Solving', 'Creativity', 'Patience', 'Organization'
  ];

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const userData = {
        ...data,
        interests: selectedInterests,
        skills: selectedSkills,
      };
      
      await registerUser(userData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8">
            <ArrowLeft className="h-6 w-6 mr-2" />
            <span className="text-elderly-lg font-medium">Back to Home</span>
          </Link>
          
          <div className="flex justify-center mb-8">
            <div className="bg-primary-100 p-4 rounded-full">
              <Heart className="h-12 w-12 text-primary-600" />
            </div>
          </div>
          
          <h1 className="text-elderly-2xl font-bold text-gray-900 mb-4">
            Join Our Community
          </h1>
          <p className="text-elderly-lg text-gray-600">
            Connect with others and start your learning journey
          </p>
        </div>

        {/* Registration Form */}
        <div className="card card-large">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* User Type Selection */}
            <div>
              <label className="block text-elderly-lg font-semibold text-gray-700 mb-6">
                I am a:
              </label>
              <div className="grid md:grid-cols-2 gap-6">
                <label className="relative cursor-pointer">
                  <input
                    {...register('userType', { required: 'Please select your role' })}
                    type="radio"
                    value="senior"
                    className="sr-only"
                  />
                  <div className="card border-2 border-gray-200 hover:border-primary-500 transition-colors duration-200 p-8 text-center">
                    <User className="h-16 w-16 text-primary-600 mx-auto mb-4" />
                    <h3 className="text-elderly-xl font-bold text-gray-900 mb-2">Senior</h3>
                    <p className="text-elderly-base text-gray-600">
                      Share your wisdom and mentor young people
                    </p>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input
                    {...register('userType', { required: 'Please select your role' })}
                    type="radio"
                    value="youth"
                    className="sr-only"
                  />
                  <div className="card border-2 border-gray-200 hover:border-primary-500 transition-colors duration-200 p-8 text-center">
                    <GraduationCap className="h-16 w-16 text-secondary-600 mx-auto mb-4" />
                    <h3 className="text-elderly-xl font-bold text-gray-900 mb-2">Youth</h3>
                    <p className="text-elderly-base text-gray-600">
                      Learn from experienced mentors and give back
                    </p>
                  </div>
                </label>
              </div>
              {errors.userType && (
                <p className="mt-2 text-elderly-base text-error-600">
                  {errors.userType.message}
                </p>
              )}
            </div>

            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="firstName" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  First Name
                </label>
                <input
                  {...register('firstName', { required: 'First name is required' })}
                  type="text"
                  id="firstName"
                  className="input-primary input-large w-full"
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Last Name
                </label>
                <input
                  {...register('lastName', { required: 'Last name is required' })}
                  type="text"
                  id="lastName"
                  className="input-primary input-large w-full"
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email and Password */}
            <div>
              <label htmlFor="email" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                Email Address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address',
                  },
                })}
                type="email"
                id="email"
                className="input-primary input-large w-full"
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-2 text-elderly-base text-error-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="password" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="input-primary input-large w-full pr-16"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-target"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value => value === password || 'Passwords do not match',
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className="input-primary input-large w-full pr-16"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-target"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="dateOfBirth" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Date of Birth
                </label>
                <input
                  {...register('dateOfBirth', { required: 'Date of birth is required' })}
                  type="date"
                  id="dateOfBirth"
                  className="input-primary input-large w-full"
                />
                {errors.dateOfBirth && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.dateOfBirth.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="location" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                  Location
                </label>
                <input
                  {...register('location', { required: 'Location is required' })}
                  type="text"
                  id="location"
                  className="input-primary input-large w-full"
                  placeholder="City, State"
                />
                {errors.location && (
                  <p className="mt-2 text-elderly-base text-error-600">
                    {errors.location.message}
                  </p>
                )}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-elderly-lg font-semibold text-gray-700 mb-4">
                What are you interested in? (Select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {interestOptions.map((interest) => (
                  <label key={interest} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedInterests.includes(interest)}
                      onChange={() => handleInterestToggle(interest)}
                      className="h-6 w-6 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-elderly-base text-gray-700">
                      {interest}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-elderly-lg font-semibold text-gray-700 mb-4">
                What skills do you have or want to learn? (Select all that apply)
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary btn-large w-full touch-target-large disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-elderly-base text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
