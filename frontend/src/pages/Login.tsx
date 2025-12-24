import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowLeft, BarChart3, BellRing, Database, ShieldCheck, AlertCircle } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/home';

  // LOGIC PRESERVED 100%
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password); 
      toast.success('Logged in successfully'); 
      navigate(from, { replace: true });
    } catch (error) {
       console.error("Login failed:", error);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900 selection:bg-blue-100">
      
      {/* LEFT SIDE - FORM (40% Width - Adjusted for better balance) */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-12 bg-white z-10 border-r border-slate-100 h-screen overflow-y-auto">
        
        <div className="w-full max-w-sm mx-auto flex flex-col">
          
          {/* Back Navigation */}
          <div className="mb-6 lg:mb-8">
             <Link 
                to="/register" 
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wide"
              >
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                Back to register
              </Link>
          </div>

          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex items-center gap-2 mb-6 font-poppins">
             <img src="/DPLogo2.png" alt="DataPulse" className="h-6 w-6 object-contain" />
             <span className="text-lg font-bold text-slate-900">DataPulse</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 mb-6 font-poppins">
             <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-8 object-contain" />
             <span className="font-bold text-xl text-slate-900 tracking-tight">DataPulse</span>
          </div>

          {/* Main Header */}
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Good to see you again
            </h1>
            <p className="text-slate-500 text-sm">
              Log in to your DataPulse workspace.
            </p>
          </div>

          {/* Form Content */}
          <div className="space-y-5">
            
            <GoogleLoginButton />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white text-slate-400 font-medium">Or email</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              
              {/* Error Message */}
              {error && (
                <div className="rounded-md bg-red-50 p-3 border border-red-100 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-xs font-medium text-red-800">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

            </form>

            <div className="text-center pt-2">
               <p className="text-sm text-slate-600">
                 No account?{' '}
                 <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                   Sign up
                 </Link>
               </p>
            </div>

            {/* Terms */}
            <div className="text-center pt-6 border-t border-slate-100 mt-6">
                <p className="text-xs text-slate-400">
                  By continuing, you agree to our{' '}
                  <Link to="/legal" className="underline hover:text-slate-600">Terms of Service</Link> and{' '}
                  <Link to="/legal" className="underline hover:text-slate-600">Privacy Policy</Link>.
                </p>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT SIDE - BRANDING (60% Width - Adjusted for better balance) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden items-center justify-center p-16">
        
        {/* Subtle Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
        
        {/* Content Container */}
        <div className="relative z-10 w-full max-w-2xl text-white space-y-12">
           
           {/* Header Section */}
           <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 rounded-lg bg-blue-500/10 px-4 py-2 border border-blue-400/20 backdrop-blur-sm">
                 <Activity className="h-5 w-5 text-blue-200" />
                 <span className="font-semibold tracking-wide text-white text-sm">DataPulse</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
                 Your data, <span className="text-blue-200">simplified.</span>
              </h2>
              <p className="text-xl text-blue-100/90 leading-relaxed font-light max-w-xl">
                A simple workspace to explore, understand, and monitor data — designed for <span className="font-medium text-white">students</span> and <span className="font-medium text-white">small teams</span>.
              </p>
           </div>

           {/* Features Grid */}
           <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { icon: BarChart3, title: "Real-time analytics", desc: "Track basic metrics and trends as data updates." },
                { icon: Database, title: "Data ingestion", desc: "Upload CSV files and work with structured datasets." },
                { icon: BellRing, title: "Alerts", desc: "Get notified when values cross defined limits." },
                { icon: ShieldCheck, title: "Private workspaces", desc: "Simple access control for shared projects." }
              ].map((f, i) => (
                <div key={i} className="flex flex-col gap-2">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10">
                        <f.icon className="h-5 w-5 text-blue-200" />
                      </div>
                      <h3 className="font-semibold text-white text-base">{f.title}</h3>
                   </div>
                   <p className="text-sm text-blue-100/70 leading-relaxed pl-12">{f.desc}</p>
                </div>
              ))}
           </div>

           {/* Footer Note */}
           <div className="pt-8 border-t border-white/10 flex justify-between items-center text-xs text-blue-200/60">
             <p>© 2025 DataPulse. Secure & Reliable.</p>
             <div className="flex gap-4">
               <span>v1.0.0</span>
               <span>System Normal</span>
             </div>
           </div>

        </div>
      </div>

    </div>
  );
};

export default Login;