import { beforeEach, describe, expect, it, vi } from "vitest";

const convertTts = vi.fn();
const convertStt = vi.fn();

vi.mock("@elevenlabs/elevenlabs-js", () => ({
  ElevenLabsClient: class {
    textToSpeech = { convert: convertTts };
    speechToText = { convert: convertStt };
  },
}));

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
    process.env.ELEVENLABS_API_KEY = "test-key";
  });

  it("drains a web ReadableStream into a buffer", async () => {
    convertTts.mockResolvedValue(webStream([[1, 2], [3], [4, 5]]));
    const { synthesize } = await import("../src/tts/elevenlabs.js");

    const audio = await synthesize("hello", "voice-1");

    expect([...audio]).toEqual([1, 2, 3, 4, 5]);
  });

  it("asks for the requested voice", async () => {
    convertTts.mockResolvedValue(webStream([[0]]));
    const { synthesize } = await import("../src/tts/elevenlabs.js");

    await synthesize("a question", "voice-abc");

    expect(convertTts).toHaveBeenCalledWith("voice-abc", expect.objectContaining({ text: "a question" }));
  });

  it("falls back to the default voice when a panelist has none", async () => {
    convertTts.mockResolvedValue(webStream([[0]]));
    const { synthesize, FALLBACK_VOICE_ID } = await import("../src/tts/elevenlabs.js");

    await synthesize("a question");

    expect(convertTts).toHaveBeenCalledWith(FALLBACK_VOICE_ID, expect.anything());
  });

  it("refuses to run without an API key", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const { synthesize } = await import("../src/tts/elevenlabs.js");

    await expect(synthesize("hello")).rejects.toThrow(/ELEVENLABS_API_KEY/);
  });
});

describe("speech to text", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = "test-key";
  });

  it("returns the transcript from the single-channel response", async () => {
    convertStt.mockResolvedValue({ text: "my answer", languageCode: "eng" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    const result = await transcribe(Buffer.from([1, 2, 3]));

    expect(result.text).toBe("my answer");
    expect(result.languageCode).toBe("eng");
  });

  it("throws rather than returning silence when the response carries no text", async () => {
    // The convert response is a union; the webhook and multichannel shapes have no `text`.
    convertStt.mockResolvedValue({ requestId: "abc" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    await expect(transcribe(Buffer.from([1]))).rejects.toThrow(/no text/i);
  });

  it("names the uploaded file for the container the browser recorded", async () => {
    convertStt.mockResolvedValue({ text: "" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    for (const [contentType, extension] of [
      ["audio/webm;codecs=opus", "webm"],
      ["audio/mp4", "mp4"],
      ["audio/ogg", "ogg"],
      ["audio/wav", "wav"],
    ] as const) {
      convertStt.mockClear();
      await transcribe(Buffer.from([1]), contentType);
      const file = convertStt.mock.calls[0][0].file as File;
      expect(file.name).toBe(`answer.${extension}`);
      expect(file.type).toBe(contentType);
    }
  });

  it("sends the audio bytes through intact", async () => {
    convertStt.mockResolvedValue({ text: "" });
    const { transcribe } = await import("../src/stt/elevenlabs.js");

    await transcribe(Buffer.from([9, 8, 7]));

    const file = convertStt.mock.calls[0][0].file as File;
    expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([9, 8, 7]);
  });
});
