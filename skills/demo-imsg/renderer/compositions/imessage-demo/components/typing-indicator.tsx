import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

/**
 * Animated typing indicator (three bouncing dots in a gray bubble).
 * Displayed on Bob's side (left-aligned) before his message appears.
 */

const DOT_SIZE = 20;
const DOT_GAP = 14;
const BUBBLE_PADDING_X = 40;
const BUBBLE_PADDING_Y = 34;
const BUBBLE_WIDTH = DOT_SIZE * 3 + DOT_GAP * 2 + BUBBLE_PADDING_X * 2;
const BUBBLE_HEIGHT = DOT_SIZE + BUBBLE_PADDING_Y * 2;
const BOUNCE_CYCLE = 20; // frames per full bounce cycle

export const TypingIndicator: React.FC<{
  startFrame: number;
  endFrame: number;
}> = ({ startFrame, endFrame }) => {
  const frame = useCurrentFrame();

  if (frame < startFrame || frame >= endFrame) return null;

  const localFrame = frame - startFrame;

  // Fade in over 4 frames
  const opacity = interpolate(localFrame, [0, 4], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        paddingLeft: 40,
        paddingRight: 150,
        marginBottom: 10,
        opacity,
      }}
    >
      <div
        style={{
          width: BUBBLE_WIDTH,
          height: BUBBLE_HEIGHT,
          borderRadius: 50,
          backgroundColor: '#E5E5EA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: DOT_GAP,
        }}
      >
        {[0, 1, 2].map((i) => {
          const dotFrame = localFrame - i * 5; // stagger by 5 frames
          const cycle = dotFrame % BOUNCE_CYCLE;
          const y = interpolate(
            cycle,
            [0, BOUNCE_CYCLE * 0.3, BOUNCE_CYCLE * 0.5, BOUNCE_CYCLE],
            [0, -4, 0, 0],
            { extrapolateRight: 'clamp' },
          );
          const dotOpacity = interpolate(
            cycle,
            [0, BOUNCE_CYCLE * 0.3, BOUNCE_CYCLE * 0.5, BOUNCE_CYCLE],
            [0.4, 0.9, 0.4, 0.4],
            { extrapolateRight: 'clamp' },
          );

          return (
            <div
              key={i}
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_SIZE / 2,
                backgroundColor: '#8E8E93',
                opacity: dotOpacity,
                transform: `translateY(${y}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
