import { Button } from "@/components/ui/button";
import { SoundSlot as SoundSlotType } from "@/types/types";
import { X, SmilePlus } from "lucide-react";
import { Waveform } from "./Waveform";
import type WaveSurfer from "wavesurfer.js";

interface SoundSlotProps {
  slot: SoundSlotType;
  isRecording: boolean;
  isPlaying: boolean;
  waveformRef: (el: HTMLDivElement | null) => void;
  onSlotClick: () => void;
  onDelete: () => void;
  onEmojiClick: () => void;
  onTitleClick: () => void;
  onWaveformCreate?: (waveform: WaveSurfer) => void;
}

export function SoundSlot({
  slot,
  isRecording,
  isPlaying,
  waveformRef,
  onSlotClick,
  onDelete,
  onEmojiClick,
  onTitleClick,
  onWaveformCreate,
}: SoundSlotProps) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      <Button
        variant={
          isRecording ? "destructive" : slot.audioData ? "retro" : "retro"
        }
        className="h-full w-full flex flex-col items-stretch justify-between relative p-2 md:p-4 group min-h-[4rem] md:min-h-[6rem]"
        onClick={onSlotClick}
      >
        {slot.audioData && (
          <>
            <Waveform
              ref={waveformRef}
              audioData={slot.audioData}
              isPlaying={isPlaying}
              onWaveformCreate={onWaveformCreate}
            />
            <div className="absolute top-1 right-1 flex gap-1 z-10">
              <div
                role="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 md:h-6 md:w-6 hover:bg-white/50 rounded-md flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <X className="w-3 h-3 md:w-4 md:h-4" />
              </div>
            </div>
            <div
              className={`absolute bottom-1 left-2 flex items-center gap-1 md:gap-2 z-10 transition-all duration-300 ease-in-out transform origin-left ${
                isPlaying ? "opacity-100 scale-100" : "opacity-60 scale-80"
              }`}
            >
              {slot.emoji ? (
                <span
                  className="text-xl md:text-2xl cursor-pointer hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEmojiClick();
                  }}
                >
                  {slot.emoji}
                </span>
              ) : (
                <div
                  role="button"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 md:h-6 md:w-6 hover:bg-white/50 rounded-md flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEmojiClick();
                  }}
                >
                  <SmilePlus className="w-3 h-3 md:w-4 md:h-4" />
                </div>
              )}
              <span
                className="text-base md:text-lg font-medium truncate max-w-[80px] md:max-w-[120px] cursor-text hover:bg-white/20 px-1 rounded select-text"
                onClick={(e) => {
                  e.stopPropagation();
                  onTitleClick();
                }}
                title={slot.title ? "Edit title" : "Add title"}
              >
                {slot.title || (
                  <span className="opacity-0 group-hover:opacity-60">
                    Add title...
                  </span>
                )}
              </span>
            </div>
          </>
        )}
      </Button>
    </div>
  );
}
