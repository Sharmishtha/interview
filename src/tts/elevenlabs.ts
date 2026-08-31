import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { Panelist } from "../types.js";

/** Default ElevenLabs voice used when a panelist has no voiceId assigned. */
const FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel"

let client: ElevenLabsClient | undefined;

function getClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set (see .env.example).");
    }
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}

/** Synthesizes speech for a panelist asking a question, returning raw audio bytes. */
export async function speakAsPanelist(panelist: Panelist, text: string): Promise<ArrayBuffer> {
  const audio = await getClient().textToSpeech.convert(panelist.voiceId ?? FALLBACK_VOICE_ID, {
    text,
    modelId: "eleven_multilingual_v2",
  });

  const chunks: Uint8Array[] = [];
  for await (const chunk of audio) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).buffer;
}
