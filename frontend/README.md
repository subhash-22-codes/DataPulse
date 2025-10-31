# DataPulse Frontend

A React frontend application for DataPulse with comprehensive authentication including Google OAuth and email/OTP verification.

## 🚀 Features

- ✅ **Google OAuth Authentication** - One-click sign-in with Google
- ✅ **Email/OTP Registration** - Secure email verification with OTP
- ✅ **Email/Password Login** - Traditional login system
- ✅ **JWT Token Management** - Automatic token handling and refresh
- ✅ **Protected Routes** - Route-level authentication
- ✅ **Responsive Design** - Mobile-first responsive UI
- ✅ **Loading States** - Smooth loading indicators
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Modern UI** - Clean design with Tailwind CSS

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:

```env
VITE_GOOGLE_CLIENT_ID=your_actual_google_client_id
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add authorized origins:
   - `http://localhost:5173` (for development)
   - Your production domain
6. Copy the Client ID to your `.env` file

### 4. Backend Integration
Ensure your FastAPI backend is running with these endpoints:
- `POST /auth/google` - Google OAuth authentication
- `POST /auth/send-otp` - Send OTP for email registration
- `POST /auth/verify-otp` - Verify OTP and set password
- `POST /auth/login-email` - Email/password login

### 5. Run the Application
```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── components/          # Reusable components
│   ├── GoogleLoginButton.tsx
│   └── ProtectedRoute.tsx
├── context/            # React context providers
│   └── AuthContext.tsx
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   └── Home.tsx
├── services/           # API services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── auth.ts
└── App.tsx             # Main app component
```

## 🔐 Authentication Flow

### Google OAuth Flow
1. User clicks "Sign in with Google"
2. Google OAuth popup handles authentication
3. Google returns JWT token to frontend
4. Frontend sends token to `/auth/google` endpoint
5. Backend validates and returns DataPulse JWT
6. Frontend stores JWT and redirects to dashboard

### Email Registration Flow
1. User enters email and clicks "Send OTP"
2. Backend sends OTP to email via `/auth/send-otp`
3. User enters OTP and sets password
4. Frontend calls `/auth/verify-otp` to complete registration
5. User can now login with email/password

### Email Login Flow
1. User enters email and password
2. Frontend calls `/auth/login-email`
3. Backend validates credentials and returns JWT
4. Frontend stores JWT and redirects to dashboard

## 🎨 UI Components

### Login Page
- Google OAuth button
- Email/password form
- Responsive design with gradient background
- Loading states and error handling

### Register Page
- Two-step registration process
- OTP verification with email
- Password strength validation
- Google OAuth alternative

### Home Dashboard
- User profile display
- Statistics cards with icons
- Recent activity feed
- Quick action buttons
- Data visualization placeholder

## 🔧 API Integration

The frontend integrates with your FastAPI backend through:

```typescript
// API Service Configuration
const API_BASE_URL = 'http://localhost:8000';

// Automatic JWT token handling
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('datapulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 🚦 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `VITE_API_BASE_URL` | Backend API URL | No (defaults to localhost:8000) |

## 🔒 Security Features

- JWT token automatic refresh
- Protected route components
- Secure token storage
- CORS handling
- Input validation
- Error boundary protection

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: `sm`, `md`, `lg`, `xl`
- Touch-friendly interface
- Optimized for all screen sizes

## 🎯 Production Ready

This frontend is production-ready with:
- TypeScript for type safety
- ESLint for code quality
- Proper error handling
- Loading states
- Responsive design
- Security best practices
- Clean code architecture

## 🤝 Backend Compatibility

Fully compatible with your FastAPI backend featuring:
- Google OAuth integration
- Email/OTP verification system
- JWT authentication
- User management
- Secure password handling

## 📄 License

© 2025 DataPulse. All rights reserved.