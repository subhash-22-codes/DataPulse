import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Minus, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const Legal: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');
  const navigate = useNavigate();
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';

      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= 180) {
          current = section.getAttribute('id') || '';
        }
      });

      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const tocItems = [
    { id: 'intro', label: 'Privacy Policy Overview' },
    { id: 'collection', label: 'Data Collection' },
    { id: 'types', label: 'Types of Data' },
    { id: 'usage', label: 'How We Use Data' },
    { id: 'infrastructure', label: 'Storage & Infrastructure' },
    { id: 'subprocessors', label: 'Third-party Services' },
    { id: 'retention', label: 'Data Retention' },
    { id: 'rights', label: 'Your Rights' },
    { id: 'security', label: 'Security' },
    { id: 'cookies', label: 'Cookies & Tracking' },
    { id: 'changes-privacy', label: 'Policy Changes' },
    { id: 'contact-privacy', label: 'Privacy Contact' },
    { id: 'tos-acceptance', label: 'Terms of Service' },
    { id: 'what-provided', label: 'What We Provide' },
    { id: 'account-access', label: 'Account & Access' },
    { id: 'data-sources', label: 'Data Source Rules' },
    { id: 'usage-limits', label: 'Usage Limits' },
    { id: 'acceptable-use', label: 'Acceptable Use' },
    { id: 'availability', label: 'Availability' },
    { id: 'export', label: 'Export & Downloads' },
    { id: 'deletion', label: 'Deletion & Removal' },
    { id: 'liability', label: 'Limitation of Liability' },
    { id: 'changes-terms', label: 'Terms Changes' },
    { id: 'governing', label: 'Governing Law' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-200 selection:text-black">

      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900">
              DataPulse
            </h1>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <span className="hidden sm:block text-xs font-medium text-slate-600">Legal</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-2 h-9 px-4 rounded-sm border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all active:scale-[0.95]"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 h-9 px-4 bg-slate-900 text-white rounded-sm text-[11px] font-bold transition-all hover:bg-slate-800 active:scale-[0.95]"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">

          <aside className="hidden lg:block lg:col-span-3 print:hidden">
            <nav className="sticky top-28 text-sm">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-200">
                Contents
              </h5>
              <ul className="space-y-2">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`text-left py-1 block w-full transition-colors text-sm ${
                        activeSection === item.id
                          ? 'text-slate-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="lg:col-span-9">

            <div className="mb-10 pb-8 border-b border-slate-200">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                Privacy Policy & Terms of Service
              </h1>
              <p className="text-base text-slate-600 mb-6">
                DataPulse is a web-based platform for monitoring datasets, detecting schema changes, and analyzing data trends. These documents explain how we handle your information and the terms under which you use our service.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Updated</span>
                  <span className="text-slate-700">January 26, 2026</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Jurisdiction</span>
                  <span className="text-slate-700">India</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact</span>
                  <a href="mailto:datapulseapp@gmail.com" className="text-slate-700 hover:text-slate-900 font-medium">datapulseapp@gmail.com</a>
                </div>
              </div>
            </div>

            <div className="space-y-12 text-slate-800">

              <section id="intro" className="scroll-mt-28">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-3 border-b border-slate-200">
                  Privacy Policy
                </h2>

                <div className="space-y-5 text-sm leading-relaxed text-slate-700">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2 text-base">1. Overview</h3>
                    <p>
                      DataPulse enables educational users and small teams to upload datasets, monitor data sources, detect schema changes, and analyze trends. We follow the principle of data minimization—collecting and storing only what is necessary to provide our service and maintain account security.
                    </p>
                    <p className="mt-3">
                      This Privacy Policy describes what personal information we collect, how we use it, how long we retain it, and your rights with respect to your data.
                    </p>
                  </div>
                </div>
              </section>

              <section id="collection" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">2. Data Collection</h3>
                <p className="text-sm text-slate-700 mb-4">
                  The table below outlines the categories of data we process, their origin, and their purpose:
                </p>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Data Category</th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-900 w-24">User Provided</th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-900 w-24">System Generated</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Purpose</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Account information (name, email)</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Account identification, authentication, workspace access, communications</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Password (encrypted hash only)</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Secure account authentication</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">OAuth identifiers (Google, GitHub)</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Single sign-on authentication</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Workspace metadata (name, members, roles)</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Collaboration, access control, permissions management</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Uploaded CSV files and data</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Dataset monitoring, change detection, export functionality</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">API/Database query results</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Data polling, trend analysis, change detection</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Schema information (column names, types)</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Schema change detection and visualization</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Analysis results and statistics</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Data quality checks, insights, trend reports, visualizations</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Authentication activity (login time, IP address)</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Security auditing, fraud detection, suspicious activity monitoring</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Notifications and alerts</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Alerting you to schema changes, anomalies, and important updates</td>
                      </tr>

                      <tr className="bg-amber-50">
                        <td className="px-4 py-3 font-medium text-slate-900">Tracking cookies or analytics</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-600 italic">Not collected</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="types" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">3. Types of Data We Process</h3>

                <div className="space-y-5 text-sm">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.1 Account Information</h4>
                    <p className="text-slate-700">
                      We store your name and email address to identify your account and manage access. If you use Google or GitHub to sign in, we store the unique identifier from that provider. Your password is never stored in plain text—only as a secure cryptographic hash.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.2 User-provided Content</h4>
                    <p className="text-slate-700">
                      We store content you explicitly create or upload, including CSV files, workspace names, descriptions, alert rules, and monitoring configurations. This content is accessible only to you and team members you authorize.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.3 Data Source Configuration</h4>
                    <p className="text-slate-700">
                      When you configure API polling or database connections, we store the connection details you provide. This includes API endpoints, headers, database credentials, and query parameters. Sensitive values like API keys and database passwords are treated as confidential and are used only for establishing the connection.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.4 Security and Session Data</h4>
                    <p className="text-slate-700">
                      We record login timestamps and IP addresses for security purposes. This helps us detect unauthorized access attempts and protect your account from misuse.
                    </p>
                  </div>
                </div>
              </section>

              <section id="usage" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">4. How We Use Your Data</h3>
                <p className="text-sm text-slate-700 mb-4">We process your data for these specific purposes:</p>

                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p>
                      <strong className="text-slate-900">Service Delivery:</strong> Processing your uploaded files, polling your configured data sources, detecting schema changes, computing analysis summaries, and displaying results in your workspace.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong className="text-slate-900">Notifications and Alerts:</strong> Notifying you when schema changes are detected, monitored metrics change, or configured alerts are triggered.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong className="text-slate-900">Account Security:</strong> Authenticating users, managing sessions, preventing fraud, and detecting suspicious activity.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong className="text-slate-900">Service Improvement:</strong> Maintaining, troubleshooting, and improving the platform based on usage patterns and technical issues.
                    </p>
                  </div>
                </div>
              </section>

              <section id="infrastructure" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">5. Data Storage and Infrastructure</h3>

                <div className="space-y-5 text-sm leading-relaxed text-slate-700">
                  <p>
                    Your data is stored in secure, separate systems: one for workspace and account information, and another for dataset files. This separation helps us manage and protect your information effectively.
                  </p>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">5.1 Supabase PostgreSQL Database</h4>
                    <p className="text-slate-700 mb-2">
                      We use Supabase PostgreSQL as our primary database for storing account information, workspace settings, and analysis results.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <p className="text-slate-700 mb-2 font-medium">Stored here:</p>
                      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2">
                        <li>Your account credentials and profile information</li>
                        <li>Workspace settings and team member access</li>
                        <li>Upload history and file metadata</li>
                        <li>Schema information and analysis reports</li>
                        <li>Alert configurations and notifications</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">5.2 Supabase Storage (Private Bucket)</h4>
                    <p className="text-slate-700 mb-2">
                      We store your dataset files separately in Supabase Storage to optimize performance and scalability.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <p className="text-slate-700 mb-2 font-medium">Stored here:</p>
                      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2">
                        <li>CSV files you upload directly</li>
                        <li>Datasets generated from API polling</li>
                        <li>Query results from database polling</li>
                      </ul>
                    </div>

                    <p className="text-slate-700 mt-3">
                      All files are stored in <strong>private storage</strong> and are not publicly accessible. When you download a file, we create a temporary signed link for your account only.
                    </p>
                  </div>
                </div>
              </section>

              <section id="subprocessors" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">6. Third-party Services and Data Processors</h3>
                <p className="text-sm text-slate-700 mb-4">DataPulse relies on trusted third-party services to operate. These providers process data only when necessary to deliver the service:</p>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Service Provider</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Function</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Data Processed</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Supabase</td>
                        <td className="px-4 py-3 text-slate-700">Database and file storage infrastructure</td>
                        <td className="px-4 py-3 text-slate-700">Account data, workspace information, dataset files, analysis results</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Google OAuth</td>
                        <td className="px-4 py-3 text-slate-700">Authentication provider</td>
                        <td className="px-4 py-3 text-slate-700">Email address and account identifier (at your direction)</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">GitHub OAuth</td>
                        <td className="px-4 py-3 text-slate-700">Authentication provider</td>
                        <td className="px-4 py-3 text-slate-700">Email address and account identifier (at your direction)</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Google Gemini AI</td>
                        <td className="px-4 py-3 text-slate-700">Help chatbot (app guidance)</td>
                        <td className="px-4 py-3 text-slate-700">
                          User chat messages only. We do not send uploaded file rows.
                        </td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Brevo</td>
                        <td className="px-4 py-3 text-slate-700">Email delivery service</td>
                        <td className="px-4 py-3 text-slate-700">Email address and transactional messages</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Cloud hosting infrastructure</td>
                        <td className="px-4 py-3 text-slate-700">Application hosting and request processing</td>
                        <td className="px-4 py-3 text-slate-700">Operational metadata and platform traffic</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="retention" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">7. Data Retention and Deletion</h3>

                <div className="space-y-5 text-sm leading-relaxed text-slate-700">
                  <p>
                    We retain your data for as long as you maintain your account. You can delete your data at any time through our platform. Here's what happens when you delete different types of information:
                  </p>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">7.1 Deleting Individual Uploads</h4>
                    <p className="text-slate-700">
                      When you delete a single upload (CSV file, API result, or database query result), we remove it from your workspace and permanently delete the stored file. Your workspace remains active.
                    </p>

                    <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2 mt-3">
                      <li>Upload record is removed from the database</li>
                      <li>Associated file is deleted from storage</li>
                      <li>Historical analysis tied to that upload is removed</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">7.2 Deleting a Workspace</h4>
                    <p className="text-slate-700">
                      Deleting a workspace removes all uploads, files, configurations, and settings associated with it.
                    </p>

                    <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2 mt-3">
                      <li>All uploads within the workspace are deleted</li>
                      <li>All stored files are permanently removed</li>
                      <li>Alerts, notifications, and configurations are erased</li>
                    </ul>

                    <p className="text-slate-700 mt-3">
                      Deleted workspaces may be recoverable from trash for up to <strong>30 days</strong> before permanent deletion.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">7.3 Account Deletion</h4>
                    <p className="text-slate-700">
                      When you delete your DataPulse account, we remove all your personal information and data.
                    </p>

                    <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2 mt-3">
                      <li>Account credentials and profile information are deleted</li>
                      <li>All workspaces you own are permanently deleted</li>
                      <li>All uploads and stored files are erased</li>
                    </ul>

                    <p className="text-slate-700 mt-3">
                      Brief security logs may be retained temporarily to prevent fraud, then deleted.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">7.4 Retention After Deletion</h4>
                    <p className="text-slate-700">
                      We may retain limited metadata for a short period for security and legal compliance purposes, then permanently delete it.
                    </p>
                  </div>
                </div>
              </section>

              <section id="rights" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">8. Your Rights</h3>

                <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                  <p>
                    Depending on your jurisdiction, you may have rights regarding your personal data:
                  </p>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Right to Access</h4>
                    <p>You can request access to all personal data we hold about you. You can also access most of this information directly through your account.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Right to Rectification</h4>
                    <p>You can correct or update your account information directly through the platform at any time.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Right to Erasure</h4>
                    <p>You can delete your account and associated data through the account settings. Some data may be retained briefly for legal or security reasons.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Right to Data Portability</h4>
                    <p>You can download data from individual workspaces through the platform (for example, by selecting a workspace and downloading specific uploaded files). Full bulk exports across all workspaces may not be available.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Right to Opt-out</h4>
                    <p>You can disable email notifications and alerts in your account preferences. You cannot opt out of essential security communications related to account compromise.</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 mt-4">
                    <p className="font-semibold text-slate-900 mb-2">How to Exercise Your Rights</p>
                    <p>To exercise any of these rights, contact us at <a href="mailto:datapulseapp@gmail.com" className="font-medium hover:underline">datapulseapp@gmail.com</a> with details of your request. We will respond within 30 days where required by law.</p>
                  </div>
                </div>
              </section>

              <section id="security" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">9. Security Measures</h3>

                <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                  <p>
                    We implement reasonable technical and organizational measures to protect your data against unauthorized access, alteration, and loss:
                  </p>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Data Protection Measures</h4>

                    <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2">
                      <li>Passwords are stored as secure cryptographic hashes, never in plain text</li>
                      <li>All account actions require authentication</li>
                      <li>Workspace access is restricted to authorized team members</li>
                      <li>Files are stored in private storage with restricted access</li>
                      <li>Temporary download links expire after use</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Stability and Service Limits</h4>
                    <p className="text-slate-700">
                      To maintain platform stability and performance, we apply operational limits such as file size restrictions, row limits, and upload quotas on the free tier. These limits may be adjusted to protect service integrity.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-amber-50 p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">No System is Perfect</h4>
                    <p className="text-slate-700">
                      While we implement reasonable security measures, no system is completely immune to attack. If you believe your account has been compromised, please contact us immediately at <a href="mailto:datapulseapp@gmail.com" className="font-medium hover:underline">datapulseapp@gmail.com</a>.
                    </p>
                  </div>
                </div>
              </section>

              <section id="cookies" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">10. Cookies and Tracking Technologies</h3>

                <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                  <p>
                    DataPulse uses minimal cookies, primarily for session management and authentication. We do not use tracking cookies, analytics cookies, or third-party tracking technologies.
                  </p>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Essential Cookies</h4>
                    <p className="text-slate-700">We use session cookies to maintain your authentication state and allow you to use the platform. These cookies are necessary for the service to function.</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Analytics and Tracking</h4>
                    <p className="text-slate-700">We do not collect analytics or tracking data about your behavior. We do not use services like Google Analytics or similar tracking tools.</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Cookie Preferences</h4>
                    <p className="text-slate-700">You can control cookies through your browser settings. Disabling essential cookies will prevent the platform from functioning correctly.</p>
                  </div>
                </div>
              </section>

              <section id="changes-privacy" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">11. Changes to This Privacy Policy</h3>
                <p className="text-sm text-slate-700">
                  We may update this Privacy Policy as our service evolves. We will publish the updated version on this page with an updated "Last Updated" date. If we make material changes, we may notify you via email or a prominent notice on the platform. Your continued use of DataPulse after updates indicates your acceptance of the revised policy.
                </p>
              </section>

              <section id="contact-privacy" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">12. Contact Us</h3>
                <p className="text-sm text-slate-700 mb-3">For privacy questions, data export requests, deletion requests, or concerns about our handling of your data:</p>
                <p className="text-sm text-slate-700">
                  <strong className="text-slate-900">
                    <a href="mailto:datapulseapp@gmail.com" className="hover:underline">
                      datapulseapp@gmail.com
                    </a>
                  </strong>
                </p>
                <p className="text-sm text-slate-700 mt-3">We will respond to your inquiry within 30 days where required by law.</p>
              </section>

              <div className="border-t border-slate-200 pt-12 mt-16">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Terms of Service</h2>

                <section id="tos-acceptance" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">1. Acceptance of Terms</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    By accessing and using DataPulse, you agree to be bound by these Terms of Service. If you do not agree with any provision, you must stop using the platform immediately.
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    These terms apply to all users, including workspace owners and team members. If you access DataPulse on behalf of an organization, you represent that you have the authority to bind that organization to these terms.
                  </p>
                </section>

                <section id="what-provided" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">2. Service Description</h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    DataPulse is a web-based platform designed to help you monitor datasets, detect changes, and analyze trends. The platform is intended for educational use and small teams.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    DataPulse provides:
                  </p>

                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>CSV file upload and version history</li>
                    <li>API data polling and integration</li>
                    <li>PostgreSQL database polling (read-only queries)</li>
                    <li>Automatic schema change detection</li>
                    <li>Data quality checks and metrics</li>
                    <li>Alerts and notifications</li>
                    <li>Workspace collaboration and team management</li>
                    <li>Data export and download functionality</li>
                  </ul>

                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    DataPulse is provided as-is for monitoring and learning purposes. It is not a backup system, data warehouse, or replacement for enterprise data solutions.
                  </p>
                </section>

                <section id="account-access" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">3. Account Responsibility and Security</h3>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    You are solely responsible for maintaining the confidentiality of your account credentials, including passwords and authentication tokens.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    You must not:
                  </p>

                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>Share your password or login credentials with others</li>
                    <li>Allow unauthorized access to your account</li>
                    <li>Permit others to use your account</li>
                  </ul>

                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    If you are added to a workspace as a team member, you agree to access only data you are authorized to view and to follow the workspace owner's access policies. Workspace owners control member permissions and access rights.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    You are responsible for any activity that occurs under your account. Please notify us immediately if you suspect unauthorized access.
                  </p>
                </section>

                <section id="data-sources" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">4. Data Source Requirements</h3>

                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">4.1 API Integration</h4>
                      <p className="text-slate-700 leading-relaxed">
                        You must have the right to access and use any API you connect to DataPulse. You are responsible for ensuring that the API credentials and configuration you provide are authorized for your use and comply with the API provider's terms and policies.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">4.2 Database Access</h4>
                      <p className="text-slate-700 leading-relaxed mb-2">
                        DataPulse supports read-only database queries only. We do not support INSERT, UPDATE, DELETE, or other write operations. This protection helps prevent accidental data loss.
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        If DataPulse detects unsafe queries (such as attempts to write data or access restricted resources), the query will be blocked and polling may be temporarily suspended to protect your database.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">4.3 Data Ownership</h4>
                      <p className="text-slate-700 leading-relaxed">
                        You represent that you have the right to upload, store, and analyze all data in DataPulse. You are responsible for complying with all applicable laws and regulations regarding data you store on the platform.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="usage-limits" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">
                    5. Usage Limits and Free Tier
                  </h3>

                  <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      DataPulse is currently available as a free service. To ensure platform stability and provide equitable access for all users, fair usage limits apply. These limits exist to maintain performance and prevent system overload.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <p className="font-semibold text-slate-900 mb-2">Current Free Tier Limits</p>

                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>
                          <strong>3 workspaces</strong> per account
                        </li>
                        <li>
                          <strong>2 team members</strong> per workspace (in addition to the owner)
                        </li>
                        <li>
                          <strong>50 saved uploads</strong> per workspace
                        </li>
                        <li>
                          <strong>5MB</strong> maximum size per uploaded CSV file
                        </li>
                        <li>
                          <strong>25,000 rows</strong> maximum per database query result
                        </li>
                      </ul>

                      <p className="mt-3 text-slate-700">
                        If you reach a limit, you can delete older uploads to continue using your workspace.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-900 mb-2">Polling Intervals</p>
                      <p>
                        Automatic data polling supports these intervals: <strong>30 minutes</strong>, <strong>1 hour</strong>, <strong>3 hours</strong>, <strong>12 hours</strong>, or <strong>1 day</strong>.
                      </p>
                      <p className="mt-2">
                        If polling repeatedly fails (due to invalid credentials, network issues, or unsafe queries), we may temporarily disable polling to prevent system strain. You will be notified when this occurs.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-900 mb-2">Limit Changes</p>
                      <p>
                        These limits may be modified at any time based on infrastructure costs, platform updates, and user needs. Changes will be reflected on this page.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="acceptable-use" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">6. Acceptable Use Policy</h3>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    You agree to use DataPulse responsibly and in compliance with all applicable laws. Misuse of the platform is prohibited.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    Prohibited activities include:
                  </p>

                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>Abusing polling features to generate excessive traffic or requests</li>
                    <li>Attempting to access workspaces you do not own or belong to</li>
                    <li>Intentionally overloading or disrupting the service</li>
                    <li>Uploading malicious, harmful, or illegal content</li>
                    <li>Using DataPulse to violate laws or infringe on third-party rights</li>
                    <li>Attempting to reverse-engineer or circumvent security measures</li>
                    <li>Scraping or exfiltrating data for purposes other than authorized use</li>
                  </ul>

                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    Violations of this policy may result in suspension or termination of your account. We may restrict access to prevent harm to the platform or other users.
                  </p>
                </section>

                <section id="availability" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">7. Service Availability and Disclaimers</h3>

                  <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      DataPulse is provided on an "as-is" and "as-available" basis. While we work to maintain reliable service, we do not guarantee uninterrupted uptime, error-free operation, or continuous availability.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">Limitations Apply To:</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2 text-slate-700">
                        <li>External data sources (APIs may be unavailable or unreliable)</li>
                        <li>Network connectivity issues beyond our control</li>
                        <li>Third-party service failures</li>
                        <li>Platform maintenance and updates</li>
                      </ul>
                    </div>

                    <p>
                      We are not responsible for delays, interruptions, or failures caused by third-party services, network issues, or external factors.
                    </p>
                  </div>
                </section>

                <section id="export" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">8. Data Export and Downloads</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    DataPulse allows you to export your workspace data and analysis results. Once files are downloaded to your device, you are responsible for securely storing and protecting them. We are not responsible for data loss or unauthorized access to files after download.
                  </p>
                </section>

                <section id="deletion" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">9. Data Deletion and Account Termination</h3>

                  <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      You can delete uploads, workspaces, and your account through the platform interface. Most deletions are permanent and cannot be undone.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">Account Termination</h4>
                      <p>
                        When you delete your account, all associated workspaces, uploads, and data are permanently deleted. Please review this action carefully before confirming.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">DataPulse-Initiated Termination</h4>
                      <p>
                        We may suspend or terminate your account if you violate these terms or engage in misuse. Termination may be immediate and without notice for serious violations.
                      </p>
                    </div>

                    <p>
                      We are not responsible for data loss caused by user-initiated deletion actions.
                    </p>
                  </div>
                </section>

                <section id="liability" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">10. Limitation of Liability</h3>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    To the maximum extent permitted by applicable law:
                  </p>

                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>DataPulse and its operators are not liable for indirect, incidental, special, consequential, or punitive damages</li>
                    <li>We are not responsible for failures or unavailability of third-party services (APIs, databases, hosting providers, networks)</li>
                    <li>We are not responsible for data loss caused by user actions, external factors, or third-party failures</li>
                    <li>We are not liable for business interruption, lost revenue, or lost opportunities</li>
                  </ul>

                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    Some jurisdictions do not permit limitations of liability. Where applicable, we limit our liability to the maximum extent permitted by law.
                  </p>
                </section>

                <section id="changes-terms" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">11. Changes to These Terms</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    We may update these Terms of Service as the platform evolves. The latest version is always available on this page with an updated "Last Updated" date. If we make material changes, we may provide notice via email or a platform announcement. Your continued use of DataPulse indicates acceptance of updated terms.
                  </p>
                </section>

                <section id="governing" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">12. Intellectual Property</h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    DataPulse and all its features, designs, and content are owned by DataPulse or its licensors. You are granted a limited, non-exclusive, non-transferable license to use the platform for its intended purpose.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    You retain ownership of any data you upload to DataPulse. By using the platform, you grant DataPulse the right to store, process, and analyze your data to provide the service.
                  </p>
                </section>

                <section id="governing" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">13. Governing Law and Dispute Resolution</h3>

                  <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      These Terms are governed by and construed in accordance with the laws of <strong>India</strong>, without regard to its conflict of law provisions.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">Dispute Resolution</h4>
                      <p>
                        If a dispute arises, we encourage good-faith resolution through direct communication. Contact us at <a href="mailto:datapulseapp@gmail.com" className="font-medium hover:underline">datapulseapp@gmail.com</a> to discuss the matter.
                      </p>
                      <p className="mt-2">
                        If the dispute cannot be resolved informally, it will be subject to the jurisdiction of courts in India.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="contact-terms" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">14. Contact for Legal Matters</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    For questions about these Terms or legal inquiries:
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    <strong className="text-slate-900">
                      <a href="mailto:datapulseapp@gmail.com" className="hover:underline">
                        datapulseapp@gmail.com
                      </a>
                    </strong>
                  </p>
                </section>
              </div>

            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-600">
          <p className="mb-2">Last updated: January 26, 2026</p>
          <p className="text-xs text-slate-500">© 2026 DataPulse. All rights reserved.</p>
        </div>
      </main>

      <footer className="mt-16 border-t border-slate-200 print:hidden bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold text-slate-900 mb-1">DataPulse</p>
              <p className="text-slate-600">Data monitoring and schema analysis platform</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-2">Documentation</p>
              <div className="space-y-1">
                <a href="#intro" className="block text-slate-600 hover:text-slate-900 transition-colors">Privacy Policy</a>
                <a href="#tos-acceptance" className="block text-slate-600 hover:text-slate-900 transition-colors">Terms of Service</a>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-2">Support</p>
              <a href="mailto:datapulseapp@gmail.com" className="text-slate-600 hover:text-slate-900 transition-colors">datapulseapp@gmail.com</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            <p>Educational project by Subhash Yaganti & Siri Mahalaxmi Vemula</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Legal;
