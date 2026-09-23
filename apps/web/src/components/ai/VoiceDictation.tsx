// ──────────────────────────────────────────────
// TradeMind — Voice Dictation Component
//
// Web Speech API dictation tool for effortless trade journaling.
// Captures spoken voice notes in real time and automatically
// detects emotional keywords (FOMO, Greed, Fear, Calm, etc.)
// Runs 100% in the browser — Zero API cost.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toast';

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  onEmotionsDetected?: (emotions: string[]) => void;
  className?: string;
}

// Map keywords to standard Emotion tags
const EMOTION_KEYWORD_MAP: Record<string, string> = {
  fomo: 'FOMO',
  'fear of missing out': 'FOMO',
  fear: 'FEAR',
  scared: 'FEAR',
  panic: 'FEAR',
  greed: 'GREED',
  greedy: 'GREED',
  revenge: 'REVENGE',
  angry: 'REVENGE',
  tilt: 'REVENGE',
  hesitant: 'HESITATION',
  hesitation: 'HESITATION',
  anxious: 'ANXIETY',
  anxiety: 'ANXIETY',
  nervous: 'ANXIETY',
  stress: 'ANXIETY',
  calm: 'CALM',
  relaxed: 'CALM',
  disciplined: 'DISCIPLINED',
  patience: 'PATIENT',
  patient: 'PATIENT',
  confident: 'CONFIDENT',
  confidence: 'CONFIDENT',
  excited: 'EUPHORIC',
  euphoria: 'EUPHORIC',
};

export function VoiceDictation({
  onTranscript,
  onEmotionsDetected,
  className,
}: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript + ' ';
        } else {
          currentInterim += item[0].transcript;
        }
      }

      setInterimText(currentInterim);

      if (finalTranscript.trim()) {
        const text = finalTranscript.trim();
        onTranscript(text);

        // Scan for emotional keywords
        if (onEmotionsDetected) {
          const lower = text.toLowerCase();
          const detected: string[] = [];
          for (const [kw, emotion] of Object.entries(EMOTION_KEYWORD_MAP)) {
            if (lower.includes(kw) && !detected.includes(emotion)) {
              detected.push(emotion);
            }
          }
          if (detected.length > 0) {
            onEmotionsDetected(detected);
            toast.info(`AI Voice: Detected emotions (${detected.join(', ')})`);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access was denied. Please allow microphone permission in browser.');
      }
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore abort error on unmount
      }
    };
  }, [onTranscript, onEmotionsDetected]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  }, [isListening]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={toggleListening}
        className={cn(
          'relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border',
          isListening
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm shadow-rose-500/20'
            : 'bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20',
        )}
        title={isListening ? 'Stop voice recording' : 'Speak to journal (Voice-to-Text)'}
      >
        {isListening ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <MicOff className="w-3.5 h-3.5 animate-pulse" />
            <span>Recording...</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Dictation</span>
            <Sparkles className="w-2.5 h-2.5 text-violet-400 ml-0.5" />
          </>
        )}
      </button>

      {interimText && (
        <span className="text-[11px] text-muted-foreground italic truncate max-w-xs animate-pulse">
          &ldquo;{interimText}&rdquo;
        </span>
      )}
    </div>
  );
}
