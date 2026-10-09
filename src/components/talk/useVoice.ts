"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LangCode } from "@/lib/ai/schemas";
import { LANG_NAME, speak, startListening, voiceSupport, type Listener, type SpeakHandle } from "@/lib/voice";

/** Below this the browser was unsure what it heard, so the words go in the box to be checked, not straight to Sandhi. */
export const MIN_CONFIDENCE = 0.6;

export interface VoiceOptions {
  lang: LangCode;
  /** Called with what was heard. Return nothing; the page decides whether to send it or show it for checking. */
  onHeard: (text: string, confidence: number | null) => void;
  /** Plain-words messages for the person (blocked mic, no voice installed, and so on). */
  onNotice: (message: string) => void;
}

export function useVoice({ lang, onHeard, onNotice }: VoiceOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceOn, setVoiceOnState] = useState(false);
  // What this browser can do. Nothing is assumed while the server builds the page.
  const supportKey = useSyncExternalStore(
    () => () => {},
    () => {
      const s = voiceSupport();
      return `${s.listen ? 1 : 0}${s.speak ? 1 : 0}`;
    },
    () => "00",
  );
  const support = { listen: supportKey[0] === "1", speak: supportKey[1] === "1" };

  const langRef = useRef(lang);
  const heardRef = useRef(onHeard);
  const noticeRef = useRef(onNotice);
  // Keep the latest values where the microphone callbacks can read them.
  useEffect(() => {
    langRef.current = lang;
    heardRef.current = onHeard;
    noticeRef.current = onNotice;
  });
  const voiceOnRef = useRef(false);
  const listener = useRef<Listener | null>(null);
  const talker = useRef<SpeakHandle | null>(null);
  const noVoiceTold = useRef<string>("");

  const setVoiceOn = useCallback((on: boolean) => {
    voiceOnRef.current = on;
    setVoiceOnState(on);
    if (!on) {
      talker.current?.cancel();
      talker.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    const t = talker.current;
    talker.current = null;
    t?.cancel();
    setSpeaking(false);
  }, []);

  const stopListening = useCallback(() => listener.current?.stop(), []);

  const cancelAll = useCallback(() => {
    listener.current?.abort();
    listener.current = null;
    setListening(false);
    setInterim("");
    stopSpeaking();
  }, [stopSpeaking]);

  useEffect(() => cancelAll, [cancelAll]);

  const startMic = useCallback(() => {
    if (!voiceSupport().listen) {
      noticeRef.current("Voice input does not work in this browser. Please use Chrome, Edge or Safari, or type your message.");
      return;
    }
    stopSpeaking(); // never listen to our own voice
    setInterim("");
    const l = startListening(langRef.current, {
      onInterim: (t) => setInterim(t),
      onFinal: (t, c) => heardRef.current(t, c),
      onError: (m) => noticeRef.current(m),
      onEnd: () => {
        listener.current = null;
        setListening(false);
        setInterim("");
      },
    });
    if (l) {
      listener.current = l;
      setListening(true);
      setVoiceOn(true); // talking to Sandhi means Sandhi talks back; the switch below turns it off
    }
  }, [setVoiceOn, stopSpeaking]);

  /** The microphone button: listen, or finish listening, or cut Sandhi off and listen. */
  const toggleMic = useCallback(() => {
    if (listener.current) stopListening();
    else startMic();
  }, [startMic, stopListening]);

  const speakReply = useCallback(
    (text: string) => {
      if (!voiceOnRef.current || !voiceSupport().speak) return;
      talker.current?.cancel();
      const l = langRef.current;
      const h = speak(text, l, {
        onStart: () => setSpeaking(true),
        onDone: () => {
          if (talker.current === h) talker.current = null;
          setSpeaking(false);
        },
        onNoVoice: () => {
          if (noVoiceTold.current !== l) {
            noVoiceTold.current = l;
            noticeRef.current(`This device has no ${LANG_NAME[l]} voice installed, so I am using its default voice. Reading on screen always works.`);
          }
        },
      });
      talker.current = h;
    },
    [],
  );

  return { listening, speaking, interim, voiceOn, setVoiceOn, support, toggleMic, speakReply, stopSpeaking, cancelAll };
}
