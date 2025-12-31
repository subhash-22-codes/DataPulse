import axios from 'axios';
import { AuthResponse, OtpResponse, VerifyOtpResponse, PasswordResetResponse, User } from '../types/auth';

// 1. Point to the PROXY. 
// Vercel/Vite will forward this to the real backend.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- NO REQUEST INTERCEPTOR NEEDED ---
// The browser attaches cookies automatically.


// --- RESPONSE INTERCEPTOR (The "Silent Refresh" Logic) ---
type FailedQueueItem = {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
};

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue();
        return api(originalRequest);
      } catch (err) {
        processQueue(err);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
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
    // Note: The Backend now sets the cookies. We just get a success message.
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

  async checkSession(): Promise<{ user: User }> {
 // Use the new dedicated GET endpoint for a cleaner read operation.
 const response = await api.get('/auth/session-check'); 
 
 // Return the data, which we expect to be { user: {...} } from the backend.
 return response.data;
 
 // If this call fails (401), Axios will throw an error, 
 // which the AuthContext will catch to set the state to logged out.
 },

 // 🔑 CORE FIX 2: Logout function stops forcing a full page reload
 async logout(): Promise<void> {
 await api.post('/auth/logout');// 🚨 REMOVED: window.location.href = '/login';  // The navigation is now handled by the AuthContext for a smoother transition.
 },
  
};