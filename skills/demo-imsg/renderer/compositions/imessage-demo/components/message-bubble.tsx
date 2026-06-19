import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import type { MessageSender } from '../schemas/manifest';

/**
 * Single iMessage bubble with slide-up + fade-in animation.
 * Blue (right) for Jay, gray (left) for Bob.
 */

const BLUE = '#007AFF';
const GRAY = '#E5E5EA';
const MAX_BUBBLE_WIDTH = '75%';

export const MessageBubble: React.FC<{
  text: string;
  sender: MessageSender;
  appearFrame: number;
  readReceipt?: string;
  isStatic?: boolean;
}> = ({ text, sender, appearFrame, readReceipt, isStatic }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isJay = sender === 'jay';
  const localFrame = frame - appearFrame;

  if (!isStatic && localFrame < 0) return null;

  let opacity = 1;

  if (!isStatic) {
    const progress = spring({
      frame: localFrame,
      fps,
      config: {
        damping: 28,
        stiffness: 180,
        mass: 0.8,
      },
    });

    opacity = interpolate(progress, [0, 1], [0, 1]);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isJay ? 'flex-end' : 'flex-start',
        paddingLeft: isJay ? 150 : 40,
        paddingRight: isJay ? 40 : 150,
        marginBottom: readReceipt ? 4 : 10,
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: MAX_BUBBLE_WIDTH,
          padding: '24px 40px',
          borderRadius: 50,
          borderTopLeftRadius: isJay ? 50 : 14,
          borderTopRightRadius: isJay ? 14 : 50,
          borderBottomLeftRadius: 50,
          borderBottomRightRadius: 50,
          backgroundColor: isJay ? BLUE : GRAY,
          color: isJay ? '#FFFFFF' : '#000000',
          fontSize: 42,
          fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
          lineHeight: 1.35,
          letterSpacing: -0.3,
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
      {readReceipt && (
        <span
          style={{
            fontSize: 24,
            color: '#8E8E93',
            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
            marginTop: 4,
            paddingRight: isJay ? 8 : 0,
            paddingLeft: isJay ? 0 : 8,
          }}
        >
          {readReceipt}
        </span>
      )}
    </div>
  );
};

/**
 * Date separator — gray centered text like "Today 9:38 AM"
 */
export const DateSeparator: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '20px 0',
    }}
  >
    <span
      style={{
        fontSize: 26,
        color: '#8E8E93',
        fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
        fontWeight: 500,
      }}
    >
      {text}
    </span>
  </div>
);
