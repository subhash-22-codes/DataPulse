export interface User {
  id: string;  // UUID
  email: string;
  name: string;
}

// UPDATE: Matches new backend response
export interface AuthResponse {
  message: string; // e.g., "Login successful"
  user: User;
  // token: string; <--- REMOVED. 
}

export interface AuthContextType {
    user: User | null;
    token: string | null; 
    
    login: (email: string, password: string) => Promise<AuthResponse>;
    loginSuccess: boolean;

    // FIX THIS LINE: Must return AuthResponse
    googleLogin: (googleToken: string) => Promise<AuthResponse>; 
    
    register: (email: string) => Promise<boolean>;
    verifyOtp: (name: string, email: string, otp: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    isAuthenticated: boolean;
    sendPasswordReset: (email: string) => Promise<boolean>;
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