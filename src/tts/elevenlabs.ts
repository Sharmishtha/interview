import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/** Default ElevenLabs voice used when a panelist has no voiceId assigned. */
export const FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// Cached per key. On Workers this lives for the isolate's lifetime; on Node, the
// process's. Both are fine, and it avoids rebuilding the client per request.
const clients = new Map<string, ElevenLabsClient>();

export function clientFor(apiKey: string): ElevenLabsClient {
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set (see .env.example).");
  }
  let client = clients.get(apiKey);
  if (!client) {
    client = new ElevenLabsClient({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

/**
 * Synthesises a panelist speaking a question, returning MP3 bytes.
 *
 * The SDK hands back a web ReadableStream rather than a Node stream, so it is
 * drained through a reader rather than async iteration. Bytes come back as a
 * Uint8Array rather than a Buffer so this runs unchanged on Cloudflare Workers.
 */
export async function synthesize(
  apiKey: string,
  text: string,
  voiceId?: string,
): Promise<Uint8Array> {
  const stream = await clientFor(apiKey).textToSpeech.convert(voiceId ?? FALLBACK_VOICE_ID, {
    text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
  });

  return drain(stream);
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      length += value.length;
    }
  }

  const audio = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.length;
  }
  return audio;
}
