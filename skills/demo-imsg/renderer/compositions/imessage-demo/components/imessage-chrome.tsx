import React from 'react';

/**
 * iMessage chrome — top navigation bar + bottom input bar.
 * Purely decorative (no interactivity).
 */

const NAV_HEIGHT = 130;
const INPUT_HEIGHT = 140;
const BLUE = '#007AFF';

export const IMessageNavBar: React.FC<{
  contactName: string;
  contactAvatarUrl?: string;
}> = ({ contactName, contactAvatarUrl }) => {
  return (
    <div
      style={{
        height: NAV_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '0.5px solid rgba(0,0,0,0.12)',
        backgroundColor: '#F6F6F6',
        position: 'relative',
      }}
    >
      {/* Back button */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg width="30" height="50" viewBox="0 0 12 20">
          <path
            d="M10 2L2 10L10 18"
            stroke={BLUE}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontSize: 42,
            color: BLUE,
            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
          }}
        >
          Messages
        </span>
      </div>

      {/* Contact name + avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {/* Avatar circle */}
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: contactAvatarUrl ? 'transparent' : '#8E8E93',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {contactAvatarUrl ? (
            <img
              src={contactAvatarUrl}
              style={{ width: 70, height: 70, objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: 34,
                fontWeight: 600,
                color: '#FFF',
                fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
              }}
            >
              {contactName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#000',
            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
          }}
        >
          {contactName}
        </span>
      </div>
    </div>
  );
};

export const IMessageInputBar: React.FC = () => {
  return (
    <div
      style={{
        height: INPUT_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        padding: '0 30px',
        gap: 20,
        borderTop: '1px solid rgba(0,0,0,0.12)',
        backgroundColor: '#F6F6F6',
      }}
    >
      {/* Camera icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#E5E5EA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="44" height="34" viewBox="0 0 18 14">
          <path
            d="M2 3h2l1-2h8l1 2h2a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z"
            stroke="#8E8E93"
            strokeWidth="1.2"
            fill="none"
          />
          <circle cx="9" cy="7.5" r="2.5" stroke="#8E8E93" strokeWidth="1.2" fill="none" />
        </svg>
      </div>

      {/* Input field */}
      <div
        style={{
          flex: 1,
          height: 90,
          borderRadius: 45,
          border: '2px solid rgba(0,0,0,0.15)',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 36,
        }}
      >
        <span
          style={{
            fontSize: 40,
            color: '#8E8E93',
            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
          }}
        >
          iMessage
        </span>
      </div>

      {/* Send button */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 16 16">
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="#FFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
};

export const CHROME_DIMENSIONS = {
  NAV_HEIGHT,
  INPUT_HEIGHT,
};
