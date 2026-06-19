import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { IMessage, PriorMessage } from '../schemas/manifest';
import { MessageBubble, DateSeparator } from './message-bubble';
import { TypingIndicator } from './typing-indicator';

/**
 * Message list anchored to the bottom (like real iMessage).
 * Prior messages are static. New messages fade in with typing indicators.
 * Overflow is clipped at the top — older messages scroll off naturally.
 */

interface MessageTiming {
  message: IMessage;
  typingStart: number;
  typingEnd: number;
  appearFrame: number;
}

export function calculateTimings(
  messages: IMessage[],
  typingDurationFrames: number,
  pauseBetweenFrames: number,
): { timings: MessageTiming[]; totalFrames: number } {
  const timings: MessageTiming[] = [];
  let currentFrame = 15;

  for (const message of messages) {
    const isBob = message.sender === 'bob';

    if (isBob) {
      const typingStart = currentFrame;
      const typingEnd = typingStart + typingDurationFrames;
      const appearFrame = typingEnd;

      timings.push({ message, typingStart, typingEnd, appearFrame });
      currentFrame = appearFrame + pauseBetweenFrames;
    } else {
      timings.push({ message, typingStart: -1, typingEnd: -1, appearFrame: currentFrame });
      currentFrame += pauseBetweenFrames;
    }
  }

  const totalFrames = currentFrame + 60;
  return { timings, totalFrames };
}

export const MessageList: React.FC<{
  priorMessages?: PriorMessage[];
  dateSeparator?: string;
  timings: MessageTiming[];
  availableHeight: number;
}> = ({ priorMessages, dateSeparator, timings }) => {
  const frame = useCurrentFrame();

  // Determine which new messages + typing indicators to render
  const activeTimings = timings.filter((t) => {
    // Show if message is visible OR its typing indicator is active
    const typingVisible = t.typingStart >= 0 && frame >= t.typingStart;
    const messageVisible = frame >= t.appearFrame;
    return typingVisible || messageVisible;
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          paddingBottom: 30,
          paddingTop: 30,
        }}
      >
        {/* Prior messages (static, always visible) */}
        {priorMessages?.map((msg, i) => (
          <MessageBubble
            key={`prior-${i}`}
            text={msg.text}
            sender={msg.sender}
            appearFrame={0}
            readReceipt={msg.readReceipt}
            isStatic
          />
        ))}

        {/* Date separator */}
        {dateSeparator && <DateSeparator text={dateSeparator} />}

        {/* New messages — only render those whose timing has started */}
        {activeTimings.map((timing, i) => (
          <React.Fragment key={i}>
            {timing.typingStart >= 0 && frame < timing.typingEnd && (
              <TypingIndicator
                startFrame={timing.typingStart}
                endFrame={timing.typingEnd}
              />
            )}
            <MessageBubble
              text={timing.message.text}
              sender={timing.message.sender}
              appearFrame={timing.appearFrame}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
