import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'senior' | 'youth';
  dateOfBirth: string;
  location: string;
  interests: string[];
  skills: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'senior' | 'youth';
  dateOfBirth: string;
  location: string;
  interests: string[];
  skills: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/api/auth/login', { email, password });
      
      const { user: userData, tokens } = response.data;
      const accessToken = tokens.accessToken;
      
      setUser(userData);
      setToken(accessToken);
      
      // Store in localStorage
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await api.post('/api/auth/register', userData);
      
      const { user: newUser, tokens } = response.data;
      const accessToken = tokens.accessToken;
      
      setUser(newUser);
      setToken(accessToken);
      
      // Store in localStorage
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      const response = await api.put('/api/auth/profile', userData);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Profile update failed');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
