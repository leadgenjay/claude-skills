import { z } from 'zod';

// Inlined from the author's talking-head composition so this renderer is fully
// self-contained (bundled into the demo-imsg skill, 2026-06-19).
export const OutputPresetSchema = z.object({
  name: z.string().default('vertical'),
  width: z.number().default(1080),
  height: z.number().default(1920),
  fps: z.number().default(30),
  codec: z.string().optional(),
  crf: z.number().default(23),
});

// --- Message sender ---

export const MessageSenderSchema = z.enum(['jay', 'bob']);

// --- Single message ---

export const IMessageSchema = z.object({
  sender: MessageSenderSchema,
  text: z.string(),
});

// --- Prior message (already visible, no animation) ---

export const PriorMessageSchema = z.object({
  sender: MessageSenderSchema,
  text: z.string(),
  readReceipt: z.string().optional(), // e.g., "Read 2:34 PM"
});

// --- Main manifest ---

export const IMessageDemoManifestSchema = z.object({
  version: z.literal(1),
  priorMessages: z.array(PriorMessageSchema).default([]),
  dateSeparator: z.string().optional(), // e.g., "Today 9:38 AM"
  messages: z.array(IMessageSchema).min(2),
  contactName: z.string().default('Bob'),
  contactAvatarPath: z.string().optional(),
  typingDurationFrames: z.number().default(45), // 1.5s at 30fps
  pauseBetweenFrames: z.number().default(30),   // 1s at 30fps
  outputPreset: OutputPresetSchema.default({
    name: 'vertical',
    width: 1080,
    height: 1920,
    fps: 30,
    crf: 23,
  }),
});

// --- Export types ---

export type MessageSender = z.infer<typeof MessageSenderSchema>;
export type IMessage = z.infer<typeof IMessageSchema>;
export type PriorMessage = z.infer<typeof PriorMessageSchema>;
export type IMessageDemoManifest = z.infer<typeof IMessageDemoManifestSchema>;
