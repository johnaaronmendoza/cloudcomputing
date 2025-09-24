import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Heart, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
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
            Welcome Back
          </h1>
          <p className="text-elderly-lg text-gray-600">
            Sign in to continue your learning journey
          </p>
        </div>

        {/* Login Form */}
        <div className="card card-large">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Email Field */}
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
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-2 text-elderly-base text-error-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-elderly-lg font-semibold text-gray-700 mb-3">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="input-primary input-large w-full pr-16"
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-6 w-6 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-3 text-elderly-base text-gray-700">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-elderly-base text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary btn-large w-full touch-target-large disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-elderly-base text-gray-500">
                  Don't have an account?
                </span>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <Link
              to="/register"
              className="btn-secondary btn-large w-full touch-target-large"
            >
              Create New Account
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-elderly-base text-gray-600">
            Need help?{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
