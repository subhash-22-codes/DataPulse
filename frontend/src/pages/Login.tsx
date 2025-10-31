import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowLeft, Check, BarChart3, BellRing, Database, ShieldCheck } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Lottie from 'lottie-react';
import animationData from '../assets/animations/pulse.json'; // Adjust the path as necessary
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
      toast.success('Logged in successfully');
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };      
      toast.error(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header with Branding - Only visible on mobile */}
      <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-6 safe-area-top">
        <div className="flex items-center justify-center space-x-3">
         <div className="bg-white p-2.5 rounded-xl shadow-sm">
          <img 
            src="/DPLogo2.png" 
            alt="Datapulse Logo" 
            className="h-6 w-6 object-contain"
          />
        </div>
          <div>
            <h1 className="text-xl font-bold text-white">DataPulse</h1>
            <p className="text-blue-100 text-xs">Welcome back to your dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen lg:min-h-screen">
        {/* Left Side - Login Form (40% on desktop) */}
        <div className="w-full lg:w-2/5 flex flex-col">
          <div className="flex-1 flex flex-col justify-center py-4 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-md lg:max-w-lg xl:max-w-xl mx-auto lg:mx-0 w-full">
            <div className="w-full space-y-4 sm:space-y-6">
              {/* Back to Register - Compact on mobile */}
              <div className="flex justify-start">
                <Link 
                  to="/register" 
                  className="group inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-all duration-200 touch-target-44"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="sm:inline">Back to register</span>
                </Link>
              </div>

              {/* Logo and Header - Hidden on mobile since it's in the header */}
              <div className="space-y-3 hidden lg:block">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src="/DPLogo2.png" 
                      alt="Datapulse Logo" 
                      className="h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 object-contain"
                    />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      Welcome Back
                    </h1>
                    <p className="text-slate-600 text-sm sm:text-base">
                      Sign in to access your analytics dashboard
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile-optimized header */}
              <div className="space-y-2 lg:hidden text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Welcome Back
                </h2>
                <p className="text-slate-600 text-sm">
                  Sign in to your dashboard
                </p>
              </div>

              {/* Progress Indicator - More compact on mobile */}
              <div className="flex items-center justify-center space-x-2 py-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-200"></div>
                <div className="w-6 sm:w-8 h-0.5 sm:h-1 rounded-full bg-blue-600"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600"></div>
              </div>

              {/* Main Form */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-4 sm:space-y-6">
                  {/* Google Login */}
                  <GoogleLoginButton />
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 sm:px-4 bg-white text-slate-500 font-medium">
                        Or continue with email
                      </span>
                    </div>
                  </div>

                  {/* Email Login Form */}
                  <form onSubmit={handleEmailLogin} className="space-y-4 sm:space-y-5">
                    {error && (
                      <div className="bg-red-50/80 border border-red-200/80 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                        Email address
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 sm:pl-12 pr-3 sm:pr-4 w-full py-3 sm:py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base"
                          placeholder="Enter your email address"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                        Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 sm:pl-12 pr-10 sm:pr-12 w-full py-3 sm:py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors duration-200 touch-target-44"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Forgot Password Link */}
                    <div className="text-right">
                      <Link 
                        to="/forgot-password" 
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200 touch-target-44"
                      >
                        Forgot your password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 hover:shadow-xl text-sm sm:text-base min-h-[44px] touch-target-44"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white mr-2 sm:mr-3"></div>
                          <span className="text-sm sm:text-base">Signing in...</span>
                        </div>
                      ) : (
                        'Sign in to dashboard'
                      )}
                    </button>
                  </form>

                  {/* Benefits Section - Responsive layout */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border border-blue-100/50">
                    <h3 className="font-semibold text-slate-900 flex items-center text-sm sm:text-base">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2" />
                      Welcome to DataPulse Login
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Securely sign in to access your workspace</span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Use your registered email and password</span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Two-step verification for extra security</span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Quick password recovery if you forget</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Create Account Link - Compact on mobile */}
                <div className="text-center pt-3 sm:pt-4 border-t border-slate-100">
                  <p className="text-xs sm:text-sm text-slate-600">
                    New to DataPulse?{' '}
                    <Link 
                      to="/register" 
                      className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              </div>

              {/* Terms - Compact on mobile */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 leading-relaxed px-4 sm:px-0">
                  By signing in, you agree to our{' '}
                  <Link to="/legal" className="font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/legal" className="font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Footer Features - Only visible on mobile */}
          <div className="lg:hidden bg-slate-50 px-4 py-6 border-t border-slate-100">
            <div className="max-w-md mx-auto">
              <h3 className="text-center font-semibold text-slate-900 mb-4 text-sm">
                Your analytics await
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <BarChart3 className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-medium text-slate-700">Live Dashboards</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <Database className="h-5 w-5 mx-auto mb-2 text-green-600" />
                  <p className="text-xs font-medium text-slate-700">Data Sources</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <BellRing className="h-5 w-5 mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs font-medium text-slate-700">Smart Alerts</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <ShieldCheck className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs font-medium text-slate-700">Secure Access</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Desktop Branding */}
        <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">

          {/* Animated Lottie Background */}
          <div className="absolute top-3 right-3 opacity-30 pointer-events-none">
          <Lottie
            animationData={animationData}
            loop
            autoplay
            className="w-[450px] max-w-[600px]"
          />
        </div>
        {/* Overlay Gradient for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 via-transparent to-transparent"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 xl:p-16 space-y-10">

          {/* Logo + Tagline */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-white/20  p-6 rounded-3xl shadow-2xl hover:scale-105 transition-transform">
                <Activity className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold">DataPulse</h1>
            <p className="text-lg xl:text-xl text-blue-100 font-light leading-relaxed max-w-md mx-auto">
              Transform your <span className="text-white font-medium">data</span> into 
              <span className="text-white font-medium"> actionable insights</span> 
              with <span className="text-white font-medium"> powerful analytics</span>
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6 max-w-lg xl:max-w-xl">
            {[
              { icon: BarChart3, title: "Real-time Analytics", desc: "Live metric tracking and anomaly detection" },
              { icon: Database, title: "Data Ingestion", desc: "Import from CSV, APIs, and databases" },
              { icon: BellRing, title: "Smart Alerting", desc: "Instant alerts on thresholds and anomalies" },
              { icon: ShieldCheck, title: "Enterprise-Ready", desc: "Scalable, secure, and integration friendly" }
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center 
                  hover:bg-white/20 hover:scale-105 hover:shadow-xl transition-all duration-300 group"
                >
                  <Icon className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-blue-100">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Footer Pulse Animation */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-sm text-blue-100 mt-3 font-light">
              DataPulse is built for data teams of all sizes — from startups to enterprises.
            </p>
          </div>

        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;