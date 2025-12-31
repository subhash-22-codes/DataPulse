import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const GitHubLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const GitHubLoginButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  const handleGitHubLogin = () => {
    setIsLoading(true);
    
    // Save the 'from' path to local storage so the callback knows where to return the user
    const from = location.state?.from?.pathname || '/home';
    localStorage.setItem('auth_redirect_path', from);
    const API_URL = import.meta.env.VITE_API_URL;
    window.location.href = `${API_URL}/auth/github/link`;
  };

  return (
    <div className="w-full relative group">
      <button
        type="button"
        onClick={handleGitHubLogin}
        disabled={isLoading}
        className="
          relative w-full flex items-center justify-center gap-3
          px-4 py-2.5 rounded-md border border-slate-200 bg-white
          text-sm font-medium text-slate-700 shadow-sm transition
          hover:bg-slate-50 active:scale-[0.98]
          disabled:opacity-60 disabled:cursor-not-allowed
        "
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        ) : (
          <GitHubLogo />
        )}
        <span>{isLoading ? "Connecting..." : "Sign in with GitHub"}</span>
      </button>
    </div>
  );
};

export default GitHubLoginButton;