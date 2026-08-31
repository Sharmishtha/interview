import { getClient } from "../tts/elevenlabs.js";

/**
 * Transcribes a recorded answer with ElevenLabs Scribe.
 *
 * The convert response is a union covering single-channel, multichannel, and
 * webhook shapes; only the single-channel one carries `text` directly.
 */
export async function transcribe(
  audio: Buffer,
  contentType = "audio/webm",
): Promise<{ text: string; languageCode?: string }> {
  const extension = contentType.includes("mp4")
    ? "mp4"
    : contentType.includes("ogg")
      ? "ogg"
      : contentType.includes("wav")
        ? "wav"
        : "webm";

  const file = new File([new Uint8Array(audio)], `answer.${extension}`, { type: contentType });

  const response = await getClient().speechToText.convert({
    file,
    modelId: "scribe_v2",
    tagAudioEvents: false,
  });

  if (!("text" in response)) {
    throw new Error("Transcription returned no text for this audio.");
  }

  return {
    text: response.text,
    languageCode: "languageCode" in response ? response.languageCode : undefined,
  };
}
