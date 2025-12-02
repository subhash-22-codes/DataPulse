import React, { useState, useEffect, useRef, memo } from 'react';
import { useInView } from './hooks/useInView'; 
const DirectDbIllustration = React.lazy(() => import('./Illustrations/DirectDbIllustration')); 
const AiSchemaIllustration = React.lazy(() => import('./Illustrations/AiSchemaIllustration'));
const RbacIllustration = React.lazy(() => import('./Illustrations/RbacIllustration'));
const WebsocketIllustration = React.lazy(() => import('./Illustrations/WebsocketIllustration'));
const AlertIllustration = React.lazy(() => import('./Illustrations/AlertIllustration'));
const TimezoneIllustration = React.lazy(() => import('./Illustrations/TimezoneIllustration'));
const AuditLogsIllustration = React.lazy(() => import('./Illustrations/AuditLogsIllustration'));
const TeamIllustration = React.lazy(() => import('./Illustrations/TeamIllustration'));
const ApiPollIllustration = React.lazy(() => import('./Illustrations/ApiPollIllustration'));
const CsvUploadIllustration = React.lazy(() => import('./Illustrations/CsvUploadIllustration'));
const SmartAlertIllustration = React.lazy(() => import('./Illustrations/SmartAlertIllustration'));
const OpenSourceIllustration = React.lazy(() => import('./Illustrations/OpenSourceIllustration'));
/**
 * BATTERY SAVER HOOK
 * * UPGRADE: Increased margin to '200px'.
 * This "Pre-loads" the SVG when it is 200px away from the screen.
 * Prevents white flashes while scrolling fast, but still unmounts
 * when far away to save battery.
 */
function useLiveInView({ threshold = 0.1, rootMargin = "200px" } = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isInView] as const;
}

/**
 * OPTIMIZED WRAPPER (Memoized)
 * * UPGRADE: Wrapped in React.memo.
 * This prevents the heavy SVGs from re-rendering if the parent 
 * component updates but the props for this wrapper haven't changed.
 */
const OptimizedIllustrationWrapper = memo(({ children }: { children: React.ReactNode }) => {
  const [ref, isVisible] = useLiveInView();

  return (
    <div 
      ref={ref} 
      // REMOVED "will-change-contents" from the class below
      className="w-full h-full flex items-center justify-center"
    >
      {isVisible ? children : null}
    </div>
  );
});

// Display name for debugging tools
OptimizedIllustrationWrapper.displayName = 'OptimizedIllustrationWrapper';

const BentoItem: React.FC<{
  Illustration: React.ElementType;
  title: string;
  description: string;
  className?: string;
  delay: number;
}> = ({ Illustration, title, description, className = "", delay }) => {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      // UPGRADE: Added 'will-change-transform' to help GPU compositing during the hover animation
      className={`group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm
                  hover:shadow-2xl hover:shadow-slate-900/5 hover:border-slate-300
                  transition-all duration-500 ease-out will-change-transform
                  flex flex-col h-full overflow-hidden
                  ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[20px]'}
                  ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="relative h-48 w-full bg-gradient-to-br from-slate-50/80 via-white to-slate-50/80 border-b border-slate-100
                      group-hover:from-blue-50/40 group-hover:via-white group-hover:to-slate-50/60
                      transition-all duration-700 ease-out overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent
                         opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
         
         <div className="relative w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out">
            <OptimizedIllustrationWrapper>
               <Illustration />
            </OptimizedIllustrationWrapper>
         </div>
      </div>

      <div className="p-6 sm:p-7 lg:p-8 flex flex-col flex-grow">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2.5 sm:mb-3 tracking-tight
                       leading-snug group-hover:text-blue-700 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </div>
  );
};

export default function Features() {

  const features = [
    { Illustration: CsvUploadIllustration, title: 'CSV Uploads', description: 'Quickly upload CSV files to visualize and analyze data without needing a database connection.' },
    { Illustration: ApiPollIllustration, title: 'API Polling', description: 'Easily poll external APIs and integrate the data alongside your database metrics.' },
    { Illustration: DirectDbIllustration, title: 'Direct DB Connection', description: 'Connect directly to your PostgreSQL database. No complex middleware required. We handle the secure handshake.' },
    { Illustration: AiSchemaIllustration, title: 'Schema Detection', description: 'Pandas detects your schema structure, while Gemini AI analyzes patterns and provides actionable insights.' },
    { Illustration: RbacIllustration, title: 'Role-Based Access', description: 'Granular permission controls ensure team members only see the data tables they are authorized to view.' },
    { Illustration: WebsocketIllustration, title: 'Real-Time WebSockets', description: 'Experience zero-refresh updates. As soon as data changes in your DB, it reflects on your dashboard.' },
    { Illustration: AlertIllustration, title: 'Alerts & Notifications', description: 'Receive instant email notifications via Brevo whenever schema drifts are detected or critical metrics update.' },
    { Illustration: TimezoneIllustration, title: 'Timezone Aware', description: 'Automatic timezone conversion ensures your global team sees timestamps in their local time.' },
    { Illustration: AuditLogsIllustration, title: 'Audit Logs', description: 'Comprehensive logging of every query and interaction for security compliance.' },
    { Illustration: TeamIllustration, title: 'Team Workspaces', description: 'Create separate workspaces for different projects and invite your team to collaborate.' },
    { Illustration: SmartAlertIllustration, title: 'Smart Data Alerts', description: 'Create rules and get automatic Brevo email alerts when your data matches them—simple, smart, and effortless.' },
    { Illustration: OpenSourceIllustration, title: 'Open Source', description: 'Built on open-source technologies, ensuring transparency, flexibility, and community-driven improvements.' },
  ];

  const [headerRef, isHeaderVisible] = useInView({ threshold: 0.2 });

  return (
    <section id="features" className="relative py-16 sm:py-20 lg:py-28 xl:py-32 px-4 sm:px-6 lg:px-12 xl:px-16 overflow-hidden bg-white">
      {/* Background patterns kept identical to your code */}
      <div className="absolute inset-0 pointer-events-none">
         <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
         />
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] sm:h-[500px]
                         bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">

        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-20 transition-all duration-700
                      ${isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'}`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                          bg-slate-50 border border-slate-200
                          text-slate-600 text-xs font-bold uppercase tracking-wider
                          mb-4 sm:mb-5 lg:mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Capabilities
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-900
                         mb-4 sm:mb-5 lg:mb-6 tracking-tight leading-tight px-4 sm:px-0">
            Everything you need to <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-700">
              Master Your Data
            </span>
          </h2>

          <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto px-4 sm:px-0">
            Stop juggling between SQL clients and admin panels. DataPulse brings your database health,
            logs, and metrics into one unified, intelligent view.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 xl:gap-7">
          {features.map((feature, index) => (
            <BentoItem
              key={index}
              {...feature}
              delay={100 + (index * 50)}
            />
          ))}
        </div>

      </div>
    </section>
  );
}