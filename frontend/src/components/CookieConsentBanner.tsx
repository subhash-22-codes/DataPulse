import React from 'react';
import CookieConsent from 'react-cookie-consent';
import { Link } from 'react-router-dom';

export const CookieConsentBanner: React.FC = () => {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Accept All"
      declineButtonText="Decline"
      enableDeclineButton
      cookieName="datapulse-cookie-consent"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        color: '#374151', // text-gray-700
        borderTop: '1px solid #E5E7EB', // border-gray-200
        backdropFilter: 'blur(8px)',
        boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        alignItems: 'center',
      }}
      buttonStyle={{
        background: '#2563EB', // bg-blue-600
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        borderRadius: '8px',
        padding: '10px 24px',
      }}
      declineButtonStyle={{
        background: 'transparent',
        color: '#4B5563', // text-gray-600
        fontSize: '14px',
        fontWeight: '600',
        borderRadius: '8px',
        padding: '10px 24px',
        border: '1px solid #D1D5DB', // border-gray-300
      }}
      expires={150}
    >
      <div className="text-sm max-w-3xl">
        <h4 className="font-semibold text-gray-900">This website uses cookies to enhance your experience.</h4>
        <p className="mt-1 text-gray-600">
          We use essential cookies to ensure our platform functions correctly, such as keeping you logged in. By clicking "Accept All," you agree to our use of these essential cookies. To learn more, please see our{' '}
          <Link to="/legal#privacy" className="font-semibold text-blue-600 hover:underline">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </CookieConsent>
  );
};