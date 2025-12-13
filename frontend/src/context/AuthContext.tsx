import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
    useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
// NOTE: Ensure your AuthContextType (in ../types/auth) includes: 
// loginSuccess: boolean;
import { User, AuthContextType } from "../types/auth"; 
import { authService } from "../services/api";
import { AxiosError } from "axios";
import toast from "react-hot-toast";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

interface Props {
    children: ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    // CRITICAL ADDITION: State to control the temporary success message UI
    const [loginSuccess, setLoginSuccess] = useState(false); 

    // --- Helper Functions ---
    const saveAuth = useCallback((userData: User) => {
        setUser(userData);
        localStorage.setItem("datapulse_user", JSON.stringify(userData));
        setLoginSuccess(true); // Set to true on successful login
    }, [setLoginSuccess]);

    const clearAuth = useCallback(() => {
        setUser(null);
        setToken(null);
        setLoginSuccess(false); // CRITICAL FIX: Reset success state on failure/logout
        localStorage.removeItem("datapulse_user");
    }, [setLoginSuccess]);
    
    const handleError = useCallback((error: unknown, fallbackMsg: string) => {
        const err = error as AxiosError<{ detail?: string }>;

        if (err.response?.status === 429) {
            toast.error("Too many requests. Please try again shortly.");
        } else {
            // Note: The toast is handled here for errors 
            toast.error(err.response?.data?.detail || fallbackMsg);
        }

        if (err.response?.status !== 401) {
            throw err;
        }
    }, []);


    // Flicker Fix: Server-First Initialization
    useEffect(() => {
        const initAuth = async () => {
            try {
                const res = await authService.checkSession();
                saveAuth(res.user);
            } catch {
                clearAuth();
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, [saveAuth, clearAuth]);


    // 🔑 Login function (CENTRALIZED FIX)
    const login = useCallback(async (email: string, password: string) => {
        try {
            const res = await authService.emailLogin(email, password);
            saveAuth(res.user);
            return res; // Return success response to the caller (Login.tsx)
        } catch (error) {
            handleError(error, "Invalid email or password");
            clearAuth();
            throw error; // Essential: Re-throw the error so Login.tsx catches it
        } 
    }, [saveAuth, handleError, clearAuth]); // 'navigate' removed from deps

    // 🔑 Google Login (CONSISTENCY FIX)
    const googleLogin = useCallback(async (googleToken: string) => {
        try {
            const res = await authService.googleLogin(googleToken);
            saveAuth(res.user);
            // navigate("/home") is removed here for consistency
            return res; // Return success response to the caller
        } catch (error) {
            handleError(error, "Google login failed");
            clearAuth();
            throw error; // Re-throw the error
        } 
    }, [saveAuth, handleError, clearAuth]); // 'navigate' removed from deps


    // 🔑 Registration
    const register = useCallback(async (email: string): Promise<boolean> => {
        try {
            await authService.sendOtp(email);
            return true;
        } catch (error) {
            handleError(error, "Failed to send OTP.");
            clearAuth();
            return false;
        } 
    }, [handleError, clearAuth]);


    // 🔑 Verify OTP
    const verifyOtp = useCallback(async (
        name: string,
        email: string,
        otp: string,
        password: string
    ) => {
        try {
            await authService.verifyOtp(name, email, otp, password);
        } catch (error) {
            handleError(error, "Failed to verify OTP");
            clearAuth();
        } 
    }, [handleError, clearAuth]);


    // 🔑 Password Reset
    const sendPasswordReset = useCallback(async (email: string): Promise<boolean> => {
        try {
            await authService.sendPasswordReset(email);
            return true;
        } catch (error) {
            handleError(error, "Failed to send reset code");
            clearAuth();
            return false;
        } 
    }, [handleError, clearAuth]);


    // 🔑 Reset Password
    const resetPassword = useCallback(async (
        email: string,
        otp: string,
        newPassword: string
    ) => {
        try {
            await authService.resetPassword(email, otp, newPassword);
        } catch (error) {
            handleError(error, "Failed to reset password");
            clearAuth();
        } 
    }, [handleError, clearAuth]);


    // 🔑 Optimistic Logout
    const logout = useCallback(async () => {
        clearAuth();
        setLoading(true);
        navigate("/login");

        try {
            await authService.logout();
        } catch (err) {
            console.warn("Logout API failed; session cookies may already be cleared");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [clearAuth, navigate]);


    // 🔑 Final Context Value (useMemo): Now includes loginSuccess
    const value: AuthContextType = useMemo(() => ({
        user,
        token,
        loginSuccess, // EXPOSED: Success state
        login,
        googleLogin,
        register,
        verifyOtp,
        sendPasswordReset,
        resetPassword,
        logout,
        loading,
        isAuthenticated: !!user,
    }), [
        user, 
        token, 
        loginSuccess, 
        loading, 
        // Functions are stable references
        login, googleLogin, register, verifyOtp, sendPasswordReset, resetPassword, logout
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};