import axios from 'axios';
import { AuthResponse, OtpResponse, VerifyOtpResponse, PasswordResetResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.error(
    'VITE_API_BASE_URL is not defined in your .env file! Please set it to http://localhost:8000'
  );
}

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('datapulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('datapulse_token');
      localStorage.removeItem('datapulse_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Google OAuth Login
  async googleLogin(googleToken: string): Promise<AuthResponse> {
    const response = await api.post('/auth/google', { token: googleToken });
    return response.data;
  },

  // Email/Password Login
  async emailLogin(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login-email', { email, password });
    return response.data;
  },

  // Send OTP for registration
  async sendOtp(email: string): Promise<OtpResponse> {
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
  },

  // Verify OTP and set password
  async verifyOtp(name: string, email: string, otp: string, password: string): Promise<VerifyOtpResponse> {
    const response = await api.post('/auth/verify-otp', { name, email, otp, password });
    return response.data;
  },

  // Send password reset code
  async sendPasswordReset(email: string): Promise<PasswordResetResponse> {
    const response = await api.post('/auth/send-password-reset', { email });
    return response.data;
  },

  // Reset password with code
  async resetPassword(email: string, resetCode: string, newPassword: string): Promise<PasswordResetResponse> {
    const response = await api.post('/auth/reset-password', { email, reset_code: resetCode, new_password: newPassword });
    return response.data;
  },

  // Verify token (you might want to add this endpoint to your backend)
  async verifyToken(token: string): Promise<boolean> {
    try {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      // You could add a /auth/verify endpoint to your backend
      return true;
    } catch {
      return false;
    }
  }
};