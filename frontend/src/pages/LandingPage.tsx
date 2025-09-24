import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, BookOpen, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Heart className="h-12 w-12 text-primary-600" />
              <span className="ml-3 text-elderly-2xl font-bold text-gray-900">
                Skills Platform
              </span>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="btn-secondary touch-target"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary touch-target"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-elderly-3xl font-bold text-gray-900 mb-8 leading-tight">
            Connecting Generations Through
            <span className="text-primary-600 block">Shared Learning</span>
          </h1>
          <p className="text-elderly-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            A platform where seniors share their wisdom and youths bring fresh perspectives. 
            Together, we build stronger communities through intergenerational learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/register"
              className="btn-primary btn-large touch-target-large"
            >
              Start Learning Today
              <ArrowRight className="ml-3 h-8 w-8" />
            </Link>
            <Link
              to="/login"
              className="btn-secondary btn-large touch-target-large"
            >
              I Already Have an Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-elderly-2xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-elderly-lg text-gray-600 max-w-2xl mx-auto">
              Simple, safe, and designed for all ages
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* For Seniors */}
            <div className="card card-large text-center">
              <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8">
                <Users className="h-10 w-10 text-primary-600" />
              </div>
              <h3 className="text-elderly-xl font-bold text-gray-900 mb-6">
                For Seniors
              </h3>
              <ul className="text-elderly-base text-gray-600 space-y-4 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Share your life experiences and skills
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Mentor young people in your community
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Create meaningful connections
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Leave a lasting legacy
                </li>
              </ul>
            </div>

            {/* For Youths */}
            <div className="card card-large text-center">
              <div className="bg-secondary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8">
                <BookOpen className="h-10 w-10 text-secondary-600" />
              </div>
              <h3 className="text-elderly-xl font-bold text-gray-900 mb-6">
                For Youths
              </h3>
              <ul className="text-elderly-base text-gray-600 space-y-4 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Learn from experienced mentors
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Develop new skills and interests
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Give back to your community
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Build meaningful relationships
                </li>
              </ul>
            </div>

            {/* Platform Features */}
            <div className="card card-large text-center">
              <div className="bg-warning-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8">
                <Sparkles className="h-10 w-10 text-warning-600" />
              </div>
              <h3 className="text-elderly-xl font-bold text-gray-900 mb-6">
                Smart Matching
              </h3>
              <ul className="text-elderly-base text-gray-600 space-y-4 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  AI-powered skill matching
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Safe and secure platform
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Easy-to-use interface
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success-500 mr-3 mt-1 flex-shrink-0" />
                  Community support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-elderly-2xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-elderly-lg text-primary-100 mb-12">
            Join thousands of seniors and youths already connecting and learning together.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/register"
              className="bg-white text-primary-600 hover:bg-primary-50 font-semibold py-6 px-12 rounded-2xl text-elderly-xl transition-all duration-200 shadow-large hover:shadow-xl transform hover:scale-105 touch-target-large"
            >
              Create Your Account
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-6 px-12 rounded-2xl text-elderly-xl transition-all duration-200 touch-target-large"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-6">
                <Heart className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-elderly-lg font-bold">Skills Platform</span>
              </div>
              <p className="text-elderly-base text-gray-300">
                Connecting generations through shared learning and meaningful experiences.
              </p>
            </div>
            <div>
              <h3 className="text-elderly-lg font-semibold mb-4">For Seniors</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Share Skills</a></li>
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Mentor Youth</a></li>
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Create Content</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-elderly-lg font-semibold mb-4">For Youths</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Learn Skills</a></li>
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Find Mentors</a></li>
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Volunteer</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-elderly-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Help Center</a></li>
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Contact Us</a></li>
                <li><a href="#" className="text-elderly-base text-gray-300 hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-elderly-base text-gray-400">
              © 2024 Skills Platform. Building bridges between generations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
