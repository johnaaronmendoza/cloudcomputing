import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-elderly-3xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-elderly-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-elderly-lg text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/"
            className="btn-primary btn-large w-full touch-target-large inline-flex items-center justify-center"
          >
            <Home className="h-6 w-6 mr-2" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="btn-secondary btn-large w-full touch-target-large inline-flex items-center justify-center"
          >
            <ArrowLeft className="h-6 w-6 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
