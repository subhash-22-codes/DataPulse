import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
    useCallback,
    useRef
} from "react";
import { useNavigate } from "react-router-dom";
import { User, AuthContextType, AuthPhase } from "../types/auth"; 
import { authService } from "../services/api";
import axios,{ AxiosError } from "axios";
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

    // --- State Management ---
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [authPhase, setAuthPhase] = useState<AuthPhase>("checking");
    
    // 🛡️ Bounded Retry & Cleanup Refs
    const retryCount = useRef(0);
    const retryTimeoutRef = useRef<number | null>(null); 
    const MAX_RETRIES = 12; 
    const RETRY_DELAY_MS = 5000; 

    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                window.clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    // --- Helper Functions ---
    const saveAuth = useCallback((userData: User) => {
        setUser({ ...userData });
        localStorage.setItem("datapulse_user", JSON.stringify(userData));
        setLoginSuccess(true); 
    }, []);

    const clearAuth = useCallback(() => {
        setUser(null);
        setLoginSuccess(false);
        localStorage.removeItem("datapulse_user");
        
        // 🛡️ Reviewer Fix 2: Reset retry counter on logout/clear
        retryCount.current = 0; 
        if (retryTimeoutRef.current) {
            window.clearTimeout(retryTimeoutRef.current);
        }
    }, []);
    
    const handleError = useCallback((error: unknown, fallbackMsg: string) => {
        const err = error as AxiosError<{ detail?: string }>;
        if (err.response?.status === 429) {
            toast.error("Too many requests. Please try again shortly.");
        } else {
            toast.error(err.response?.data?.detail || fallbackMsg);
        }
        if (err.response?.status !== 401) {
            throw err;
        }
    }, []);

    // --- 🛡️ The Smart Session Engine (React-Safe Version) ---
    const checkSession = useCallback(async () => {
        try {
            const res = await authService.checkSession();
            if (res && res.user) {
                saveAuth(res.user); 
            }
            // ✅ SUCCESS: Decision final.
            setAuthPhase("resolved");
            retryCount.current = 0; 
            return res?.user;
        } catch (error: unknown) {
            // 🛡️ 1. Convert the unknown error to an AxiosError safely
            const isAxiosError = axios.isAxiosError(error);
            const serverResponse = isAxiosError ? error.response : null;

            // 🚨 CASE A: Server is unreachable (No response from Axios) 
            // or it's a generic network error
            if (!serverResponse) {
                if (retryCount.current < MAX_RETRIES) {
                    retryCount.current += 1;
                    console.warn(`📡 Server unreachable. Retry ${retryCount.current}/${MAX_RETRIES}...`);
                    
                    retryTimeoutRef.current = window.setTimeout(
                        () => checkSession(), 
                        RETRY_DELAY_MS
                    );
                } else {
                    console.error("🛑 Max retries reached or non-axios error occurred.");
                    setAuthPhase("unreachable");
                }
                return null;
            }

            // ❌ CASE B: Server is awake, but returned an error (e.g., 401 Unauthorized)
            console.error("Session check failed with response:", serverResponse.status);
            clearAuth();
            setAuthPhase("resolved"); 
            return null;
        }
    }, [saveAuth, clearAuth]);

    useEffect(() => {
        checkSession();
    }, [checkSession]);


    // --- 🔑 Authentication Actions ---

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        try {
            const res = await authService.emailLogin(email, password);
            saveAuth(res.user);
            setAuthPhase("resolved"); 
            return res;
        } catch (error) {
            handleError(error, "Invalid email or password");
            clearAuth();
            throw error; 
        } finally {
            setLoading(false);
        }
    }, [saveAuth, handleError, clearAuth]);

    const googleLogin = useCallback(async (googleToken: string) => {
        setLoading(true);
        try {
            const res = await authService.googleLogin(googleToken);
            saveAuth(res.user);
            setAuthPhase("resolved");
            return res;
        } catch (error) {
            handleError(error, "Google login failed");
            clearAuth();
            throw error;
        } finally {
            setLoading(false);
        }
    }, [saveAuth, handleError, clearAuth]);

        // _________(Fixed: Removed redundant try/catch to satisfy ESLint)_____
      // _________(Fixed: register returns boolean as expected by your Type)_____
const register = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
        await authService.sendOtp(email);
        return true; 
    } finally {
        setLoading(false);
    }
}, []);

// _________(Fixed: verifyOtp returns VOID to match your AuthContextType)_____
const verifyOtp = useCallback(async (name: string, email: string, otp: string, password: string): Promise<void> => {
    setLoading(true);
    try {
        await authService.verifyOtp(name, email, otp, password);
        // No return here because your interface expects 'void'
    } finally {
        setLoading(false);
    }
}, []);
    const sendPasswordReset = useCallback(async (email: string): Promise<boolean> => {
        setLoading(true);
        try {
            await authService.sendPasswordReset(email);
            return true;
        } catch (error) {
            handleError(error, "Failed to send reset code");
            return false;
        } finally {
            setLoading(false);
        }
    }, [handleError]);

    const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
        setLoading(true);
        try {
            await authService.resetPassword(email, otp, newPassword);
        } catch (error) {
            handleError(error, "Failed to reset password");
        } finally {
            setLoading(false);
        }
    }, [handleError]);

   const logout = useCallback(async () => {
        try {
            await authService.logout(); // ✅ CSRF still exists here
        } catch (err) {
            console.error("Logout API failure:", err);
        } finally {
            clearAuth();               // ✅ now safe
            setAuthPhase("resolved");
            navigate("/login");
        }
        }, [clearAuth, navigate]);



    // --- 🛡️ 5. Final Context Value ---
    const value: AuthContextType = useMemo(() => ({
        user,
        loginSuccess,
        login,
        googleLogin,
        register,
        verifyOtp,
        sendPasswordReset,
        resetPassword,
        logout,
        checkSession, 
        loading,
        authPhase,
        isAuthResolved: authPhase === "resolved",
        isAuthenticated: !!user,
    }), [
        user, loginSuccess, loading, authPhase, 
        login, googleLogin, register, verifyOtp, 
        sendPasswordReset, resetPassword, logout, checkSession
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};