import React from 'react';

/**
 * iPhone 15 Pro frame with Dynamic Island, status bar, and transparent-friendly bezel.
 * Renders children as the phone screen content.
 */

const BEZEL_COLOR = '#1C1C1E';
const SCREEN_BG = '#FFFFFF';
const STATUS_BAR_HEIGHT = 120;
const DYNAMIC_ISLAND_WIDTH = 320;
const DYNAMIC_ISLAND_HEIGHT = 95;
const BEZEL_RADIUS = 140;
const BEZEL_PADDING = 30;

// Phone fills entire canvas — dimensions set dynamically
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

export const IPhoneFrame: React.FC<{
  children: React.ReactNode;
  canvasWidth: number;
  canvasHeight: number;
}> = ({ children, canvasWidth, canvasHeight }) => {
  const phoneX = 0;
  const phoneY = 0;
  const phoneWidth = canvasWidth;
  const phoneHeight = canvasHeight;
  const screenWidth = phoneWidth - BEZEL_PADDING * 2;
  const screenHeight = phoneHeight - BEZEL_PADDING * 2;

  return (
    <div
      style={{
        position: 'absolute',
        left: phoneX,
        top: phoneY,
        width: phoneWidth,
        height: phoneHeight,
        borderRadius: BEZEL_RADIUS,
        backgroundColor: BEZEL_COLOR,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Screen area */}
      <div
        style={{
          position: 'absolute',
          left: BEZEL_PADDING,
          top: BEZEL_PADDING,
          width: screenWidth,
          height: screenHeight,
          borderRadius: BEZEL_RADIUS - 6,
          backgroundColor: SCREEN_BG,
          overflow: 'hidden',
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: (screenWidth - DYNAMIC_ISLAND_WIDTH) / 2,
            width: DYNAMIC_ISLAND_WIDTH,
            height: DYNAMIC_ISLAND_HEIGHT,
            borderRadius: DYNAMIC_ISLAND_HEIGHT / 2,
            backgroundColor: '#000',
            zIndex: 100,
          }}
        />

        {/* Status bar */}
        <StatusBar width={screenWidth} />

        {/* Screen content */}
        <div
          style={{
            position: 'absolute',
            top: STATUS_BAR_HEIGHT,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const StatusBar: React.FC<{ width: number }> = ({ width }) => {
  const time = '9:41';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height: STATUS_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 60px 14px',
        zIndex: 50,
      }}
    >
      {/* Time */}
      <span
        style={{
          fontSize: 38,
          fontWeight: 600,
          fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
          color: '#000',
          letterSpacing: 0.3,
        }}
      >
        {time}
      </span>

      {/* Right icons: signal + wifi + battery */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
};

const SignalIcon: React.FC = () => (
  <svg width="43" height="30" viewBox="0 0 17 12">
    <rect x="0" y="9" width="3" height="3" rx="0.5" fill="#000" />
    <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="#000" />
    <rect x="9" y="3" width="3" height="9" rx="0.5" fill="#000" />
    <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#000" />
  </svg>
);

const WifiIcon: React.FC = () => (
  <svg width="40" height="30" viewBox="0 0 16 12">
    <path
      d="M8 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
      fill="#000"
      transform="translate(0, -2)"
    />
    <path
      d="M4.5 8.5C5.5 7 6.7 6.2 8 6.2s2.5.8 3.5 2.3"
      stroke="#000"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M2 5.5C3.8 3.2 5.8 2 8 2s4.2 1.2 6 3.5"
      stroke="#000"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const BatteryIcon: React.FC = () => (
  <svg width="68" height="33" viewBox="0 0 27 13">
    <rect
      x="0.5"
      y="0.5"
      width="22"
      height="12"
      rx="2.5"
      stroke="#000"
      strokeWidth="1"
      fill="none"
      opacity="0.35"
    />
    <rect x="23.5" y="4" width="2" height="5" rx="1" fill="#000" opacity="0.35" />
    <rect x="2" y="2" width="19" height="9" rx="1.5" fill="#000" />
  </svg>
);

export const PHONE_DIMENSIONS = {
  PHONE_WIDTH,
  PHONE_HEIGHT,
  BEZEL_PADDING,
  STATUS_BAR_HEIGHT,
  SCREEN_WIDTH: PHONE_WIDTH - BEZEL_PADDING * 2,
  SCREEN_HEIGHT: PHONE_HEIGHT - BEZEL_PADDING * 2 - STATUS_BAR_HEIGHT,
};
