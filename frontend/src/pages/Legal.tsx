import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Minus, Printer } from 'lucide-react'; 
import { Link } from 'react-router-dom';

export const Legal: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

  // --- Scroll Spy Logic ---
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
  { id: 'intro', label: '1. Introduction' },
  { id: 'collection', label: '2. Data collection' },
  { id: 'types', label: '3. Types of data processed' },
  { id: 'usage', label: '4. Purpose of processing' },
  { id: 'infrastructure', label: '5. Infrastructure and sub-processors' },
  { id: 'security', label: '6. Security practices' },
  { id: 'terms', label: '7. Terms of service' },
  { id: 'liability', label: '8. Limitation of liability' },
  { id: 'retention', label: '9. Data retention and deletion' },
  { id: 'changes', label: '10. Changes to this policy' },
  { id: 'contact', label: '11. Contact and jurisdiction' },
];


  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-200 selection:text-black">
      
      {/* --- Minimalist Header --- */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">

          {/* Left */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm sm:text-base font-semibold tracking-tight text-slate-900"
            >
              DataPulse
            </Link>

            <div className="h-4 w-px bg-slate-300 hidden sm:block" />

            <span className="hidden sm:block text-xs font-medium text-slate-600">
              Legal Reference
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-2
                text-xs font-medium text-slate-500
                hover:text-slate-900
                transition-colors
                px-3 py-1.5
                border border-slate-200 rounded-md
                focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <Link
              to="/home"
              className="
                inline-flex items-center gap-1.5
                text-[13px] sm:text-xs
                font-medium
                text-white bg-slate-900
                hover:bg-slate-800
                transition-colors
                rounded-md
                px-3 py-1.5
                focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
              "
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Return to App</span>
            </Link>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16">
          
          {/* --- Sidebar TOC (Desktop) --- */}
          <aside className="hidden lg:block lg:col-span-3 print:hidden">
            <nav className="sticky top-28">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                Table of Contents
              </h5>
              <ul className="space-y-1">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`text-left text-sm py-1.5 block w-full transition-colors ${
                        activeSection === item.id
                          ? 'text-black font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* --- Main Document --- */}
          <div className="lg:col-span-8 lg:col-start-4">
            
            {/* Document Header */}
            <div className="mb-10 border-b border-slate-200 pb-6">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                Privacy Policy & Terms of Service
              </h1>

              <p className="mt-3 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                This document explains how DataPulse collects, uses, and protects your data.
                It also outlines the terms that govern your use of the DataPulse platform,
                operated by Subhash Yaganti and Siri Mahalaxmi Vemula.
              </p>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-500">
                <span>Effective: Dec 18, 2025</span>
                <span>Version: 1.0.0</span>
                <span>Jurisdiction: India</span>
              </div>
            </div>


            {/* Content Sections */}
            <div className="space-y-16 text-slate-800 text-[15px] leading-7">
              
              {/* 1. Introduction */}
              <section id="intro" className="scroll-mt-28">
                <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                  1. Introduction
                </h2>

                <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                  <p>
                    DataPulse is a web-based data monitoring and schema analysis tool designed
                    for educational use and small teams. It enables users to track changes in
                    CSV files, API responses, and PostgreSQL databases.
                  </p>

                  <p>
                    We follow the principle of <strong className="font-medium text-slate-800">
                      data minimization
                    </strong>. Only data that is strictly necessary to provide the service is
                    collected. By using DataPulse, you agree to the data practices described
                    in this policy.
                  </p>
                </div>
              </section>


             {/* 2. Data Collection */}
              <section id="collection" className="scroll-mt-28">
                <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                  2. Data collection
                </h2>

                <p className="mb-4 text-sm sm:text-base text-slate-600 max-w-3xl">
                  The table below outlines the types of data processed by DataPulse and
                  whether they are provided directly by users or generated by the system.
                </p>

                {/* Table */}
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left font-medium text-slate-700">
                          Data type
                        </th>
                        <th className="px-3 py-2.5 text-center font-medium text-slate-700 w-28">
                          User provided
                        </th>
                        <th className="px-3 py-2.5 text-center font-medium text-slate-700 w-28">
                          System generated
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium text-slate-700">
                          Purpose
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          Account credentials
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Check className="mx-auto h-4 w-4 text-slate-700" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          Authentication and identity verification.
                        </td>
                      </tr>

                      <tr>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          Raw data (CSV / SQL)
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Check className="mx-auto h-4 w-4 text-slate-700" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          Core monitoring and analysis functionality.
                        </td>
                      </tr>

                      <tr>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          Schema metadata
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Check className="mx-auto h-4 w-4 text-slate-700" />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          Automated change detection and insights.
                        </td>
                      </tr>

                      <tr>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          Email alerts
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Check className="mx-auto h-4 w-4 text-slate-700" />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          Notification delivery via email services.
                        </td>
                      </tr>

                      <tr className="bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          Tracking cookies
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 italic">
                          Not collected or used.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>


              {/* 3. Types of Data Processed */}
                <section id="types" className="scroll-mt-28">
                  <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                    3. Types of data processed
                  </h2>

                  <p className="mb-5 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                    To operate and improve the DataPulse platform, we process the following
                    categories of data. The specific data collected depends on how you use
                    the service.
                  </p>

                  <div className="grid gap-5 sm:grid-cols-2">
                    
                    {/* 3.1 Personal Information */}
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                      <h3 className="mb-2 text-sm font-medium text-slate-900">
                        3.1 Account information
                      </h3>
                      <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                        <li>Name and email address.</li>
                        <li>Passwords stored in a hashed form.</li>
                        <li>Workspace-related metadata (such as roles and permissions).</li>
                      </ul>
                    </div>

                    {/* 3.2 User Content */}
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                      <h3 className="mb-2 text-sm font-medium text-slate-900">
                        3.2 User-provided content
                      </h3>
                      <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                        <li>Uploaded CSV files and structured datasets.</li>
                        <li>Workspace names, descriptions, and configuration settings.</li>
                        <li>Alert rules, thresholds, and monitoring preferences.</li>
                      </ul>
                    </div>

                    {/* 3.3 Connection Details */}
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                      <h3 className="mb-2 text-sm font-medium text-slate-900">
                        3.3 Connection details
                      </h3>
                      <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                        <li>API endpoint URLs.</li>
                        <li>Database connection details (such as host, port, and username).</li>
                        <li>
                          Credentials such as passwords or secrets are stored in encrypted form
                          and used only to establish connections you configure.
                        </li>
                      </ul>
                    </div>

                    {/* 3.4 Authentication & Security Data */}
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                      <h3 className="mb-2 text-sm font-medium text-slate-900">
                        3.4 Authentication and security data
                      </h3>
                      <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                        <li>Authentication tokens and session identifiers.</li>
                        <li>Session cookies used for secure login.</li>
                        <li>Login timestamps and related security logs.</li>
                      </ul>
                    </div>

                  </div>
                </section>


              {/* 4. Purpose of Processing */}
              <section id="usage" className="scroll-mt-28">
                <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                  4. Purpose of processing
                </h2>

                <ul className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                  <li>
                    <span className="font-medium text-slate-800">
                      Core service delivery:
                    </span>{" "}
                    To process uploaded files, connect to configured data sources, and
                    present schema changes and data trends within the platform.
                  </li>

                  <li>
                    <span className="font-medium text-slate-800">
                      Automated alerting:
                    </span>{" "}
                    To send notifications when monitored values, schemas, or thresholds
                    change, including delivery via third-party email services.
                  </li>

                  <li>
                    <span className="font-medium text-slate-800">
                      AI-assisted analysis:
                    </span>{" "}
                    To provide contextual explanations related to schema and metadata changes
                    (for example, describing the purpose of a column based on its name and
                    type).
                    
                    <div className="mt-2 inline-block rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] sm:text-xs text-slate-600">
                      <span className="font-medium text-slate-700">
                        Data limitation:
                      </span>{" "}
                      AI processing is designed to use only high-level metadata such as column
                      names and data types. Raw row-level data and personally identifiable
                      information are not intentionally included in these requests.
                    </div>
                  </li>
                </ul>
              </section>


              {/* 5. Infrastructure & Sub-processors */}
                <section id="infrastructure" className="scroll-mt-28">
                  <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                    5. Infrastructure and sub-processors
                  </h2>

                  <p className="mb-4 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                    DataPulse relies on a limited number of third-party service providers
                    (“sub-processors”) to operate the platform. These providers support core
                    infrastructure and functionality and process data only as necessary to
                    deliver their services.
                  </p>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-2.5 text-left font-medium text-slate-700">
                            Provider
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-700">
                            Purpose
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-700">
                            Data involved
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            Supabase
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            Database and authentication infrastructure
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            User-provided content and secured credentials
                          </td>
                        </tr>

                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            Google Gemini
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            AI-assisted metadata analysis
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            Schema metadata only (no raw data or personal identifiers)
                          </td>
                        </tr>

                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            Brevo
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            Transactional email delivery
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            Email addresses and one-time verification codes
                          </td>
                        </tr>

                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            Cloud hosting providers
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            Application hosting and request handling
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            Application traffic and operational metadata
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-3 text-[11px] sm:text-xs text-slate-500">
                    These providers are selected based on their security posture and
                    are contractually restricted to processing data only on our behalf.
                  </p>
                </section>


              {/* 6. Security */}
              <section id="security" className="scroll-mt-28">
                <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                  6. Security practices
                </h2>

                <p className="mb-4 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                  DataPulse applies reasonable technical and organizational measures designed
                  to protect data against unauthorized access, alteration, or loss.
                </p>

                <div className="space-y-4">
                  {/* Encryption */}
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="mb-1 text-sm font-medium text-slate-900">
                      Data protection
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Sensitive credentials and connection details are stored in encrypted
                      form and handled in accordance with industry-standard security practices.
                    </p>
                  </div>

                  {/* Sessions */}
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="mb-1 text-sm font-medium text-slate-900">
                      Session security
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Authentication sessions are managed using secure cookies and token-based
                      mechanisms designed to reduce exposure to common web-based attacks.
                    </p>
                  </div>

                  {/* Destructive actions */}
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="mb-1 text-sm font-medium text-slate-900">
                      Protection against accidental actions
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Destructive actions, such as workspace deletion, require additional
                      verification steps to help prevent unintended data loss.
                    </p>
                  </div>
                </div>
              </section>

              {/* 7. Terms of Service */}
              <section id="terms" className="scroll-mt-28">
                <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                  7. Terms of service
                </h2>

                <p className="mb-4 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                  By accessing or using DataPulse, you agree to comply with the terms outlined
                  below. These terms are intended to ensure fair use, platform stability,
                  and a safe experience for all users.
                </p>

                {/* 7.1 Usage limits */}
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-medium text-slate-900">
                    7.1 Usage limits (free tier)
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    DataPulse is currently offered as a free service. To maintain reliability
                    and performance, the following usage limits apply:
                  </p>

                  <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-600">
                    <li>Up to <span className="font-medium text-slate-800">3 workspaces</span> per user.</li>
                    <li>Up to <span className="font-medium text-slate-800">2 additional members</span> per workspace.</li>
                    <li>Up to <span className="font-medium text-slate-800">10 active alerts</span> per workspace.</li>
                  </ul>

                  <p className="mt-2 text-xs text-slate-500">
                    These limits may change over time as the platform evolves.
                  </p>
                </div>

                {/* 7.2 Acceptable use */}
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-medium text-slate-900">
                    7.2 Acceptable use
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    You agree to use DataPulse only for lawful purposes. You must not attempt
                    to disrupt the service, introduce malicious code, access systems without
                    authorization, or misuse the platform in a way that could harm other users
                    or the service itself.
                  </p>
                </div>

                {/* 7.3 Eligibility */}
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-medium text-slate-900">
                    7.3 Eligibility
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    You must be at least <span className="font-medium text-slate-800">13 years old</span>
                    to use DataPulse. By using the service, you confirm that you meet this requirement
                    and are capable of understanding and complying with these terms.
                  </p>
                </div>
              </section>


              {/* 8. Limitation of Liability */}
              <section id="liability" className="scroll-mt-28">
                <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                  8. Limitation of liability
                </h2>

                <div className="space-y-4 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                  <p>
                    DataPulse is provided on an <span className="font-medium text-slate-800">“as is”</span> and{" "}
                    <span className="font-medium text-slate-800">“as available”</span> basis.
                    We do not guarantee that the service will be uninterrupted, error-free,
                    or meet your specific requirements.
                  </p>

                  <p>
                    To the extent permitted by applicable law, DataPulse and its operators
                    disclaim all warranties, whether express or implied, including implied
                    warranties of merchantability, fitness for a particular purpose, and
                    non-infringement.
                  </p>

                  <p>
                    To the maximum extent permitted by law, DataPulse and its creators will
                    not be liable for any indirect, incidental, special, consequential, or
                    punitive damages, including loss of data, loss of profits, or service
                    interruption, arising out of or related to your use of the service.
                  </p>
                </div>
              </section>


                {/* 9. Data Retention and Deletion */}
                  <section id="retention" className="scroll-mt-28">
                    <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                      9. Data retention and deletion
                    </h2>

                    <p className="max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                      DataPulse retains user data only for as long as necessary to provide the
                      service and support normal platform operations.
                    </p>

                    <ul className="mt-3 space-y-2 text-sm sm:text-base text-slate-600 leading-relaxed list-disc list-inside">
                      <li>
                        When a workspace is deleted, it is moved to a temporary trash state and
                        retained for up to <span className="font-medium text-slate-800">30 days</span>.
                      </li>
                      <li>
                        During this period, the workspace may be restored by the user.
                      </li>
                      <li>
                        After the retention period expires, the workspace and associated data
                        are permanently removed from the system.
                      </li>
                    </ul>

                    <p className="mt-3 text-xs text-slate-500">
                      At this time, full account deletion and data export features are not yet
                      available but may be introduced in future versions of the platform.
                    </p>
                  </section>
                  
                  {/* 10. Changes to This Policy */}
                    <section id="changes" className="scroll-mt-28">
                      <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                        10. Changes to this policy
                      </h2>

                      <p className="max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                        DataPulse may update these terms and privacy practices from time to time
                        to reflect changes in the platform, legal requirements, or operational
                        needs.
                      </p>

                      <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                        When changes are made, the updated version will be published on this page
                        with a revised effective date. Continued use of the service after changes
                        take effect constitutes acceptance of the updated terms.
                      </p>
                    </section>

                    {/* 9. Contact & Jurisdiction */}
                <section id="contact" className="scroll-mt-28">
                  <h2 className="mb-3 text-base sm:text-lg font-semibold text-slate-900">
                    11. Contact and jurisdiction
                  </h2>

                  <p className="mb-4 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
                    If you have questions about these terms, privacy practices, data deletion
                    requests, or security concerns, you can contact us using the details below.
                  </p>

                  <div className="mb-6">
                    <a
                      href="mailto:datapulseapp@gmail.com"
                      className="inline-block text-sm sm:text-base font-medium text-slate-900 border-b border-slate-300 hover:border-slate-900 transition-colors"
                    >
                      datapulseapp@gmail.com
                    </a>
                  </div>

                  <div className="max-w-3xl text-sm text-slate-500 leading-relaxed">
                    <p className="font-medium text-slate-700 mb-1">
                      Governing law
                    </p>
                    <p>
                      These terms and any disputes arising from the use of DataPulse shall be
                      governed by and construed in accordance with the laws of
                      <span className="font-medium text-slate-700">
                        {" "}India
                      </span>.
                    </p>
                  </div>
                </section>
            </div>
          </div>
        </div>
        <p className="mt-10 text-center text-[11px] text-slate-400">
            Last updated: December 18, 2025
        </p>
      </main>

      {/* --- Footer --- */}
     <footer className="mt-20 border-t border-slate-200 bg-white print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            
            {/* Left */}
            <p>
              © 2025 <span className="font-medium text-slate-700">DataPulse</span>. All rights reserved.
            </p>

            {/* Center links */}
            <div className="flex items-center gap-4">
              <a href="/legal#intro" className="hover:text-slate-900 transition-colors">
                Legal
              </a>
              <a href="/legal#terms" className="hover:text-slate-900 transition-colors">
                Terms
              </a>
              <a href="/legal#contact" className="hover:text-slate-900 transition-colors">
                Contact
              </a>
            </div>

            {/* Right */}
            <p className="text-center sm:text-right">
              Educational project by{" "}
              <span className="text-slate-600">Subhash Yaganti</span> &{" "}
              <span className="text-slate-600">Siri Mahalaxmi Vemula</span>
            </p>
            
          </div>
        </div>
      </footer>

    </div>
  );
};