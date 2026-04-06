"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function VoiceTranscribeButton({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      setError(event.error ? `Voice input error: ${event.error}` : "Voice input failed.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  function toggleListening() {
    if (!recognitionRef.current) {
      return;
    }

    setError(null);

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognitionRef.current.start();
  }

  if (!isSupported) {
    return (
      <p className="text-xs text-civic-muted">
        Browser voice-to-text is unavailable here. You can still upload an audio note.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleListening}
        className={[
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
          isListening ? "bg-civic-danger text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
        ].join(" ")}
      >
        {isListening ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Listening...
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Use voice-to-text
          </>
        )}
      </button>
      {isListening ? (
        <p className="inline-flex items-center gap-2 text-xs text-civic-muted">
          <MicOff className="h-3.5 w-3.5" />
          Speak clearly. We will place the transcript into the complaint description.
        </p>
      ) : null}
      {error ? <p className="text-xs font-medium text-civic-danger">{error}</p> : null}
    </div>
  );
}
