import { clientFor } from "../tts/elevenlabs.js";

/**
 * Transcribes a recorded answer with ElevenLabs Scribe.
 *
 * The convert response is a union covering single-channel, multichannel, and
 * webhook shapes; only the single-channel one carries `text` directly. Anything
 * else is an error rather than an empty transcript, so a failed transcription
 * never scores as a silent answer.
 */
export async function transcribe(
  apiKey: string,
  // Pinned to a plain ArrayBuffer so the bytes satisfy BlobPart: a SharedArrayBuffer
  // cannot back a File.
  audio: Uint8Array<ArrayBuffer>,
  contentType = "audio/webm",
): Promise<{ text: string; languageCode?: string }> {
  const extension = contentType.includes("mp4")
    ? "mp4"
    : contentType.includes("ogg")
      ? "ogg"
      : contentType.includes("wav")
        ? "wav"
        : "webm";

  const file = new File([audio], `answer.${extension}`, { type: contentType });

  const response = await clientFor(apiKey).speechToText.convert({
    file,
    modelId: "scribe_v2",
    tagAudioEvents: false,
  });

  if (!("text" in response)) {
    throw new Error("Transcription returned no text for this audio.");
  }

  // Scribe answers with an empty string for silence or audio it cannot use. That
  // is a failed recording, not an empty answer, and saying so beats handing the
  // caller "" - which renders as nothing at all and looks like the app hung.
  if (!response.text.trim()) {
    throw new Error(
      "No speech was detected in that recording. Check your microphone and try again, or type your answer instead.",
    );
  }

  return {
    text: response.text,
    languageCode: "languageCode" in response ? response.languageCode : undefined,
  };
}
