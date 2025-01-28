import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WaveSurfer from "wavesurfer.js";
import { Plus, X, SmilePlus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SoundSlot {
  audioData: string | null;
  waveform?: WaveSurfer;
  emoji?: string;
  title?: string;
}

interface PlaybackState {
  isRecording: boolean;
  isPlaying: boolean;
}

interface Soundboard {
  id: string;
  name: string;
  slots: SoundSlot[];
}

function App() {
  const [boards, setBoards] = useState<Soundboard[]>(() => {
    const saved = localStorage.getItem("soundboards");
    if (saved) {
      const parsed = JSON.parse(saved) as {
        id: string;
        name: string;
        slots: { audioData: string | null; emoji?: string; title?: string }[];
      }[];
      return parsed.map((board) => ({
        ...board,
        slots: board.slots.map((slot) => ({
          audioData: slot.audioData,
          emoji: slot.emoji,
          title: slot.title,
        })),
      }));
    }

    // Try to fetch from soundboards.json if localStorage is empty
    try {
      const defaultBoard = {
        id: "default",
        name: "New Soundboard",
        slots: Array(9).fill({
          audioData: null,
          emoji: undefined,
          title: undefined,
        }),
      };

      fetch("/soundboards.json")
        .then((res) => res.json())
        .then((data) => {
          const importedBoards = data.boards || [data];
          const newBoards = importedBoards.map((board: Soundboard) => ({
            ...board,
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            slots: board.slots.map((slot) => ({
              audioData: slot.audioData,
              emoji: slot.emoji,
              title: slot.title,
            })),
          }));
          setBoards(newBoards);
          localStorage.setItem("soundboards", JSON.stringify(newBoards));
        })
        .catch((err) => {
          console.error("Failed to load soundboards.json:", err);
          setBoards([defaultBoard]);
          localStorage.setItem("soundboards", JSON.stringify([defaultBoard]));
        });

      return [defaultBoard];
    } catch (error) {
      console.error("Error loading initial boards:", error);
      const defaultBoard = {
        id: "default",
        name: "New Soundboard",
        slots: Array(9).fill({
          audioData: null,
          emoji: undefined,
          title: undefined,
        }),
      };
      return [defaultBoard];
    }
  });

  const [playbackStates, setPlaybackStates] = useState<PlaybackState[]>(
    Array(9).fill({ isRecording: false, isPlaying: false })
  );

  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    return boards[0]?.id || "default";
  });

  useEffect(() => {
    // If current activeBoardId is not in boards, switch to the first board
    if (!boards.find((b) => b.id === activeBoardId)) {
      setActiveBoardId(boards[0]?.id || "default");
    }
  }, [boards, activeBoardId]);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return localStorage.getItem("selectedDeviceId") || "";
  });
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);

  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    };

    // Only run if permission is granted
    if (micPermissionGranted) {
      getDevices();
      navigator.mediaDevices.addEventListener("devicechange", getDevices);
      return () =>
        navigator.mediaDevices.removeEventListener("devicechange", getDevices);
    }
  }, [selectedDeviceId, micPermissionGranted]);

  useEffect(() => {
    localStorage.setItem("selectedDeviceId", selectedDeviceId);
  }, [selectedDeviceId]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeSlotRef = useRef<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>(Array(9).fill(null));
  const waveformRefs = useRef<(HTMLDivElement | null)[]>(Array(9).fill(null));

  const activeBoard = boards.find((b) => b.id === activeBoardId) ||
    boards[0] || {
      id: "default",
      name: "New Soundboard",
      slots: Array(9).fill({
        audioData: null,
        emoji: undefined,
        title: undefined,
      }),
    };

  const saveBoards = (newBoards: Soundboard[]) => {
    // Create a copy without waveform objects for localStorage
    const boardsForStorage = newBoards.map((board) => ({
      ...board,
      slots: board.slots.map((slot) => ({
        audioData: slot.audioData,
        emoji: slot.emoji,
        title: slot.title,
      })),
    }));
    localStorage.setItem("soundboards", JSON.stringify(boardsForStorage));

    // Preserve waveforms from current state when updating boards state
    const boardsWithWaveforms = newBoards.map((board) => {
      if (board.id === activeBoardId) {
        return {
          ...board,
          slots: board.slots.map((slot, idx) => ({
            ...slot,
            waveform: activeBoard.slots[idx]?.waveform || slot.waveform,
          })),
        };
      }
      return board;
    });
    setBoards(boardsWithWaveforms);
  };

  const addNewBoard = () => {
    const newBoard: Soundboard = {
      id: Date.now().toString(),
      name: "New Soundboard",
      slots: Array(9).fill({
        audioData: null,
        emoji: undefined,
        title: undefined,
      }),
    };
    saveBoards([...boards, newBoard]);
    setActiveBoardId(newBoard.id);
  };

  const updateBoardName = (name: string) => {
    const newBoards = boards.map((board) =>
      board.id === activeBoardId ? { ...board, name } : board
    );
    saveBoards(newBoards);
    setIsEditingTitle(false);
  };

  const updateSlotState = (index: number, isPlaying: boolean) => {
    setPlaybackStates((prev) => {
      const newStates = [...prev];
      newStates[index] = { ...newStates[index], isPlaying };
      return newStates;
    });
  };

  const handleRecordingStop = async (
    chunks: BlobPart[],
    slotIndex: number,
    stream: MediaStream
  ) => {
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/mp4";
    const blob = new Blob(chunks, { type: mimeType });
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const newBoards = boards.map((board) => {
      if (board.id === activeBoardId) {
        const newSlots = [...board.slots];
        newSlots[slotIndex] = {
          audioData: base64,
          emoji: board.slots[slotIndex].emoji,
          title: board.slots[slotIndex].title,
        };
        return { ...board, slots: newSlots };
      }
      return board;
    });
    saveBoards(newBoards);
    stream.getTracks().forEach((track) => track.stop());

    setPlaybackStates((prev) => {
      const newStates = [...prev];
      newStates[slotIndex] = { isRecording: false, isPlaying: false };
      return newStates;
    });

    updateWaveform(slotIndex, base64);
  };

  const startRecording = async (slotIndex: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        },
      });

      setMicPermissionGranted(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );
      setAudioDevices(audioInputs);

      // Check supported mimeTypes for different browsers
      const mimeType = MediaRecorder.isTypeSupported(
        "audio/mp4;codecs=mp4a.40.2"
      )
        ? "audio/mp4;codecs=mp4a.40.2"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () =>
        handleRecordingStop(chunks, slotIndex, stream);

      mediaRecorderRef.current = mediaRecorder;
      activeSlotRef.current = slotIndex;

      setPlaybackStates((prev) => {
        const newStates = [...prev];
        newStates[slotIndex] = { isRecording: true, isPlaying: false };
        return newStates;
      });

      mediaRecorder.start(200);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      activeSlotRef.current = null;
    }
  };

  const playSound = (base64Data: string, index: number) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/webm" });
    const audio = new Audio(URL.createObjectURL(blob));
    audioRefs.current[index] = audio;

    const slot = activeBoard.slots[index];
    updateSlotState(index, true);

    audio.play();

    if (slot.waveform) {
      slot.waveform.seekTo(0);
      slot.waveform.play();
    }

    // Update waveform progress
    const updateProgress = () => {
      if (slot.waveform && audio.duration) {
        slot.waveform.seekTo(audio.currentTime / audio.duration);
        if (audio.paused) return;
        requestAnimationFrame(updateProgress);
      }
    };
    requestAnimationFrame(updateProgress);

    audio.onended = () => {
      updateSlotState(index, false);
      if (slot.waveform) {
        slot.waveform.stop();
        slot.waveform.seekTo(0);
      }
      audioRefs.current[index] = null;
    };
  };

  const stopSound = (index: number) => {
    const audio = audioRefs.current[index];
    const slot = activeBoard.slots[index];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRefs.current[index] = null;
      if (slot.waveform) {
        slot.waveform.stop();
        slot.waveform.seekTo(0);
      }
      updateSlotState(index, false);
    }
  };

  const handleSlotClick = (index: number) => {
    const slot = activeBoard.slots[index];
    if (slot.audioData) {
      if (playbackStates[index].isPlaying) {
        stopSound(index);
      } else {
        playSound(slot.audioData, index);
      }
    } else if (!playbackStates[index].isRecording) {
      startRecording(index);
    } else {
      stopRecording();
    }
  };

  const deleteCurrentBoard = () => {
    if (boards.length <= 1) return; // Prevent deleting last board
    const newBoards = boards.filter((b) => b.id !== activeBoardId);
    saveBoards(newBoards);
    setActiveBoardId(newBoards[0].id);
  };

  const exportBoard = () => {
    const exportData = {
      boards: boards.map((board) => ({
        ...board,
        slots: board.slots.map((slot) => ({
          audioData: slot.audioData,
          emoji: slot.emoji,
          title: slot.title,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "soundboards.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBoard = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        const importedBoards = importedData.boards || [importedData];

        const newBoards = importedBoards.map((board: Soundboard) => ({
          ...board,
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          slots: board.slots.map((slot) => ({
            audioData: slot.audioData,
            emoji: slot.emoji,
            title: slot.title,
          })),
        }));

        saveBoards([...boards, ...newBoards]);
        setActiveBoardId(newBoards[0].id);
      } catch (err) {
        console.error("Failed to import soundboards:", err);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    // Cleanup old waveforms first
    activeBoard.slots.forEach((slot) => {
      slot.waveform?.destroy();
    });

    // Load waveforms for existing recordings
    activeBoard.slots.forEach((slot, index) => {
      if (slot.audioData) {
        updateWaveform(index, slot.audioData);
      }
    });

    return () => {
      activeBoard.slots.forEach((slot) => {
        slot.waveform?.destroy();
      });
    };
  }, [activeBoardId]);

  const updateWaveform = async (index: number, base64Data: string) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/webm" });
    const container = waveformRefs.current[index];
    if (!container) return;

    // Destroy existing waveform if it exists
    const existingWaveform = activeBoard.slots[index].waveform;
    if (existingWaveform) {
      existingWaveform.destroy();
    }

    // Clear the container
    container.innerHTML = "";

    const wavesurfer = WaveSurfer.create({
      container,
      height: 60,
      progressColor: "rgba(0, 0, 0, 1)",
      cursorColor: "transparent",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: false,
    });

    wavesurfer.on("play", () => {
      wavesurfer.setOptions({ cursorColor: "rgba(199, 24, 24, 0.56)" });
    });

    wavesurfer.on("pause", () => {
      wavesurfer.setOptions({ cursorColor: "transparent" });
    });

    await wavesurfer.loadBlob(blob);

    // Just update the specific slot's waveform reference
    activeBoard.slots[index].waveform = wavesurfer;
  };

  const handleDelete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBoards = boards.map((board) => {
      if (board.id === activeBoardId) {
        const newSlots = [...board.slots];
        newSlots[index] = {
          audioData: null,
          emoji: undefined,
          title: undefined,
        };
        return { ...board, slots: newSlots };
      }
      return board;
    });
    saveBoards(newBoards);
  };

  const handleEmojiClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const emoji = prompt("Enter an emoji:");
    if (emoji) {
      const newBoards = boards.map((board) => {
        if (board.id === activeBoardId) {
          const newSlots = [...board.slots];
          newSlots[index] = {
            ...newSlots[index],
            emoji,
          };
          return { ...board, slots: newSlots };
        }
        return board;
      });
      saveBoards(newBoards);
    }
  };

  const handleTitleClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const slot = activeBoard.slots[index];
    const title = prompt("Enter a title:", slot.title || "");
    if (title !== null) {
      const newBoards = boards.map((board) => {
        if (board.id === activeBoardId) {
          const newSlots = [...board.slots];
          newSlots[index] = {
            ...newSlots[index],
            title,
          };
          return { ...board, slots: newSlots };
        }
        return board;
      });
      saveBoards(newBoards);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle both numpad (97-105) and regular number keys (49-57)
      const index =
        e.keyCode >= 97
          ? e.keyCode - 97 // Numpad 1-9
          : e.keyCode - 49; // Regular 1-9

      if (
        (e.keyCode >= 97 && e.keyCode <= 105) ||
        (e.keyCode >= 49 && e.keyCode <= 57)
      ) {
        const slot = activeBoard.slots[index];
        if (slot.audioData) {
          if (playbackStates[index].isPlaying) {
            stopSound(index);
          } else {
            playSound(slot.audioData, index);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeBoard.slots, playbackStates]);

  const reloadFromJson = async () => {
    try {
      const res = await fetch("/soundboards.json");
      const data = await res.json();
      const importedBoards = data.boards || [data];
      const newBoards = importedBoards.map((board: Soundboard) => ({
        ...board,
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        slots: board.slots.map((slot) => ({
          audioData: slot.audioData,
          emoji: slot.emoji,
          title: slot.title,
        })),
      }));
      setBoards(newBoards);
      localStorage.setItem("soundboards", JSON.stringify(newBoards));
    } catch (err) {
      console.error("Failed to reload soundboards.json:", err);
    }
  };

  const [windowPosition, setWindowPosition] = useState(() => {
    const saved = localStorage.getItem("windowPosition");
    return saved ? JSON.parse(saved) : { x: 16, y: 40 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && windowRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Keep window within viewport bounds
        const maxX = window.innerWidth - windowRef.current.offsetWidth;
        const maxY = window.innerHeight - windowRef.current.offsetHeight;
        const x = Math.min(Math.max(0, newX), maxX);
        const y = Math.min(Math.max(0, newY), maxY);

        setWindowPosition({ x, y });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem("windowPosition", JSON.stringify(windowPosition));
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, windowPosition]);

  const [windowSize, setWindowSize] = useState(() => {
    const saved = localStorage.getItem("windowSize");
    return saved ? JSON.parse(saved) : { width: 800, height: 600 };
  });
  const [resizeType, setResizeType] = useState<
    "" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
  >("");
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });

  const handleResizeStart = (e: React.MouseEvent, type: typeof resizeType) => {
    e.stopPropagation();
    e.preventDefault();
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
        left: windowPosition.x,
        top: windowPosition.y,
      });
      setResizeType(type);
    }
  };

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (resizeType && windowRef.current) {
        e.preventDefault();
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const minWidth = 400;
        const minHeight = 300;
        const maxWidth = window.innerWidth - 32;
        const maxHeight = window.innerHeight - 32;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;

        // Handle horizontal resize
        if (resizeType.includes("e")) {
          newWidth = Math.min(
            Math.max(resizeStart.width + deltaX, minWidth),
            maxWidth
          );
        } else if (resizeType.includes("w")) {
          const potentialWidth = Math.min(
            Math.max(resizeStart.width - deltaX, minWidth),
            maxWidth
          );
          if (potentialWidth !== resizeStart.width) {
            newLeft = resizeStart.left + (resizeStart.width - potentialWidth);
            newWidth = potentialWidth;
          }
        }

        // Handle vertical resize
        if (resizeType.includes("s")) {
          newHeight = Math.min(
            Math.max(resizeStart.height + deltaY, minHeight),
            maxHeight
          );
        } else if (resizeType.includes("n")) {
          const potentialHeight = Math.min(
            Math.max(resizeStart.height - deltaY, minHeight),
            maxHeight
          );
          if (potentialHeight !== resizeStart.height) {
            newTop = resizeStart.top + (resizeStart.height - potentialHeight);
            newHeight = potentialHeight;
          }
        }

        setWindowSize({ width: newWidth, height: newHeight });
        setWindowPosition({ x: newLeft, y: newTop });
      }
    };

    const handleResizeEnd = () => {
      if (resizeType) {
        setResizeType("");
        localStorage.setItem("windowSize", JSON.stringify(windowSize));
        localStorage.setItem("windowPosition", JSON.stringify(windowPosition));
      }
    };

    if (resizeType) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", handleResizeEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [resizeType, resizeStart, windowSize]);

  return (
    <div className="min-h-screen bg-[#666699]">
      {/* Global menubar */}
      <div className="fixed top-0 left-0 right-0 flex bg-system7-menubar-bg border-b-[2px] border-black px-2 h-7 items-center text-sm z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="default"
              className="h-6 px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
            >
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={1}>
            <DropdownMenuItem onClick={addNewBoard}>
              New Soundboard
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => document.getElementById("import-board")?.click()}
            >
              Import Soundboard...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportBoard}>
              Export Soundboard...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={reloadFromJson}>
              Reload Soundboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="default"
              className="h-6 px-2 py-1 focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
            >
              Edit
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={1}>
            <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
              Rename Soundboard
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={deleteCurrentBoard}
              disabled={boards.length <= 1}
              className={boards.length <= 1 ? "text-gray-400" : ""}
            >
              Delete Soundboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="default"
              className="h-6 px-2 py-1 focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
            >
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={1}>
            <DropdownMenuItem>Show Waveforms</DropdownMenuItem>
            <DropdownMenuItem>Show Emojis</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main window */}
      <div
        ref={windowRef}
        className="absolute"
        style={{
          left: windowPosition.x,
          top: windowPosition.y,
          width: windowSize.width,
          height: windowSize.height,
          transition: isDragging || resizeType ? "none" : "all 0.2s ease",
        }}
      >
        <div className="relative h-full bg-system7-window-bg border-[2px] border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Resize handles */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-0 left-0 right-0 h-2 cursor-n-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "n")}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "s")}
            />
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "w")}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "e")}
            />
            <div
              className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "nw")}
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "ne")}
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "sw")}
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize pointer-events-auto"
              onMouseDown={(e) => handleResizeStart(e, "se")}
            />
          </div>

          {/* Title bar */}
          <div
            className="flex items-center flex-none h-6 mx-0 my-[0.1rem] px-[0.1rem] py-[0.2rem] bg-[linear-gradient(#000_50%,transparent_0)] bg-clip-content bg-[length:6.6666666667%_13.3333333333%] cursor-move border-b-[2px] border-black"
            onMouseDown={handleMouseDown}
          >
            <span className="font-bold text-sm select-none mx-auto bg-white px-2 py-0">
              Soundboard.app
            </span>
          </div>

          {/* App content */}
          <div className="flex flex-1 h-[calc(100%-2rem)]">
            <div className="w-full md:w-64 bg-gray-100 border-r flex flex-col">
              <div className="p-4 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Soundboards</h2>
                  <Button variant="ghost" size="icon" onClick={addNewBoard}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto space-y-2">
                  {boards.map((board) => (
                    <Button
                      key={board.id}
                      variant={board.id === activeBoardId ? "default" : "ghost"}
                      className="w-full justify-start text-lg"
                      onClick={() => setActiveBoardId(board.id)}
                    >
                      {board.name}
                    </Button>
                  ))}
                </div>
                {micPermissionGranted && (
                  <div className="mt-4">
                    <Select
                      value={selectedDeviceId}
                      onValueChange={setSelectedDeviceId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.map((device) => (
                          <SelectItem
                            key={device.deviceId}
                            value={device.deviceId}
                          >
                            {device.label ||
                              `Microphone ${device.deviceId.slice(0, 4)}...`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <input
                  type="file"
                  id="import-board"
                  className="hidden"
                  accept="application/json"
                  onChange={importBoard}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-4 md:p-8">
                <div className="max-w-2xl mx-auto flex flex-col">
                  {isEditingTitle ? (
                    <Input
                      className="text-3xl font-bold mb-8 text-left"
                      value={activeBoard.name}
                      autoFocus
                      onChange={(e) => {
                        const newBoards = boards.map((board) =>
                          board.id === activeBoardId
                            ? { ...board, name: e.target.value }
                            : board
                        );
                        setBoards(newBoards);
                      }}
                      onBlur={(e) => updateBoardName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateBoardName(e.currentTarget.value);
                        }
                      }}
                    />
                  ) : (
                    <h1
                      className="text-3xl font-bold mb-8 text-left cursor-pointer hover:opacity-80"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {activeBoard.name}
                    </h1>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 flex-1">
                    {activeBoard.slots.map((slot, index) => (
                      <div key={index} className="flex flex-col gap-2 min-h-0">
                        <Button
                          variant={
                            playbackStates[index].isRecording
                              ? "destructive"
                              : slot.audioData
                              ? "retro"
                              : "retro"
                          }
                          className="h-full w-full flex flex-col items-stretch justify-between relative p-2 md:p-4 group min-h-[4rem] md:min-h-[6rem]"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSlotClick(index);
                          }}
                        >
                          {slot.audioData && (
                            <>
                              <div
                                ref={(el) => (waveformRefs.current[index] = el)}
                                className="hidden md:block w-full h-12 flex-shrink-0"
                              />
                              <div className="absolute top-1 right-1 flex gap-1 z-10">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 md:h-6 md:w-6 hover:bg-white/50"
                                  onClick={(e) => handleDelete(index, e)}
                                >
                                  <X className="w-3 h-3 md:w-4 md:h-4" />
                                </Button>
                              </div>
                              <div
                                className={`absolute bottom-1 left-2 flex items-center gap-1 md:gap-2 z-10 transition-all duration-300 ease-in-out transform origin-left ${
                                  playbackStates[index].isPlaying
                                    ? "opacity-100 scale-100"
                                    : "opacity-60 scale-80"
                                }`}
                              >
                                {slot.emoji ? (
                                  <span
                                    className="text-xl md:text-2xl cursor-pointer hover:opacity-80"
                                    onClick={(e) => handleEmojiClick(index, e)}
                                  >
                                    {slot.emoji}
                                  </span>
                                ) : (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 md:h-6 md:w-6 hover:bg-white/50"
                                    onClick={(e) => handleEmojiClick(index, e)}
                                  >
                                    <SmilePlus className="w-3 h-3 md:w-4 md:h-4" />
                                  </Button>
                                )}
                                <span
                                  className="text-base md:text-lg font-medium truncate max-w-[80px] md:max-w-[120px] cursor-text hover:bg-white/20 px-1 rounded"
                                  onClick={(e) => handleTitleClick(index, e)}
                                  title={
                                    slot.title ? "Edit title" : "Add title"
                                  }
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
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
