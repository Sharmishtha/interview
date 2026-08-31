import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/** Default ElevenLabs voice used when a panelist has no voiceId assigned. */
export const FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

let client: ElevenLabsClient | undefined;

export function getClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set (see .env.example).");
    }
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}

/**
 * Synthesises a panelist speaking a question, returning MP3 bytes.
 *
 * The SDK hands back a web ReadableStream rather than a Node stream, so it is
 * drained through a reader rather than async iteration.
 */
export async function synthesize(text: string, voiceId?: string): Promise<Buffer> {
  const stream = await getClient().textToSpeech.convert(voiceId ?? FALLBACK_VOICE_ID, {
    text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
  });

  return drain(stream);
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}
