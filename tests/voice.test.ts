import { beforeEach, describe, expect, it, vi } from "vitest";

const convertTts = vi.fn();
const convertStt = vi.fn();

vi.mock("@elevenlabs/elevenlabs-js", () => ({
  ElevenLabsClient: class {
    textToSpeech = { convert: convertTts };
    speechToText = { convert: convertStt };
  },
}));

const KEY = "test-key";

/** Bytes as the routes supply them: a Uint8Array over a plain ArrayBuffer. */
function bytes(values: number[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(values.length));
  out.set(values);
  return out;
}

/** The SDK hands back a web ReadableStream, not a Node stream. */
function webStream(chunks: number[][]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
      controller.close();
    },
  });
}

describe("text to speech", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // The key is now passed explicitly rather than read from the environment,
    // which is what lets the same code run on Cloudflare Workers.
  });

  it("drains a web ReadableStream into a buffer", async () => {
    convertTts.mockResolvedValue(webStream([[1, 2], [3], [4, 5]]));
    const { synthesize } = await import("../src/tts/elevenlabs.js");

    const audio = await synthesize(KEY, "hello", "voice-1");

    expect([...audio]).toEqual([1, 2, 3, 4, 5]);
  });

  it("asks for the requested voice", async () => {
    convertTts.mockResolvedValue(webStream([[0]]));
    const { synthesize } = await import("../src/tts/elevenlabs.js");

    await synthesize(KEY, "a question", "voice-abc");

    expect(convertTts).toHaveBeenCalledWith("voice-abc", expect.objectContaining({ text: "a question" }));
  });

  it("falls back to the default voice when a panelist has none", async () => {
    convertTts.mockResolvedValue(webStream([[0]]));
    const { synthesize, FALLBACK_VOICE_ID } = await import("../src/tts/elevenlabs.js");

    await synthesize(KEY, "a question");

    expect(convertTts).toHaveBeenCalledWith(FALLBACK_VOICE_ID, expect.anything());
  });

  it("refuses to run without an API key", async () => {
    const { synthesize } = await import("../src/tts/elevenlabs.js");

    await expect(synthesize("", "hello")).rejects.toThrow(/ELEVENLABS_API_KEY/);
  });
});

describe("speech to text", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // The key is now passed explicitly rather than read from the environment,
    // which is what lets the same code run on Cloudflare Workers.
  });

  it("returns the transcript from the single-channel response", async () => {
    convertStt.mockResolvedValue({ text: "my answer", languageCode: "eng" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    const result = await transcribe(KEY, bytes([1, 2, 3]));

    expect(result.text).toBe("my answer");
    expect(result.languageCode).toBe("eng");
  });

  it("throws rather than returning silence when the response carries no text", async () => {
    // The convert response is a union; the webhook and multichannel shapes have no `text`.
    convertStt.mockResolvedValue({ requestId: "abc" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    await expect(transcribe(KEY, bytes([1]))).rejects.toThrow(/no text/i);
  });

  it.each([[""], ["   "], ["\n\t "]])(
    "rejects an empty transcript (%j) instead of passing it on",
    async (text) => {
      // Scribe returns "" for silence. Passing that through renders as nothing at
      // all, which reads as the app hanging rather than a failed recording.
      convertStt.mockResolvedValue({ text });
      const { transcribe } = await import("../src/stt/elevenlabs.js");

      await expect(transcribe(KEY, bytes([1]))).rejects.toThrow(/no speech was detected/i);
    },
  );

  it("keeps a transcript that only looks sparse", async () => {
    convertStt.mockResolvedValue({ text: "Yes." });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    expect((await transcribe(KEY, bytes([1]))).text).toBe("Yes.");
  });

  it("names the uploaded file for the container the browser recorded", async () => {
    convertStt.mockResolvedValue({ text: "an answer" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    for (const [contentType, extension] of [
      ["audio/webm;codecs=opus", "webm"],
      ["audio/mp4", "mp4"],
      ["audio/ogg", "ogg"],
      ["audio/wav", "wav"],
    ] as const) {
      convertStt.mockClear();
      await transcribe(KEY, bytes([1]), contentType);
      const file = convertStt.mock.calls[0][0].file as File;
      expect(file.name).toBe(`answer.${extension}`);
      expect(file.type).toBe(contentType);
    }
  });

  it("sends the audio bytes through intact", async () => {
    convertStt.mockResolvedValue({ text: "an answer" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    await transcribe(KEY, bytes([9, 8, 7]));

    const file = convertStt.mock.calls[0][0].file as File;
    expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([9, 8, 7]);
  });
});
