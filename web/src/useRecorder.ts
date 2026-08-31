import { useCallback, useEffect, useRef, useState } from "react";

/** Picks a container the browser can actually record. Safari differs from Chrome. */
function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

export interface Recorder {
  recording: boolean;
  /** 0-1 input level, for the meter. */
  level: number;
  seconds: number;
  error: string | null;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
}

export function useRecorder(): Recorder {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const teardown = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) clearInterval(timer.current);
    frame.current = null;
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void audioContext.current?.close().catch(() => undefined);
    audioContext.current = null;
    setLevel(0);
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError("This browser cannot record audio.");
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      chunks.current = [];

      const mimeType = pickMimeType();
      const instance = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      instance.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      instance.start();
      recorder.current = instance;

      // Live input level for the meter.
      const context = new AudioContext();
      audioContext.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(media).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128) / 128);
        setLevel(peak);
        frame.current = requestAnimationFrame(tick);
      };
      tick();

      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRecording(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not access the microphone.");
      teardown();
    }
  }, [supported, teardown]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const instance = recorder.current;
    if (!instance) return null;

    const blob = await new Promise<Blob>((resolve) => {
      instance.onstop = () => resolve(new Blob(chunks.current, { type: instance.mimeType }));
      instance.stop();
    });

    recorder.current = null;
    setRecording(false);
    teardown();
    return blob;
  }, [teardown]);

  return { recording, level, seconds, error, supported, start, stop };
}
