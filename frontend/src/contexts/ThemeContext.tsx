import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'high-contrast';
  setTheme: (theme: 'light' | 'dark' | 'high-contrast') => void;
  fontSize: 'normal' | 'large' | 'extra-large';
  setFontSize: (size: 'normal' | 'large' | 'extra-large') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'high-contrast'>('light');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('large');

  useEffect(() => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'high-contrast' | null;
    const savedFontSize = localStorage.getItem('fontSize') as 'normal' | 'large' | 'extra-large' | null;
    
    if (savedTheme) setTheme(savedTheme);
    if (savedFontSize) setFontSize(savedFontSize);
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
    
    // Save preferences
    localStorage.setItem('theme', theme);
    localStorage.setItem('fontSize', fontSize);
    
    // Apply CSS classes
    document.body.className = `${theme} ${fontSize}`;
  }, [theme, fontSize]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    fontSize,
    setFontSize,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
