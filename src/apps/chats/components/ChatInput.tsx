import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AudioInputButton } from "@/components/ui/audio-input-button";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isForeground?: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  onDirectMessageSubmit?: (message: string) => void;
}

export function ChatInput({
  input,
  isLoading,
  isForeground = false,
  onInputChange,
  onSubmit,
  onStop,
  onDirectMessageSubmit,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const audioButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check if device has touch capability
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTranscriptionComplete = (text: string) => {
    setIsTranscribing(false);
    setIsRecording(false);
    setTranscriptionError(null);

    if (!text) {
      setTranscriptionError("No transcription text received");
      return;
    }

    // Submit the transcribed text directly if the function is available
    if (onDirectMessageSubmit) {
      onDirectMessageSubmit(text.trim());
    } else {
      // Fallback to form submission
      const transcriptionEvent = {
        target: { value: text.trim() },
      } as React.ChangeEvent<HTMLInputElement>;
      onInputChange(transcriptionEvent);

      const submitEvent = new Event(
        "submit"
      ) as unknown as React.FormEvent<HTMLFormElement>;
      onSubmit(submitEvent);

      const clearEvent = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      onInputChange(clearEvent);
    }
  };

  const handleTranscriptionStart = () => {
    setIsTranscribing(true);
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.repeat &&
        isForeground &&
        !isFocused &&
        !isTranscribing
      ) {
        e.preventDefault();
        audioButtonRef.current?.click();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isForeground && !isFocused && isTranscribing) {
        e.preventDefault();
        audioButtonRef.current?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isForeground, isFocused, isTranscribing]);

  return (
    <form onSubmit={onSubmit} className="flex gap-1">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          layout
          className="flex-1 relative"
          transition={{ duration: 0.15 }}
        >
          <Input
            value={input}
            onChange={onInputChange}
            placeholder={
              isRecording
                ? "Recording..."
                : isTranscribing
                ? "Transcribing..."
                : isFocused || isTouchDevice
                ? "Type a message..."
                : "Type or press 'space' to talk..."
            }
            className={`w-full border-1 border-gray-800 text-xs font-['Geneva-12'] antialiased h-8 pr-8 ${
              isFocused ? "input--focused" : ""
            }`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onTouchStart={(e) => {
              e.preventDefault();
            }}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[22px] h-[22px] flex items-center justify-center">
            <AudioInputButton
              ref={audioButtonRef}
              onTranscriptionComplete={handleTranscriptionComplete}
              onTranscriptionStart={handleTranscriptionStart}
              onRecordingStateChange={handleRecordingStateChange}
              isLoading={isTranscribing}
              silenceThreshold={1200}
              className="w-full h-full flex items-center justify-center"
            />
            {transcriptionError && (
              <div className="absolute top-full mt-1 right-0 bg-red-100 text-red-600 text-xs p-1 rounded shadow-sm">
                {transcriptionError}
              </div>
            )}
          </div>
        </motion.div>

        {isLoading ? (
          <motion.div
            key="stop"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            layout
          >
            <Button
              type="button"
              onClick={onStop}
              className="bg-black hover:bg-black/80 text-white text-xs border-2 border-gray-800 w-8 h-8 p-0 flex items-center justify-center"
            >
              <Square className="h-4 w-4" fill="currentColor" />
            </Button>
          </motion.div>
        ) : input.trim() !== "" ? (
          <motion.div
            key="send"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            layout
          >
            <Button
              type="submit"
              className="bg-black hover:bg-black/80 text-white text-xs border-2 border-gray-800 w-8 h-8 p-0 flex items-center justify-center"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
