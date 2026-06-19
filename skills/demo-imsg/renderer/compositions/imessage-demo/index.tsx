import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { IMessageDemoManifest } from './schemas/manifest';
import { IPhoneFrame } from './components/iphone-frame';
import { IMessageNavBar, IMessageInputBar, CHROME_DIMENSIONS } from './components/imessage-chrome';
import { MessageList, calculateTimings } from './components/message-list';
import { PHONE_DIMENSIONS } from './components/iphone-frame';

/**
 * iMessage Demo — Remotion composition.
 * Renders an iPhone with iMessage UI, animating a conversation between Jay and Bob.
 */
export const IMessageDemo: React.FC<IMessageDemoManifest> = ({
  priorMessages,
  dateSeparator,
  messages,
  contactName,
  contactAvatarPath,
  typingDurationFrames,
  pauseBetweenFrames,
  outputPreset,
}) => {
  const { timings } = calculateTimings(
    messages,
    typingDurationFrames ?? 45,
    pauseBetweenFrames ?? 30,
  );

  const width = outputPreset?.width ?? 1080;
  const height = outputPreset?.height ?? 1920;

  // Available height for messages = screen height - nav - input
  const messageAreaHeight =
    PHONE_DIMENSIONS.SCREEN_HEIGHT -
    CHROME_DIMENSIONS.NAV_HEIGHT -
    CHROME_DIMENSIONS.INPUT_HEIGHT;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      <IPhoneFrame canvasWidth={width} canvasHeight={height}>
        {/* Nav bar */}
        <IMessageNavBar
          contactName={contactName ?? 'Bob'}
          contactAvatarUrl={contactAvatarPath}
        />

        {/* Message area */}
        <div
          style={{
            position: 'absolute',
            top: CHROME_DIMENSIONS.NAV_HEIGHT,
            left: 0,
            right: 0,
            bottom: CHROME_DIMENSIONS.INPUT_HEIGHT,
            backgroundColor: '#FFFFFF',
          }}
        >
          <MessageList
            priorMessages={priorMessages}
            dateSeparator={dateSeparator}
            timings={timings}
            availableHeight={messageAreaHeight}
          />
        </div>

        {/* Input bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <IMessageInputBar />
        </div>
      </IPhoneFrame>
    </AbsoluteFill>
  );
};
