import React from 'react';
import CookieConsent from 'react-cookie-consent';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck } from 'lucide-react';

export const CookieConsentBanner: React.FC = () => {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Accept All"
      declineButtonText="Essential Only"
      enableDeclineButton
      cookieName="datapulse-cookie-consent"
      
      // 1. CONTAINER: Glassmorphic, floating feel, clean top border
      containerClasses="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-6 py-5 fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-[100] transition-transform duration-500 ease-out"
      
      // 2. CONTENT WRAPPER: Ensures text doesn't smash into buttons
      contentClasses="flex-1 text-sm text-slate-600 mr-0 md:mr-8"
      
      // 3. BUTTONS: Using !important to override library defaults for a pure Tailwind look
      
      // Primary Button (Accept) - Dark, solid, weightless feel
      buttonClasses="!bg-slate-900 !text-white !text-xs !font-bold !py-2.5 !px-6 !rounded-lg !border !border-transparent hover:!bg-black transition-all !shadow-sm active:!scale-95 !m-0"
      
      // Secondary Button (Decline) - Outline, subtle, gray
      declineButtonClasses="!bg-white !text-slate-600 !text-xs !font-bold !py-2.5 !px-6 !rounded-lg !border !border-slate-200 hover:!bg-slate-50 hover:!text-slate-900 transition-all !shadow-sm active:!scale-95 !m-0 !mr-3"
      
      // Library Settings
      expires={150}
      disableStyles={true} // We take full control via Tailwind classes above
    >
      <div className="flex items-start gap-3">
        {/* Icon for Trust */}
        <div className="hidden sm:flex p-2 bg-blue-50 rounded-full border border-blue-100 shrink-0">
            <Cookie className="w-4 h-4 text-blue-600" />
        </div>

        <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Cookie Preferences
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Secure
                </span>
            </h4>
            <p className="mt-1 leading-relaxed text-slate-500 text-xs sm:text-sm max-w-4xl">
                We use strictly essential cookies to ensure our platform functions correctly (like keeping you logged in). 
                We do not track your personal data for advertising. Read our{' '}
                <Link to="/legal#privacy" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                    Privacy Policy
                </Link>
                {' '}to learn more.
            </p>
        </div>
      </div>
    </CookieConsent>
  );
};