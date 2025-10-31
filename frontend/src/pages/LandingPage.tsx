// src/pages/LandingPage.tsx
import React from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Bell, Database, Shield } from "lucide-react";
import { FaLinkedin, FaGithub, FaInstagram } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import { useAuth } from "../context/AuthContext";

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/home" replace />;

  return (
    <div className="Landing-page-design-pattern min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="w-full bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/DPLogo2.png"
              alt="DataPulse"
              className="h-12 w-12 object-contain"
              loading="lazy"
            />
            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              DataPulse
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-slate-700 hover:text-blue-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/50 transition-all duration-200"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 relative z-10">
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
           <div className="flex-1 text-center lg:text-left">
    
              {/* 
              <span className="inline-block mb-4 sm:mb-6 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200/50">
                B.Tech Minor Project • Final Year
              </span> 
              */}

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Real-time Insights,
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Instant Decisions
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-6 sm:mb-8 px-4 lg:px-0">
                DataPulse connects CSVs, APIs and databases to provide interactive, live dashboards,
                automated email alerts and anomaly detection — built with React, TypeScript,
                Python and PostgreSQL.
              </p>

              <div className="flex flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-6 sm:mb-8 px-4 lg:px-0">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transform hover:scale-105 transition-all duration-200"
                >
                  Start for Free
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 bg-white/80 backdrop-blur-sm text-slate-700 hover:text-blue-600 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Login
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start px-4 lg:px-0">
                {['Live Charts', 'Email Alerts', 'CSV / API / DB'].map((badge) => (
                  <div
                    key={badge}
                    className="px-3 sm:px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-white/50 text-slate-700 text-sm font-medium"
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>


            <motion.div
              className="flex-1 max-w-2xl w-full px-4 lg:px-0"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1, transition: { duration: 0.5 } }}
              viewport={{ once: true }}
            >
            <div className="relative max-w-4xl mx-auto px-4">
              <div className="absolute inset-0 bg-none rounded-2xl blur-xl"></div>
              <div className="relative rounded-2xl shadow-2xl overflow-hidden border border-white/30 bg-white/90 backdrop-blur-sm">
                <img
                  src="/images/Architecture.png"
                  alt="DataPulse Architecture"
                  className="w-full max-h-[500px] object-contain"
                  loading="lazy"
                />
                <div className="p-4 sm:p-6 bg-gradient-to-t from-white via-white/95 to-white/80">
                  <h3 className="text-slate-800 font-bold text-base sm:text-lg">DataPulse : Architecture</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Real-time charting & anomaly indicators
                  </p>
                </div>
              </div>
            </div>

            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div
            className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            variants={staggerContainer}
            viewport={{ once: true }}
          >
            <motion.div variants={cardVariant} className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl mb-4">
                  <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-lg sm:text-xl text-slate-800 mb-3">Graph Analysis</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Interactive charts, zoom & drill-down for fast insights with real-time data visualization.</p>
              </div>
            </motion.div>

            <motion.div variants={cardVariant} className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl mb-4">
                  <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                </div>
                <h4 className="font-bold text-lg sm:text-xl text-slate-800 mb-3">Email Alerts</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Automated mail alerts when anomalies or thresholds are triggered with smart notifications.</p>
              </div>
            </motion.div>

            <motion.div variants={cardVariant} className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl mb-4">
                  <Database className="w-6 h-6 sm:w-8 sm:h-8 text-blue-700" />
                </div>
                <h4 className="font-bold text-lg sm:text-xl text-slate-800 mb-3">Multiple Sources</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Ingest CSVs, connect APIs or hook your database for live updates and seamless integration.</p>
              </div>
            </motion.div>

            <motion.div variants={cardVariant} className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl mb-4">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-700" />
                </div>
                <h4 className="font-bold text-lg sm:text-xl text-slate-800 mb-3">Secure Access</h4>
                <p className="text-sm text-slate-600 leading-relaxed">JWT-based auth and secure data flows for user privacy with enterprise-grade security.</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-8 sm:mb-12">Meet Our Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Subhash */}
            <motion.div
              className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-200"
              whileHover={{ y: -2 }}
            >
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-md"></div>
                <img
                  src="/images/Subhash.jpg"
                  alt="Subhash"
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-lg sm:text-xl text-slate-800">Subhash Yaganti</h4>
                    <p className="text-sm text-blue-600 font-medium">Frontend & Fullstack</p>
                  </div>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-4 text-sm text-slate-600">
                  <a 
                    href="mailto:subhashyagantisubbu@gmail.com" 
                    className="flex items-center gap-2 hover:text-[#EA4335] transition-colors duration-200"
                  >
                    <SiGmail className="w-5 h-5 text-[#EA4335]" /> 
                    <span>subhashyagantisubbu@gmail.com</span>
                  </a>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-4">
                  <a href="https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/" 
                    target="_blank" rel="noreferrer"
                    aria-label="Subhash LinkedIn">
                    <FaLinkedin className="w-6 h-6 text-[#0A66C2]" /> {/* LinkedIn blue */}
                  </a>

                  <a href="https://github.com/subhash-22-codes"
                    target="_blank" rel="noreferrer"
                    aria-label="Subhash GitHub">
                    <FaGithub className="w-6 h-6 text-black" /> {/* GitHub black */}
                  </a>

                  <a href="https://www.instagram.com/subhash__spiody/"
                    target="_blank" rel="noreferrer"
                    aria-label="Subhash Instagram">
                    <FaInstagram className="w-6 h-6 text-[#E4405F]" /> {/* Insta pink-red */}
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Siri */}
            <motion.div
              className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-200"
              whileHover={{ y: -2 }}
            >
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 rounded-full blur-md"></div>
                <img
                  src="/images/Siri.jpg"
                  alt="Siri"
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="mb-2">
                  <h4 className="font-bold text-lg sm:text-xl text-slate-800">Siri Mahalaxmi Vemula</h4>
                  <p className="text-sm text-indigo-600 font-medium">Backend & Data</p>
                </div>
               <div className="flex items-center justify-center sm:justify-start gap-2 mb-4 text-sm text-slate-600">
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=sirimahalaxmivemula@gmail.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-[#EA4335] transition-colors duration-200"
                >
                  <SiGmail className="w-5 h-5 text-[#EA4335]" />
                  <span>sirimahalaxmivemula@gmail.com</span>
                </a>
              </div>
                <div className="flex items-center justify-center sm:justify-start gap-4">
                  <a
                    href="https://www.linkedin.com/in/vemula-siri-mahalaxmi-b4b624319/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Siri LinkedIn"
                  >
                    <FaLinkedin className="w-6 h-6 text-[#0A66C2]" /> {/* LinkedIn Blue */}
                  </a>

                  <a
                    href="https://github.com/armycodes"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Siri GitHub"
                  >
                    <FaGithub className="w-6 h-6 text-black" /> {/* GitHub Black */}
                  </a>

                  <a
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Siri Instagram"
                  >
                    <FaInstagram className="w-6 h-6 text-[#E4405F]" /> {/* Instagram Pink/Red */}
                  </a>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-600 text-white rounded-2xl p-8 sm:p-12 lg:p-16 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            
           <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Unlock insights with <span className="text-blue-400">Datapulse ⚡</span>
              </h3>
              <p className="text-base sm:text-lg text-white/90 max-w-xl">
                Connect your sources and see your data come alive with real-time dashboards and smart analytics.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link 
                to="/register" 
                className="bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-200"
              >
                Get Started
              </Link>
              <Link 
                to="/login" 
                className="border-2 border-white/40 hover:border-white/60 px-12 sm:px-8 py-3 sm:py-4 rounded-xl text-white font-bold hover:bg-white/10 transition-all duration-200"
              >
                Login
              </Link>
            </div>
          </div>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-sm border-t border-white/30 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-sm text-slate-600">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <img src="/DPLogo2.png" alt="logo" className="w-8 h-8 sm:w-10 sm:h-10" loading="lazy" />
            </div>
            <span className="font-semibold text-base sm:text-lg">© {new Date().getFullYear()} DataPulse</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {[
              { to: '/home', label: 'Home' },
              { to: '/login', label: 'Login' },
              { to: '/register', label: 'Register' },
              { to: '#', label: 'GitHub Repo' }
            ].map((link) => (
              <Link 
                key={link.label}
                to={link.to} 
                className="hover:text-blue-600 font-medium px-2 sm:px-3 py-1 rounded-lg hover:bg-blue-50 transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;