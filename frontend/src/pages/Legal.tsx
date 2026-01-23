import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Minus, Printer } from 'lucide-react';

export const Legal: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

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
    { id: 'subprocessors', label: 'Sub-processors' },
    { id: 'retention', label: 'Data Retention' },
    { id: 'security', label: 'Security' },
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

            <a
              href="/"
              className="inline-flex items-center gap-2 h-9 px-4 bg-slate-900 text-white rounded-sm text-[11px] font-bold transition-all hover:bg-slate-800 active:scale-[0.95]"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Back</span>
            </a>
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
                DataPulse is a web-based data monitoring and schema analysis tool. This document explains how we collect, use, and protect your data, and the terms governing your use of our platform.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Effective Date</span>
                  <span className="text-slate-700">November 3, 2025</span>
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
                    <h3 className="font-semibold text-slate-900 mb-2 text-base">1) Overview</h3>
                    <p>
                      DataPulse is a web-based data monitoring and schema analysis tool for educational use and small teams. It helps you upload CSV files, poll APIs, poll PostgreSQL databases (read-only queries), detect schema changes, view trends, and export your workspace data.
                    </p>
                    <p className="mt-3">
                      We follow <strong>data minimization</strong>. We only collect and store what is necessary to provide the service and protect accounts.
                    </p>
                  </div>
                </div>
              </section>

              <section id="collection" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">2) Data Collection</h3>
                <p className="text-sm text-slate-700 mb-4">
                  The table below describes what DataPulse processes, how it is obtained, and why it is required.
                </p>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Data Type</th>
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
                        <td className="px-4 py-3 text-slate-700">Authentication, account identity, workspace access</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Password hash (never plain text)</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Secure authentication</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Google/GitHub sign-in info</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Allows sign-in using external providers</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Workspace data (name, members, roles)</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Workspace access control and collaboration</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Uploaded data files (CSV)</td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Core monitoring and export functionality</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Data pulled from your API/Database</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Core monitoring and export functionality</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Column names and data types (schema)</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Change detection and schema visibility</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Summary stats and data quality checks</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Stats, insights, trends, and validation features</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Login activity records</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Security, auditing, and suspicious activity detection</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Notifications</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-700">Updates when schema/metrics/alerts change</td>
                      </tr>

                      <tr className="bg-amber-50">
                        <td className="px-4 py-3 font-medium text-slate-900">Tracking cookies</td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-3 py-3 text-center"><Minus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                        <td className="px-4 py-3 text-slate-600 italic">Not collected or used</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="types" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">3) Types of Data We Process</h3>

                <div className="space-y-5 text-sm">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.1 Account information</h4>
                    <p className="text-slate-700">
                      DataPulse stores basic account information such as your name and email address. If you sign in with Google or GitHub, we store the identifier needed to connect that provider to your DataPulse account.
                    </p>
                    <p className="text-slate-700 mt-2">
                      Passwords are not stored in plain text. They are stored only as secure hashes.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.2 User-provided content</h4>
                    <p className="text-slate-700">
                      DataPulse processes content you explicitly create or upload, including CSV files, workspace names/descriptions, alert rules, and trend tracking selections.
                    </p>
                    <p className="text-slate-700 mt-2">
                      Workspace data is only accessible to the workspace owner and invited team members.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.3 Connection details (API and Database)</h4>
                    <p className="text-slate-700">
                      If you configure API polling or database polling, DataPulse stores the connection configuration you provide. This can include API URLs, header name/value fields, database host/port/username/database name, and the SQL query.
                    </p>
                    <p className="text-slate-700 mt-2">
                      Sensitive values such as database passwords and API secrets are treated as confidential and are intended to be used only to establish the connection you configured.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3.4 Authentication and security data</h4>
                    <p className="text-slate-700">
                      DataPulse may record login timestamps, IP addresses, and basic session information. This is used to secure accounts and help detect unusual activity.
                    </p>
                  </div>
                </div>
              </section>

              <section id="usage" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">4) How We Use Your Data</h3>
                <p className="text-sm text-slate-700 mb-4">DataPulse processes data for the following purposes:</p>

                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p>
                      <strong className="text-slate-900">Core service delivery:</strong> To process uploaded files and polled datasets, detect schema changes, compute analysis summaries, and show results in the dashboard.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong className="text-slate-900">Notifications and alerts:</strong> To notify you when schema changes occur, when monitored values change, or when alerts are triggered.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong className="text-slate-900">AI-assisted explanations (metadata only):</strong> To provide simple explanations about schema changes and dataset signals. DataPulse is designed to use high-level metadata such as column names and column types. Raw row-level data and personal identifiers are not intentionally included in AI requests.
                    </p>
                    <p className="mt-2">
                      DataPulse does not use your data to train AI models.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong className="text-slate-900">Security and account access:</strong> To authenticate users, manage sessions, and prevent unauthorized access.
                    </p>
                  </div>
                </div>
              </section>

              <section id="infrastructure" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">5) Storage and Infrastructure</h3>

                <div className="space-y-5 text-sm leading-relaxed text-slate-700">
                  <p>
                    DataPulse needs two places to keep your information safe: one place for your workspace settings and results,
                    and another place for your actual CSV files.
                  </p>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">5.1 Supabase (PostgreSQL)</h4>
                    <p className="text-slate-700 mb-2">
                      We use Supabase PostgreSQL as our main database. This is where we store the information that makes DataPulse work,
                      like your account, workspace settings, and analysis reports.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <p className="text-slate-700 mb-2 font-medium">Stored here:</p>
                      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2">
                        <li>your account information</li>
                        <li>workspace settings and team access</li>
                        <li>upload history (file names and timestamps)</li>
                        <li>schema info, insights, and quality reports</li>
                        <li>alerts and notifications</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">5.2 Supabase Storage (Private Bucket)</h4>
                    <p className="text-slate-700 mb-2">
                      We store your dataset files (CSV) separately in Supabase Storage. This helps us avoid storing large files directly inside the database.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <p className="text-slate-700 mb-2 font-medium">Stored here:</p>
                      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2">
                        <li>CSV files you upload</li>
                        <li>CSV files generated from API polling</li>
                        <li>CSV files generated from database query polling</li>
                      </ul>
                    </div>

                    <p className="text-slate-700 mt-3">
                      These files are stored in <strong>private storage</strong>. That means they are not public.
                      When you download a file, DataPulse creates a <strong>temporary signed link</strong> only for your account.
                    </p>
                  </div>
                </div>
              </section>


              <section id="subprocessors" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">6) Third-party Services We Use</h3>
                <p className="text-sm text-slate-700 mb-4">DataPulse uses a few trusted third-party services to run the app. They only access data when needed.</p>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Provider</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Purpose</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Data Involved</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Supabase</td>
                        <td className="px-4 py-3 text-slate-700">Database and file storage</td>
                        <td className="px-4 py-3 text-slate-700">Account data, workspace data, dataset files, analysis results</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Google OAuth</td>
                        <td className="px-4 py-3 text-slate-700">Login (Google sign-in)</td>
                        <td className="px-4 py-3 text-slate-700">Email address and account identifier</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">GitHub OAuth</td>
                        <td className="px-4 py-3 text-slate-700">Sign-in provider</td>
                        <td className="px-4 py-3 text-slate-700">Email address and account identifier</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Google Gemini</td>
                        <td className="px-4 py-3 text-slate-700">AI explanation (column info)</td>
                        <td className="px-4 py-3 text-slate-700">Schema metadata only</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-900">Brevo</td>
                        <td className="px-4 py-3 text-slate-700">Transactional emails</td>
                        <td className="px-4 py-3 text-slate-700">Email address, verification codes, notification delivery</td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">Cloud hosting provider</td>
                        <td className="px-4 py-3 text-slate-700">Hosting + request handling</td>
                        <td className="px-4 py-3 text-slate-700">Operational metadata and application traffic</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

             <section id="retention" className="scroll-mt-28">
              <h3 className="font-semibold text-slate-900 mb-4 text-base">7) Data Retention and Deletion</h3>

              <div className="space-y-5 text-sm leading-relaxed text-slate-700">
                <p>
                  We keep your data only as long as needed to run DataPulse for your account. If you delete something, we remove it from your account.
                  This section explains exactly what gets deleted and what stays.
                </p>

                <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">7.1 If you delete a single upload</h4>
                  <p className="text-slate-700">
                    If you delete one uploaded file (example: a CSV you uploaded or a file created from API/DB polling),
                    we remove it from your workspace and delete the stored file (if available).
                  </p>

                  <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2 mt-3">
                    <li>the upload entry is removed from our database</li>
                    <li>the actual file is removed from storage (if it exists)</li>
                    <li>your workspace will still stay active</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">7.2 If you delete a workspace</h4>
                  <p className="text-slate-700">
                    A workspace is like a folder. If you delete a workspace, everything inside it is also removed.
                  </p>

                  <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2 mt-3">
                    <li>all uploads inside that workspace are deleted</li>
                    <li>all files saved for that workspace are deleted from storage</li>
                    <li>alerts, notifications, and workspace settings are deleted</li>
                  </ul>

                  <p className="text-slate-700 mt-3">
                    Deleted workspaces stay in Trash for up to <strong>30 days</strong>. After that, they are permanently deleted.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">7.3 If you delete your account</h4>
                  <p className="text-slate-700">
                    If you delete your account, your DataPulse identity and everything you own are deleted.
                  </p>

                  <ul className="list-disc list-inside text-slate-700 space-y-1 ml-2 mt-3">
                    <li>your account details are removed</li>
                    <li>all workspaces you own are deleted</li>
                    <li>all uploads and stored files are deleted</li>
                  </ul>

                  <p className="text-slate-700 mt-3">
                    Some security logs may be kept for a short time to prevent abuse and protect the platform,
                    and then removed.
                  </p>
                </div>
              </div>
            </section>


             <section id="security" className="scroll-mt-28">
              <h3 className="font-semibold text-slate-900 mb-4 text-base">8) Security</h3>

              <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                <p>
                  We take security seriously and we try to keep your account and your files protected. We use standard protections
                  to reduce the risk of unauthorized access or data loss.
                </p>

                <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">How we protect your data</h4>

                  <p className="text-slate-700">
                    Your password is never stored as plain text. Your account actions are protected behind login checks. Your workspaces
                    are only accessible to you and the team members you add.
                  </p>

                  <p className="text-slate-700 mt-3">
                    Your uploaded files are stored in private storage, and downloads are provided using temporary links to reduce misuse.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Limits for platform stability</h4>

                  <p className="text-slate-700">
                    To keep the app fast and stable (especially on the free plan), we may apply limits like file size limits, row limits,
                    and upload limits per workspace.
                  </p>
                </div>

                <p className="text-slate-700">
                  No system can guarantee perfect security. If you believe your account is compromised, contact{" "}
                  <a href="mailto:datapulseapp@gmail.com" className="font-medium hover:underline">
                    datapulseapp@gmail.com
                  </a>
                  .
                </p>
              </div>
            </section>


              <section id="changes-privacy" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">9) Changes to This Policy</h3>
                <p className="text-sm text-slate-700">
                  We may update this Privacy Policy as DataPulse evolves. If changes are made, the revised version will be published on this page with an updated effective date. Continued use after the update means you accept the new version.
                </p>
              </section>

              <section id="contact-privacy" className="scroll-mt-28">
                <h3 className="font-semibold text-slate-900 mb-4 text-base">10) Contact</h3>
                <p className="text-sm text-slate-700 mb-2">For privacy questions, data export requests, or deletion requests:</p>
                <p className="text-sm text-slate-700">
                  <strong className="text-slate-900">
                    <a href="mailto:datapulseapp@gmail.com" className="hover:underline">
                      datapulseapp@gmail.com
                    </a>
                  </strong>
                </p>
              </section>


              <div className="border-t border-slate-200 pt-12 mt-16">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Terms of Service</h2>

                <section id="tos-acceptance" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">1) Acceptance of Terms</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    By using DataPulse, you agree to these Terms of Service. If you do not agree with these terms, please stop using the platform.
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    These terms apply to all users, including workspace owners and team members.
                  </p>
                </section>

                <section id="what-provided" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">2) What DataPulse Provides</h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    DataPulse helps you track and understand changes in your datasets over time. You can upload files, connect data sources, and view simple summaries and checks.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    Features may include:
                  </p>

                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>uploading CSV files and viewing upload history</li>
                    <li>polling APIs and turning responses into datasets</li>
                    <li>polling PostgreSQL databases using read-only queries</li>
                    <li>schema change detection between uploads</li>
                    <li>basic dataset quality checks (missing values, duplicates)</li>
                    <li>alerts and notifications when changes happen</li>
                    <li>workspace-level export and download tools</li>
                  </ul>

                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    DataPulse is designed for learning, monitoring, and small team usage. It is not a replacement for enterprise backup systems.
                  </p>
                </section>

                <section id="account-access" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">3) Account and Access</h3>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    You are responsible for keeping your account safe. Please do not share your password, login links, or access tokens with anyone.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    If you are invited into a workspace as a team member, you should only access data you are authorized to view.
                    Workspace owners control who can access a workspace and what actions team members are allowed to perform.
                  </p>
                </section>

                <section id="data-sources" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">4) Data Source Rules</h3>

                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">4.1 API sources</h4>
                      <p className="text-slate-700 leading-relaxed">
                        If you connect an API to DataPulse, you must have permission to access and use that data.
                        You are responsible for ensuring that the API credentials you provide are valid and allowed for your use.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">4.2 Database sources</h4>
                      <p className="text-slate-700 leading-relaxed mb-2">
                        If you connect a PostgreSQL database, DataPulse only supports read-only queries. This is done to protect your database
                        and avoid accidental data loss.
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        If unsafe database input is detected, DataPulse may block the query and temporarily disable polling for safety.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="usage-limits" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">
                    5) Usage Limits (Free Tier)
                  </h3>

                  <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      DataPulse is currently offered as a free product. To keep the platform fast and stable for everyone, we apply fair
                      usage limits.
                    </p>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                      <p className="font-semibold text-slate-900 mb-2">Your current free limits</p>

                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>
                          Up to <strong>3 workspaces</strong> per account
                        </li>
                        <li>
                          Up to <strong>2 team members</strong> per workspace
                        </li>
                        <li>
                          Up to <strong>50 saved uploads</strong> per workspace
                        </li>
                        <li>
                          CSV upload size limit: <strong>5MB</strong> per file
                        </li>
                        <li>
                          Database polling query limit: <strong>25,000 rows</strong> per run
                        </li>
                      </ul>

                      <p className="mt-3 text-slate-700">
                        If you hit a limit, you can delete older uploads and continue using the workspace.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-900 mb-2">Polling limits</p>
                      <p>
                        Polling (automatic refresh) depends on the interval you select. You can choose:
                        <strong> 30 minutes</strong>, <strong>1 hour</strong>, <strong>3 hours</strong>, <strong>12 hours</strong>, or{" "}
                        <strong>1 day</strong>.
                      </p>
                      <p className="mt-2">
                        If polling causes repeated failures (for example: invalid API key, unreachable database, or unsafe query), we may
                        temporarily disable polling for that workspace to prevent system overload.
                      </p>
                    </div>

                    <p className="text-slate-700">
                      These limits may change over time based on infrastructure costs and product updates. If we change the limits, we
                      will update this page.
                    </p>
                  </div>
                </section>


                <section id="acceptable-use" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">6) Acceptable Use</h3>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    You agree to use DataPulse in a responsible and lawful way. You must not misuse the platform or attempt to harm it.
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    Examples of behavior that is not allowed:
                  </p>

                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>abusing polling features to generate excessive traffic</li>
                    <li>trying to access workspaces that you do not own or belong to</li>
                    <li>attempting to overload the service intentionally</li>
                    <li>uploading harmful files or malicious content</li>
                    <li>using DataPulse to violate laws or third-party rights</li>
                  </ul>

                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    If misuse is detected, we may restrict access or suspend accounts to protect the platform.
                  </p>
                </section>

                <section id="availability" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">7) Availability and Reliability</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    DataPulse is provided on an "as is" and "as available" basis. We work to keep the product stable, but we do not guarantee
                    uninterrupted service, error-free results, or continuous uptime.
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    This is especially important for external sources like APIs and databases, where failures can happen due to network issues,
                    provider downtime, or invalid credentials.
                  </p>
                </section>

                <section id="export" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">8) Export and Downloads</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    DataPulse allows you to download your workspace data and related exports. Once you download a file to your device,
                    you are responsible for storing it safely.
                  </p>
                </section>

                <section id="deletion" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">9) Deletion and Removal</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    You can delete uploads, workspaces, and your account from inside the platform. Some deletions may be permanent and cannot be undone.
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed mt-3">
                    Please review actions carefully before confirming deletions. DataPulse is not responsible for data loss caused by user deletion actions.
                  </p>
                </section>

                <section id="liability" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">10) Limitation of Liability</h3>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    To the maximum extent permitted by applicable law:
                  </p>

                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>DataPulse and its operators are not responsible for indirect, special, or consequential damages</li>
                    <li>we are not responsible for failures of third-party services (APIs, databases, hosting, network issues)</li>
                    <li>we are not responsible for loss of data caused by external factors or user actions</li>
                  </ul>
                </section>

                <section id="changes-terms" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">11) Changes to These Terms</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    We may update these Terms over time. The latest version will always be available on this page with an updated effective date.
                    If you continue using DataPulse after an update, it means you accept the updated terms.
                  </p>
                </section>

                <section id="governing" className="scroll-mt-28 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4 text-base">12) Governing Law and Contact</h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    These Terms are governed by the laws of India.
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    For support or legal issues:{" "}
                    <a href="mailto:datapulseapp@gmail.com" className="text-slate-900 font-medium hover:underline">
                      datapulseapp@gmail.com
                    </a>
                  </p>
                </section>
              </div>


            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-600">
          <p className="mb-2">Last updated: January 23, 2026</p>
          <p className="text-xs text-slate-500">© 2026 DataPulse. All rights reserved.</p>
        </div>
      </main>

      <footer className="mt-16 border-t border-slate-200 print:hidden bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold text-slate-900 mb-1">DataPulse</p>
              <p className="text-slate-600">Data monitoring & schema analysis</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-2">Documentation</p>
              <div className="space-y-1">
                <a href="#intro" className="block text-slate-600 hover:text-slate-900 transition-colors">Privacy Policy</a>
                <a href="#tos-acceptance" className="block text-slate-600 hover:text-slate-900 transition-colors">Terms of Service</a>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-2">Contact</p>
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
