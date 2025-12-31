export interface User {
  id: string;  // UUID
  email: string;
  name: string;
  github_id?: string | null;
  google_id?: string | null;
  signup_method: 'email' | 'google' | 'github';
  created_at: string;
  profile_pic?: string | null;
}

// UPDATE: Matches new backend response
export interface AuthResponse {
  message: string;
  user: User;
}

// 🛡️ Define the phases so they can be reused across the app
export type AuthPhase = "checking" | "resolved" | "unreachable";

export interface AuthContextType {
    user: User | null;
    token?: string | null; // Optional since we are Cookie-based
    
    // Status Gates
    loading: boolean;     
    isAuthenticated: boolean; 
    isAuthResolved: boolean;   
    authPhase: AuthPhase;     
    loginSuccess: boolean;     

    // Auth Actions
    login: (email: string, password: string) => Promise<AuthResponse>;
    googleLogin: (googleToken: string) => Promise<AuthResponse>; 
    register: (email: string) => Promise<boolean>;
    verifyOtp: (name: string, email: string, otp: string, password: string) => Promise<void>;
    logout: () => void;
    
    // Password & Session Management
    sendPasswordReset: (email: string) => Promise<boolean>;
    resetPassword: (email: string, resetCode: string, newPassword: string) => Promise<void>;
    checkSession: () => Promise<User | null>;
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