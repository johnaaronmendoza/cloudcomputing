import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import CreateTaskPage from './pages/CreateTaskPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ProfilePage from './pages/ProfilePage';
import ContentLibraryPage from './pages/ContentLibraryPage';
import MatchingPage from './pages/MatchingPage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/tasks" element={
                  <ProtectedRoute>
                    <Layout>
                      <TasksPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/tasks/create" element={
                  <ProtectedRoute>
                    <Layout>
                      <CreateTaskPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/tasks/:id" element={
                  <ProtectedRoute>
                    <Layout>
                      <TaskDetailPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/content" element={
                  <ProtectedRoute>
                    <Layout>
                      <ContentLibraryPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/matching" element={
                  <ProtectedRoute>
                    <Layout>
                      <MatchingPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              
              {/* Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#374151',
                    fontSize: '1.125rem',
                    padding: '1rem 1.5rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
