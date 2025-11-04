import React from 'react';

// This component uses inline styles, so no CSS file is needed.
export function WakeUpScreen() {
  return (
    <div style={styles.container}>
      {/* You can replace this with your actual logo */}
      <img 
        src="https://res.cloudinary.com/dggciuh9l/image/upload/v1761320636/profile_pics/fk2abjuswx8kzi01b2dk.png" 
        alt="DataPulse Logo" 
        style={styles.logo} 
      />
      <h2 style={styles.text}>Waking up DataPulse...</h2>
      <p style={styles.subtext}>This may take a moment. Render is spinning up the server.</p>
      
      {/* A simple CSS-based loading bar */}
      <div style={styles.loaderBar}>
        <div style={styles.loaderBarInner}></div>
      </div>
    </div>
  );
}

// --- Styles (CSS-in-JS) ---

// Define keyframes for the animation
const pulseKeyframes = `
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
`;

const slideKeyframes = `
  @keyframes slide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// Create style tags to inject keyframes into the document head
function addAnimationStyles() {
  if (document.getElementById('wakeup-styles')) return; // Run only once
  const styleSheet = document.createElement("style");
  styleSheet.id = "wakeup-styles";
  styleSheet.type = "text/css";
  styleSheet.innerText = pulseKeyframes + slideKeyframes;
  document.head.appendChild(styleSheet);
}

// Call the function to add keyframes
addAnimationStyles();

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0a0a0a', // Dark background
    color: '#ffffff',
    textAlign: 'center',
    padding: '20px',
  },
  logo: {
    width: '80px',
    height: '80px',
    marginBottom: '24px',
    animation: 'pulse 2s infinite ease-in-out', // Pulsing logo
  },
  text: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#f0f0f0',
    margin: 0,
  },
  subtext: {
    fontSize: '0.9rem',
    color: '#888888',
    marginTop: '8px',
  },
  loaderBar: {
    width: '200px',
    height: '4px',
    backgroundColor: '#333',
    borderRadius: '2px',
    marginTop: '24px',
    overflow: 'hidden', // Important for the sliding effect
    position: 'relative',
  },
  loaderBarInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#007bff', // Blue loader
    position: 'absolute',
    animation: 'slide 1.5s infinite linear', // Sliding animation
  },
};