import axios from 'axios';
import { AuthResponse, OtpResponse, VerifyOtpResponse, PasswordResetResponse, User } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // We only need to attach this for methods that change data
    const unsafeMethods = ['post', 'put', 'patch', 'delete'];
    
    if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
      config.headers['X-CSRF-Token'] = 'DataPulse-Secure-Client-v1'; 
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
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
 const response = await api.get('/auth/session-check'); 
 
 return response.data;

 },

 async logout(): Promise<void> {
 await api.post('/auth/logout');
 },
  
};