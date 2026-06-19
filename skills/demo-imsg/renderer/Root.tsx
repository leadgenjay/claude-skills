import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { IMessageDemo } from './compositions/imessage-demo/index';
import { IMessageDemoManifestSchema } from './compositions/imessage-demo/schemas/manifest';
import { calculateTimings } from './compositions/imessage-demo/components/message-list';

/**
 * Minimal Remotion root for the demo-imsg skill — registers ONLY the
 * IMessageDemo composition so the bundle stays self-contained (no other
 * compositions or their dependencies are dragged in).
 *
 * Duration is derived from the message list + timing props so the video is
 * exactly as long as the conversation needs.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="IMessageDemo"
      component={IMessageDemo}
      schema={IMessageDemoManifestSchema}
      defaultProps={{
        version: 1 as const,
        priorMessages: [],
        messages: [
          { sender: 'jay' as const, text: 'Hey, did the carousel post?' },
          { sender: 'bob' as const, text: 'Posted to IG + LinkedIn. 47 likes already.' },
        ],
        contactName: 'Bob',
        typingDurationFrames: 45,
        pauseBetweenFrames: 30,
        outputPreset: {
          name: 'vertical',
          width: 1080,
          height: 1920,
          fps: 30,
          crf: 23,
        },
      }}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={300}
      calculateMetadata={({ props }) => {
        const { totalFrames } = calculateTimings(
          props.messages,
          props.typingDurationFrames ?? 45,
          props.pauseBetweenFrames ?? 30,
        );
        return {
          durationInFrames: totalFrames,
          fps: props.outputPreset?.fps ?? 30,
          width: props.outputPreset?.width ?? 1080,
          height: props.outputPreset?.height ?? 1920,
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
