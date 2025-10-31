import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CredentialResponse } from 'google-one-tap';
import { AxiosError } from 'axios';
import { Loader2, AlertCircle } from 'lucide-react';

// A simple SVG for the Google logo
const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A8 8 0 0 1 24 36c-5.222 0-9.618-3.356-11.283-7.94l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.021 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
  </svg>
);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GoogleLoginButton: React.FC = () => {
  // --- FIX #1: All hooks are now at the top level, before any conditional returns ---
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';
  const [isLoading, setIsLoading] = useState(false);
  const [isGsiReady, setIsGsiReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleGoogleResponse = useCallback(
    async (response: CredentialResponse) => {
      setIsLoading(true);
      try {
        await googleLogin(response.credential!);
        navigate(from, { replace: true });
        toast.success('Logged in successfully!');
      } catch (error: unknown) {
        let message = 'An unknown error occurred during Google login.';
        if (error instanceof AxiosError) {
            message = error.response?.data?.detail || 'Google login failed. Please try again.';
        }
        toast.error(message);
        setIsLoading(false);
      }
    },
    [googleLogin, navigate, from]
  );

  useEffect(() => {
    const scriptId = 'google-client-script';
    if (document.getElementById(scriptId)) {
        setIsGsiReady(true);
        return;
    }
    let attempts = 0;
    const maxAttempts = 3;
    const loadScript = () => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = scriptId;
        script.onload = () => {
            setIsGsiReady(true);
            setScriptError(false);
        };
        script.onerror = () => {
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(loadScript, 1000 * attempts);
            } else {
                setScriptError(true);
            }
        };
        document.body.appendChild(script);
    };
    loadScript();
  }, []);

  useEffect(() => {
    if (isGsiReady && window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          // --- FIX #2: Width is now a number, not a string ---
          { theme: 'outline', size: 'large', text: 'signin_with', width: 300 }
        );
      }
    }
  }, [isGsiReady, handleGoogleResponse]);

  const handleCustomButtonClick = () => {
    if (isLoading || !isGsiReady || scriptError) return;
    const googleLoginButton = googleButtonRef.current?.querySelector('div[role="button"]');
    if (googleLoginButton) {
      (googleLoginButton as HTMLElement).click();
    } else {
      toast.error("Could not initiate Google sign-in. Please try again.");
    }
  };

  // --- FIX #1 (Continued): The check is now *after* all hooks ---
  if (!GOOGLE_CLIENT_ID) {
    console.error("VITE_GOOGLE_CLIENT_ID is not defined in your .env file.");
    return (
        <div className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-red-300 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="font-semibold text-red-700">Google Sign-In is misconfigured.</span>
        </div>
    );
  }

  return (
    <div className="w-full relative">
      <button
        onClick={handleCustomButtonClick}
        disabled={isLoading || !isGsiReady || scriptError}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title={!isGsiReady ? "Initializing Google Sign-In..." : scriptError ? "Google Sign-In is unavailable" : "Sign in with Google"}
      >
        {isLoading ? (
          <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
        ) : scriptError ? (
          <AlertCircle className="h-5 w-5 text-red-500" />
        ) : (
          <GoogleLogo />
        )}
        <span className="font-semibold text-gray-700">
          {isLoading ? 'Signing in...' : !isGsiReady ? 'Initializing...' : scriptError ? 'Sign-In Unavailable' : 'Sign in with Google'}
        </span>
      </button>
      <div ref={googleButtonRef} style={{ display: 'none' }}></div>
    </div>
  );
};

export default GoogleLoginButton;