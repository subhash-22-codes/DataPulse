import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { User, AuthContextType, DecodedToken } from '../types/auth';
import { authService } from '../services/api';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// NOTE: The useAuth hook remains here. It's a very common pattern,
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

interface Props {
  children: ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- THIS IS THE FIX for the 'any' type ---
  // We use 'unknown' which is the type-safe version of 'any'.
  const handleError = (error: unknown, defaultMessage: string) => {
    const err = error as AxiosError<{ detail?: string }>;
    if (err.response?.status === 429) {
      toast.error("Too many requests. Please wait a moment and try again.");
    } else {
      toast.error(err.response?.data?.detail || defaultMessage);
    }
    throw err;
  };

  const checkTokenExpiry = (jwt: string): boolean => {
    try {
      const decoded: DecodedToken = jwtDecode(jwt);
      return Date.now() < decoded.exp * 1000;
    } catch {
      return false;
    }
  };

  const saveAuth = (jwt: string, userData: User) => {
    setToken(jwt);
    setUser(userData);
    localStorage.setItem('datapulse_token', jwt);
    localStorage.setItem('datapulse_user', JSON.stringify(userData));
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('datapulse_token');
    localStorage.removeItem('datapulse_user');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('datapulse_token');
    const storedUser = localStorage.getItem('datapulse_user');
    if (storedToken && storedUser && checkTokenExpiry(storedToken)) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else {
      clearAuth();
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authService.emailLogin(email, password);
      saveAuth(res.token, res.user);
    } catch (error) {
      handleError(error, "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (googleToken: string) => {
    setLoading(true);
    try {
      const res = await authService.googleLogin(googleToken);
      saveAuth(res.token, res.user);
    } catch (error) {
      handleError(error, "Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string) => {
    setLoading(true);
    try {
      await authService.sendOtp(email);
    } catch (error) {
      handleError(error, "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (name: string, email: string, otp: string, password: string) => {
    setLoading(true);
    try {
      await authService.verifyOtp(name, email, otp, password);
    } catch (error) {
      handleError(error, "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };
  
  const sendPasswordReset = async (email: string) => {
    setLoading(true);
    try {
      await authService.sendPasswordReset(email);
    } catch (error) {
      handleError(error, "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    setLoading(true);
    try {
      await authService.resetPassword(email, otp, newPassword);
    } catch (error) {
      handleError(error, "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => clearAuth();

  const value: AuthContextType = { user, token, login, googleLogin, register, verifyOtp, sendPasswordReset, resetPassword, logout, loading, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};