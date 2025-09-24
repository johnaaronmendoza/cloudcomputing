# Skills Platform Frontend

A modern, accessible React frontend for the Cloud-Native Skills & Micro-Task Platform, specifically designed for elderly users with large buttons, clear typography, and intuitive navigation.

## Features

### 🎯 Elderly-Friendly Design
- **Large, accessible buttons** with touch-friendly targets (60px+ minimum)
- **High contrast colors** for better readability
- **Large fonts** with customizable sizing (Normal, Large, Extra Large)
- **Clear navigation** with intuitive icons and labels
- **Minimalistic design** to reduce cognitive load

### 🎨 Modern UI/UX
- **Responsive design** that works on all devices
- **Smooth animations** and transitions
- **Accessible color schemes** with multiple theme options
- **Clean typography** using Inter font family
- **Consistent spacing** and visual hierarchy

### 🔧 Technical Features
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Hook Form** for form handling
- **Axios** for API communication
- **React Query** for data fetching
- **Framer Motion** for animations
- **Lucide React** for icons

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend services running on localhost:3000

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3001](http://localhost:3001)

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

## Design System

### Color Palette
- **Primary**: Blue tones for main actions
- **Secondary**: Gray tones for secondary elements
- **Success**: Green for positive actions
- **Warning**: Orange for attention
- **Error**: Red for errors

### Typography
- **Font Family**: Inter (system fallback)
- **Base Size**: 16px (larger for accessibility)
- **Elderly Sizes**: 1rem, 1.25rem, 1.5rem, 1.875rem, 2.25rem, 3rem

### Components
- **Buttons**: Large, rounded, with clear states
- **Forms**: Accessible inputs with clear labels
- **Cards**: Soft shadows, rounded corners
- **Navigation**: Large touch targets, clear hierarchy

## Accessibility Features

### For Elderly Users
- **Large touch targets** (minimum 60px)
- **High contrast** color schemes
- **Clear typography** with large fonts
- **Simple navigation** with breadcrumbs
- **Consistent layouts** to reduce confusion

### General Accessibility
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Focus indicators** for all interactive elements
- **ARIA labels** for complex components
- **Color contrast** meets WCAG AA standards

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx       # Main layout wrapper
│   ├── ProtectedRoute.tsx
│   └── ...
├── contexts/            # React contexts
│   ├── AuthContext.tsx # Authentication state
│   └── ThemeContext.tsx # Theme and accessibility
├── pages/              # Page components
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   └── ...
├── services/           # API services
│   └── api.ts
├── App.tsx             # Main app component
├── index.tsx          # App entry point
└── index.css          # Global styles
```

## API Integration

The frontend connects to the backend services through the API Gateway:

- **Authentication**: `/api/auth/*`
- **Tasks**: `/api/tasks/*`
- **Search**: `/api/search/*`
- **Content**: `/api/content/*`
- **Matching**: `/api/matches/*`

## Deployment

### Development
```bash
npm start
```

### Production Build
```bash
npm run build
```

### Docker
```bash
# Build image
docker build -t skills-platform-frontend .

# Run container
docker run -p 3001:3000 skills-platform-frontend
```

## Contributing

1. Follow the existing code style
2. Ensure accessibility standards are met
3. Test with elderly users when possible
4. Use semantic HTML elements
5. Maintain consistent spacing and typography

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is part of the Skills Platform ecosystem.
