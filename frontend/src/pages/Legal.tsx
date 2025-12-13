import React from 'react';
import { ArrowLeft, FileText, Shield, Lock, Users, Database, Mail, Cookie, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
export const Legal: React.FC = () => {
  const [activeSection, setActiveSection] = React.useState<string>('');

  React.useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';

      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= 120) {
          current = section.getAttribute('id') || '';
        }
      });

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const tocItems = [
    { id: 'our-role', label: 'Our role in your privacy', icon: Shield },
    { id: 'when-how-collect', label: 'When and how we collect data', icon: Database },
    { id: 'types-of-data', label: 'Types of data we collect', icon: FileText },
    { id: 'how-we-use', label: 'How and why we use your data', icon: Users },
    { id: 'your-rights', label: 'Your privacy choices and rights', icon: CheckCircle },
    { id: 'data-security', label: 'How secure is the data we collect?', icon: Lock },
    { id: 'third-parties', label: 'Third parties who process your data', icon: Users },
    { id: 'cookies', label: 'Cookies and Local Storage', icon: Cookie },
    { id: 'contact', label: 'Contact Us', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <style>{`
        html { scroll-behavior: smooth; }
        .prose-custom h2 { scroll-margin-top: 120px; }
        .prose-custom h3 { scroll-margin-top: 120px; }
      `}</style>

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* --- Logo --- */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/DPLogo2.png"
                alt="DataPulse Logo"
                className="h-9 w-9 sm:h-10 sm:w-10 group-hover:scale-110 transition-transform duration-200 ease-out"
              />
              <span className="font-bold text-xl sm:text-2xl text-slate-900 hidden sm:block">
                DataPulse
              </span>
            </Link>

            {/* --- Back Button --- */}
            <Link
              to="/home"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 group"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
              <span className="sm:hidden">Back</span>
            </Link>

          </div>
        </div>
      </header>


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-12">

          <aside className="hidden lg:block lg:col-span-3">
            <nav className="sticky top-24 space-y-1">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                On this page
              </h3>
              <ul className="space-y-1">
                {tocItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="line-clamp-2">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div className="lg:col-span-9">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 sm:px-10 py-12 sm:py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
                    The DataPulse Privacy Policy
                  </h1>
                  <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto">
                    Hello. We are DataPulse. Here's how we protect your data and respect your privacy.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm text-blue-50">
                    <AlertCircle className="w-4 h-4" />
                    <span>Last updated: October 15, 2025</span>
                  </div>
                </div>

                <div className="px-6 sm:px-10 py-10 sm:py-14 prose-custom">

                  <section id="our-role" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">Our role in your privacy</h2>
                    </div>

                    <div className="space-y-6 text-slate-700 leading-relaxed">
                      <p className="text-lg">
                        If you are a DataPulse customer or subscriber, or just visiting our website, this policy applies to you.
                      </p>

                      <div className="bg-slate-50 border-l-4 border-blue-600 rounded-r-xl p-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-3">Our responsibilities</h4>
                        <p className="text-slate-700 mb-0">
                          If you are a registered DataPulse customer or a visitor to our website, we act as the <span className="font-semibold text-slate-900">"data controller"</span> of personal data. This means we determine how and why your data are processed.
                        </p>
                      </div>

                      <div className="bg-blue-50 border-l-4 border-slate-600 rounded-r-xl p-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-3">Your responsibilities</h4>
                        <ul className="space-y-2 mb-0">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>Read this Privacy Policy</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>Keep your account credentials secure and do not share them with unauthorized parties</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section id="when-how-collect" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl">
                        <Database className="w-5 h-5 text-green-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">When and how we collect data</h2>
                    </div>

                    <div className="space-y-4 text-slate-700">
                      <p>
                        From the moment you request a demo of DataPulse, we start collecting data. Sometimes you provide us with data, sometimes data about you is collected automatically.
                      </p>
                      <p>Here's when and how we do this:</p>

                      <div className="overflow-x-auto mt-6">
                        <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                                Data You Give
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                                Data We Collect
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-slate-400 text-xl">×</span>
                              </td>
                              <td className="px-4 py-4 text-sm">You sign up for DataPulse</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-slate-400 text-xl">×</span>
                              </td>
                              <td className="px-4 py-4 text-sm">You create a workspace</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-blue-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-sm">You upload CSV files or configure data sources</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-center">
                                <span className="text-slate-400 text-xl">×</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-blue-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-sm">You receive automated alert emails</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-blue-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-sm">You use the AI Business Analyst or AI Concierge features</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-center">
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-slate-400 text-xl">×</span>
                              </td>
                              <td className="px-4 py-4 text-sm">You contact customer support</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  <section id="types-of-data" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl">
                        <FileText className="w-5 h-5 text-purple-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">Types of data we collect</h2>
                    </div>

                    <div className="space-y-6 text-slate-700">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Personal Information
                          </h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>Name and email address (via Google Auth or Email/Password)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>Securely hashed passwords (when using email/password authentication)</span>
                            </li>
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            User-Generated Content
                          </h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>CSV file contents you upload</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>Workspace names and descriptions</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>Custom Smart Alert rules</span>
                            </li>
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Database className="w-5 h-5 text-orange-600" />
                            Connection Details
                          </h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="text-orange-600 mt-1">•</span>
                              <span>API endpoint URLs for polling</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-orange-600 mt-1">•</span>
                              <span>Database connection credentials (host, port, username, database name, SQL queries)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-orange-600 mt-1">•</span>
                              <span><strong>Database passwords are always encrypted</strong> before storage</span>
                            </li>
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-slate-600" />
                            Authentication Data
                          </h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="text-slate-600 mt-1">•</span>
                              <span>JWT tokens (stored in browser localStorage)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-slate-600 mt-1">•</span>
                              <span>Session data for maintaining login state</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="how-we-use" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-xl">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">How and why we use your data</h2>
                    </div>

                    <div className="space-y-4 text-slate-700">
                      <p>We use your information solely to provide the DataPulse service, including:</p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Analyzing your data</strong> to detect schema changes (column additions/removals) and volume changes (row count fluctuations)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Generating alerts</strong> based on your custom Smart Alert rules</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Sending transactional emails</strong> including OTP verification codes and alert notifications</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Providing AI-powered insights</strong> through our Business Analyst feature (we only send column names, not your actual data)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Enabling team collaboration</strong> within workspace limits</span>
                        </li>
                      </ul>
                    </div>
                  </section>

                  <section id="your-rights" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-teal-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">Your privacy choices and rights</h2>
                    </div>

                    <div className="space-y-4 text-slate-700">
                      <p>You have complete control over your data in DataPulse:</p>

                      <div className="space-y-4 mt-6">
                        <div className="bg-green-50 border-l-4 border-green-600 rounded-r-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            Delete Individual Data Uploads
                          </h4>
                          <p className="text-sm mb-0">
                            You can delete any CSV upload, API connection, or database connector at any time from your workspace settings.
                          </p>
                        </div>

                        <div className="bg-red-50 border-l-4 border-red-600 rounded-r-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            Delete Your Entire Account
                          </h4>
                          <p className="text-sm mb-0">
                            Navigate to the "Danger Zone" in your profile settings to permanently delete your account. This action will irreversibly remove your user profile, all workspaces, all data uploads, all team memberships, and all settings. This action cannot be undone.
                          </p>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-600" />
                            Request Data Export
                          </h4>
                          <p className="text-sm mb-0">
                            Contact us at <a href="mailto:datapulseapp@gmail.com" className="font-semibold text-blue-600 hover:text-blue-700">datapulseapp@gmail.com</a> to request a copy of your personal data in a portable format.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="data-security" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-xl">
                        <Lock className="w-5 h-5 text-red-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">How secure is the data we collect?</h2>
                    </div>

                    <div className="space-y-4 text-slate-700">
                      <p>Data security is our top priority. We implement industry-standard security measures:</p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Password Security:</strong> All passwords are hashed using bcrypt before storage. We never store plain-text passwords.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Database Password Encryption:</strong> Any database passwords you provide for connectors are encrypted with a secure encryption key before being stored.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Secure Authentication:</strong> We use JWT tokens for session management, stored securely in browser localStorage.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span><strong>HTTPS/TLS:</strong> All data transmission is encrypted using HTTPS/TLS protocols.</span>
                        </li>
                      </ul>
                    </div>
                  </section>

                  <section id="third-parties" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-xl">
                        <Users className="w-5 h-5 text-yellow-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">Third parties who process your data</h2>
                    </div>

                    <div className="space-y-6 text-slate-700">
                      <p>We use trusted, industry-standard third-party services to operate DataPulse:</p>

                      <div className="space-y-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                          <h4 className="font-semibold text-slate-900 mb-3">Google Authentication</h4>
                          <p className="text-sm mb-2">
                            <strong>Purpose:</strong> To provide a secure and convenient sign-in option using your existing Google account.
                          </p>
                          <p className="text-sm mb-0">
                            <strong>Data Shared:</strong> Your name and email address are collected from your Google profile when you use this sign-in method.
                          </p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                          <h4 className="font-semibold text-slate-900 mb-3">Google Gemini AI</h4>
                          <p className="text-sm mb-3">
                            <strong>Purpose:</strong> To power two intelligent features in DataPulse:
                          </p>
                          <ul className="space-y-2 text-sm mb-3">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span><strong>AI Business Analyst:</strong> When a schema change is detected, we send only the column names (e.g., "Columns Added: customer_location") to Gemini to generate insights. We never send your actual data values.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span><strong>AI Concierge:</strong> The in-app chatbot that answers questions about how DataPulse works. This feature does not involve sending any of your personal data or uploaded data to the AI.</span>
                            </li>
                          </ul>
                          <p className="text-sm mb-0">
                            <strong>Data Protection:</strong> Only metadata (column names) is shared with Gemini, never your actual data content.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="cookies" className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl">
                        <Cookie className="w-5 h-5 text-amber-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">Cookies and Local Storage</h2>
                    </div>

                    <div className="space-y-6 text-slate-700">
                      <p>
                        We use modern browser storage technologies to provide a seamless and secure experience. We do <strong>not</strong> use cookies for tracking or advertising purposes.
                      </p>

                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600" />
                            Essential Storage (localStorage)
                          </h4>
                          <p className="text-sm mb-2">
                            To keep you logged in, we store a secure JWT authentication token in your browser's Local Storage. This is strictly necessary for the application to function.
                          </p>
                          <p className="text-sm mb-0">
                            <strong>Note:</strong> This storage is not used for tracking or advertising. It exists solely to maintain your authenticated session.
                          </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Cookie className="w-5 h-5 text-green-600" />
                            Functional Cookies
                          </h4>
                          <p className="text-sm mb-0">
                            We use one single, simple cookie named <code className="bg-white px-2 py-1 rounded text-xs font-mono border border-slate-200">datapulse-cookie-consent</code>. Its only purpose is to remember if you have accepted the cookie policy, so we don't show you the banner on every visit. It stores no personal information.
                          </p>
                        </div>

                        <div className="bg-slate-100 border-l-4 border-slate-600 rounded-r-xl p-5">
                          <p className="text-sm font-semibold mb-0">
                            We do not use any third-party analytics or advertising cookies (e.g., no Google Analytics, no Facebook Pixel).
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="contact" className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">Contact Us</h2>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 text-slate-700">
                      <p className="mb-4">
                        If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please don't hesitate to reach out:
                      </p>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-slate-600 mb-2">Email us at:</p>
                        <a
                          href="mailto:datapulseapp@gmail.com"
                          className="text-base font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          datapulseapp@gmail.com
                        </a>
                      </div>
                      <p className="mt-4 text-sm mb-0">
                        <strong>Developed by:</strong> Subhash Yaganti and Siri Mahalaxmi Vemula<br />
                        <strong>Governing Law:</strong> Hyderabad, India<br />
                        <strong>Effective Date:</strong> October 15, 2025
                      </p>
                    </div>
                  </section>

                </div>

                <div className="bg-slate-50 border-t border-slate-200 px-6 sm:px-10 py-8 text-center">
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Terms of Service</h3>
                    <div className="space-y-4 text-sm text-slate-700">
                      <div className="bg-white rounded-lg p-5 border border-slate-200 text-left">
                        <h4 className="font-semibold text-slate-900 mb-2">1. Accounts and Usage</h4>
                        <p className="text-sm">
                          You are responsible for your account's security. You must not use DataPulse for any illegal or unauthorized purpose.
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-5 border border-slate-200 text-left">
                        <h4 className="font-semibold text-slate-900 mb-2">2. Service Limits (Free Tier)</h4>
                        <p className="text-sm mb-2">The use of DataPulse is subject to the following fair-use limitations:</p>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Each user may create and own a maximum of <strong>three (3) workspaces</strong>.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Each workspace owner may invite a maximum of <strong>two (2) team members</strong>.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-white rounded-lg p-5 border border-slate-200 text-left">
                        <h4 className="font-semibold text-slate-900 mb-2">3. Disclaimer of Warranties</h4>
                        <p className="text-sm">
                          DataPulse is provided "as is" for educational and portfolio purposes. We make no warranties regarding the reliability or accuracy of the service.
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-5 border border-slate-200 text-left">
                        <h4 className="font-semibold text-slate-900 mb-2">4. Governing Law</h4>
                        <p className="text-sm">
                          These terms are governed by the laws of <strong>Hyderabad, India</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            © 2025 DataPulse. An educational project by Subhash Yaganti and Siri Mahalaxmi Vemula.
          </p>
        </div>
      </footer>
    </div>
  );
};
