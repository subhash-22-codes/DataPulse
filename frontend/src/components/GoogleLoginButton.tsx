import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CredentialResponse } from 'google-one-tap';
import { AxiosError } from 'axios';
import { Loader2, AlertCircle } from 'lucide-react';

// Optimized Google Logo SVG
const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A8 8 0 0 1 24 36c-5.222 0-9.618-3.356-11.283-7.94l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.021 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GoogleLoginButton: React.FC = () => {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';
  const [isLoading, setIsLoading] = useState(false);
  const [isGsiReady, setIsGsiReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // --- Logic: Handle Google API Response ---
  const handleGoogleResponse = useCallback(
    async (response: CredentialResponse) => {
      setIsLoading(true);
      try {
        await googleLogin(response.credential!);
        navigate(from, { replace: true });
        toast.success('Successfully authenticated', { 
            style: { fontSize: '13px', background: '#334155', color: '#fff' }
        });
      } catch (error: unknown) {
        let message = 'An unknown error occurred.';
        if (error instanceof AxiosError) {
          message = error.response?.data?.detail || 'Authentication failed.';
        }
        toast.error(message);
        setIsLoading(false);
      }
    },
    [googleLogin, navigate, from]
  );

  // --- Logic: Load Google Script ---
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

  // --- Logic: Initialize Button ---
  useEffect(() => {
    if (isGsiReady && window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', text: 'signin_with', width: 300 } // Width here is just for the hidden element
        );
      }
    }
  }, [isGsiReady, handleGoogleResponse]);

  // --- Logic: Trigger Click ---
  const handleCustomButtonClick = () => {
    if (isLoading || !isGsiReady || scriptError) return;
    const googleLoginButton = googleButtonRef.current?.querySelector('div[role="button"]');
    if (googleLoginButton) {
      (googleLoginButton as HTMLElement).click();
    } else {
      toast.error("Google Sign-In is initializing. Please wait...");
    }
  };

  // --- Render: Configuration Error ---
  if (!GOOGLE_CLIENT_ID) {
    console.error("VITE_GOOGLE_CLIENT_ID is not defined.");
    return (
        <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Sign-in misconfigured</span>
        </div>
    );
  }

  // --- Render: Main Button ---
  return (
    <div className="w-full relative group">
      <button
        type="button"
        onClick={handleCustomButtonClick}
        disabled={isLoading || !isGsiReady || scriptError}
        className="
            relative w-full flex items-center justify-center gap-3 
            px-4 py-2.5 
            bg-white border border-slate-200 rounded-lg shadow-sm 
            hover:bg-slate-50 hover:border-slate-300 hover:shadow 
            transition-all duration-200 
            focus:outline-none focus:ring-slate-200 focus:ring-offset-1 
            disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none 
            active:scale-[0.98]
        "
        title={!isGsiReady ? "Initializing Google Sign-In..." : scriptError ? "Google Sign-In is unavailable" : "Sign in with Google"}
      >
        {isLoading ? (
          <Loader2 className="animate-spin h-5 w-5 text-slate-500" />
        ) : scriptError ? (
          <AlertCircle className="h-5 w-5 text-red-500" />
        ) : (
          <GoogleLogo />
        )}
        
        <span className="font-medium text-slate-700 text-sm">
          {isLoading 
            ? 'Signing in...' 
            : !isGsiReady 
                ? 'Loading...' 
                : scriptError 
                    ? 'Unavailable' 
                    : 'Sign in with Google'
          }
        </span>
      </button>
      
      {/* Hidden Container for the actual Google One Tap Button */}
      <div ref={googleButtonRef} className="hidden" aria-hidden="true" />
    </div>
  );
};

export default GoogleLoginButton;