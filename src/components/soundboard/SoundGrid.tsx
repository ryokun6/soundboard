import { Input } from "@/components/ui/input";
import { SoundSlot } from "./SoundSlot";
import { Soundboard, PlaybackState } from "@/types/types";
import type WaveSurfer from "wavesurfer.js";

interface SoundGridProps {
  board: Soundboard;
  playbackStates: PlaybackState[];
  waveformRefs: ((el: HTMLDivElement | null) => void)[];
  isEditingTitle: boolean;
  onTitleChange: (name: string) => void;
  onTitleBlur: (name: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSlotClick: (index: number) => void;
  onSlotDelete: (index: number) => void;
  onSlotEmojiClick: (index: number) => void;
  onSlotTitleClick: (index: number) => void;
  onWaveformCreate?: (index: number, waveform: WaveSurfer) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
}

export function SoundGrid({
  board,
  playbackStates,
  waveformRefs,
  isEditingTitle,
  onTitleChange,
  onTitleBlur,
  onTitleKeyDown,
  onSlotClick,
  onSlotDelete,
  onSlotEmojiClick,
  onSlotTitleClick,
  onWaveformCreate,
  setIsEditingTitle,
}: SoundGridProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="py-6 px-4 md:py-2 md:p-8 md:py-4">
        <div className="max-w-2xl mx-auto flex flex-col">
          {isEditingTitle ? (
            <Input
              className="text-3xl font-bold mb-4 text-left select-text"
              value={board.name}
              autoFocus
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={(e) => onTitleBlur(e.target.value)}
              onKeyDown={onTitleKeyDown}
            />
          ) : (
            <h1
              className="text-3xl font-bold mb-4 text-left cursor-text hover:opacity-80 select-text"
              onClick={() => setIsEditingTitle(true)}
            >
              {board.name}
            </h1>
          )}
          <div className="grid grid-cols-3 gap-2 md:gap-4 flex-1">
            {board.slots.map((slot, index) => (
              <SoundSlot
                key={index}
                slot={slot}
                isRecording={playbackStates[index].isRecording}
                isPlaying={playbackStates[index].isPlaying}
                waveformRef={waveformRefs[index]}
                onSlotClick={() => onSlotClick(index)}
                onDelete={() => onSlotDelete(index)}
                onEmojiClick={() => onSlotEmojiClick(index)}
                onTitleClick={() => onSlotTitleClick(index)}
                onWaveformCreate={
                  onWaveformCreate
                    ? (waveform) => onWaveformCreate(index, waveform)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
