export interface User {
  id: string;  // UUID
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  register: (email: string) => Promise<void>;
  verifyOtp: (name: string, email: string, otp: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, resetCode: string, newPassword: string) => Promise<void>;
}

export interface OtpResponse {
  msg: string;
}

export interface VerifyOtpResponse {
  msg: string;
}

export interface PasswordResetResponse {
  msg: string;
}




export interface DecodedToken {
  user_id: string;
  email: string;
  auth_type: string;
  exp: number;
}
