import React from "react";

interface PhoneMockupProps {
  framePath: string;
  screenPath: string;
  altText: string;
  className?: string;
  screenTop?: string;
  screenLeft?: string;
  screenWidth?: string;
  screenHeight?: string;
  screenTransform?: string;
}

const PhoneMockup: React.FC<PhoneMockupProps> = ({
  framePath,
  screenPath,
  altText,
  className = "",
  // Default values tightened up for the straight center phone
  screenTop = "top-[9%]",
  screenLeft = "left-[7.5%]",
  screenWidth = "w-[85%]",
  screenHeight = "h-[82%]",
  screenTransform = "",
}) => {
  return (
    <div className={`relative w-full aspect-[1/2] mx-auto ${className}`}>
      <img
        src={screenPath}
        alt={`${altText} Screen`}
        className={`absolute ${screenTop} ${screenLeft} ${screenWidth} ${screenHeight} ${screenTransform} object-cover rounded-[1.2rem] md:rounded-[1.8rem] z-0 origin-center`}
      />
      <img
        src={framePath}
        alt={`${altText} Frame`}
        className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none drop-shadow-2xl"
      />
    </div>
  );
};

export default function AppInterface() {
  return (
    <section className="py-24 bg-slate-50 border-t border-slate-200 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            DataPulse Interface
          </h2>
          <p className="text-slate-600 text-lg">
            Real product UI across devices.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-8">
          
          {/* LEFT PHONE */}
          <div className="w-[200px] md:w-[220px] translate-y-8 md:translate-y-12">
            <PhoneMockup
              framePath="/images/iphone_left.png"
              screenPath="/images/screen2.png"
              altText="Left Interface"
              // Tighter fit for the angled frame
              screenTop="top-[11%]"
              screenLeft="left-[15%]"
              screenWidth="w-[72%]"
              screenHeight="h-[78%]"
              // Sharper perspective to match the 3D frame depth
              screenTransform="[transform:perspective(1200px)_rotateY(18deg)_skewY(-4deg)]"
            />
          </div>

          {/* CENTER PHONE */}
          <div className="w-[240px] md:w-[260px] z-20">
            <PhoneMockup
              framePath="/images/iphone_center.png"
              screenPath="/images/screen1.png"
              altText="Main Interface"
              // Uses the default tighter props defined in the component above
            />
          </div>

          {/* RIGHT PHONE */}
          <div className="w-[200px] md:w-[220px] translate-y-8 md:translate-y-12">
            <PhoneMockup
              framePath="/images/iphone_right.png"
              screenPath="/images/screen3.png"
              altText="Right Interface"
              // Tighter fit for the angled frame
              screenTop="top-[11%]"
              screenLeft="left-[13%]"
              screenWidth="w-[72%]"
              screenHeight="h-[78%]"
              // Sharper perspective to match the 3D frame depth
              screenTransform="[transform:perspective(1200px)_rotateY(-18deg)_skewY(4deg)]"
            />
          </div>

        </div>
      </div>
    </section>
  );
}