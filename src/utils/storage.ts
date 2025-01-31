import { Soundboard, WindowPosition, WindowSize } from "../types/types";
import { AppManagerState } from "../apps/base/types";
import { Message } from "ai";

export const APP_STORAGE_KEYS = {
  soundboard: {
    BOARDS: "soundboard:boards",
    WINDOW: "soundboard:window",
    SELECTED_DEVICE_ID: "soundboard:selectedDeviceId",
    HAS_SEEN_HELP: "soundboard:hasSeenHelp",
  },
  "internet-explorer": {
    WINDOW: "internet-explorer:window",
    HISTORY: "internet-explorer:history",
    FAVORITES: "internet-explorer:favorites",
    LAST_URL: "internet-explorer:last-url",
  },
  chats: {
    WINDOW: "chats:window",
    MESSAGES: "chats:messages",
    HAS_SEEN_HELP: "chats:hasSeenHelp",
  },
} as const;

interface WindowState {
  position: WindowPosition;
  size: WindowSize;
}

const DEFAULT_WINDOW_STATE: WindowState = {
  position: { x: 16, y: 40 },
  size: { width: 800, height: 475 },
};

export const loadWindowState = (
  appId: keyof typeof APP_STORAGE_KEYS
): WindowState => {
  const key = APP_STORAGE_KEYS[appId].WINDOW;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : DEFAULT_WINDOW_STATE;
};

export const saveWindowState = (
  appId: keyof typeof APP_STORAGE_KEYS,
  state: WindowState
): void => {
  const key = APP_STORAGE_KEYS[appId].WINDOW;
  localStorage.setItem(key, JSON.stringify(state));
};

// Soundboard specific storage
export const loadSoundboards = async (): Promise<Soundboard[]> => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.soundboard.BOARDS);
  if (saved) {
    return JSON.parse(saved);
  }

  try {
    const response = await fetch("/soundboards.json");
    const data = await response.json();
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
    saveSoundboards(newBoards);
    return newBoards;
  } catch (error) {
    console.error("Error loading initial boards:", error);
    const defaultBoard = createDefaultBoard();
    saveSoundboards([defaultBoard]);
    return [defaultBoard];
  }
};

export const saveSoundboards = (boards: Soundboard[]): void => {
  const boardsForStorage = boards.map((board) => ({
    ...board,
    slots: board.slots.map((slot) => ({
      audioData: slot.audioData,
      emoji: slot.emoji,
      title: slot.title,
    })),
  }));
  localStorage.setItem(
    APP_STORAGE_KEYS.soundboard.BOARDS,
    JSON.stringify(boardsForStorage)
  );
};

export const loadSelectedDeviceId = (): string => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS.soundboard.SELECTED_DEVICE_ID) || ""
  );
};

export const saveSelectedDeviceId = (deviceId: string): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.soundboard.SELECTED_DEVICE_ID,
    deviceId
  );
};

export const createDefaultBoard = (): Soundboard => ({
  id: "default",
  name: "New Soundboard",
  slots: Array(9).fill({
    audioData: null,
    emoji: undefined,
    title: undefined,
  }),
});

export const loadHasSeenHelp = (): boolean => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS.soundboard.HAS_SEEN_HELP) === "true"
  );
};

export const saveHasSeenHelp = (): void => {
  localStorage.setItem(APP_STORAGE_KEYS.soundboard.HAS_SEEN_HELP, "true");
};

export interface Favorite {
  title: string;
  url: string;
  favicon?: string;
}

export const DEFAULT_FAVORITES: Favorite[] = [
  {
    title: "NewJeans",
    url: "https://newjeans.kr",
    favicon: "https://www.google.com/s2/favicons?domain=newjeans.kr&sz=32",
  },
  {
    title: "Theo",
    url: "https://tmb.sh",
    favicon: "https://www.google.com/s2/favicons?domain=tmb.sh&sz=32",
  },
  {
    title: "Ian",
    url: "https://shaoruu.io",
    favicon: "https://www.google.com/s2/favicons?domain=shaoruu.io&sz=32",
  },
  {
    title: "Tyler",
    url: "https://tylerbeauchamp.net",
    favicon:
      "https://www.google.com/s2/favicons?domain=tylerbeauchamp.net&sz=32",
  },
  {
    title: "Sam",
    url: "https://www.samuelcatania.com",
    favicon:
      "https://www.google.com/s2/favicons?domain=www.samuelcatania.com&sz=32",
  },
  {
    title: "Stephen",
    url: "https://wustep.me",
    favicon: "https://www.google.com/s2/favicons?domain=wustep.me&sz=32",
  },
  {
    title: "Lucas",
    url: "https://www.lucasn.com",
    favicon: "https://www.google.com/s2/favicons?domain=www.lucasn.com&sz=32",
  },

  {
    title: "Frank",
    url: "https://okfrank.co",
    favicon: "https://www.google.com/s2/favicons?domain=okfrank.co&sz=32",
  },
  {
    title: "Ryo",
    url: "https://ryo.lu",
    favicon: "https://www.google.com/s2/favicons?domain=ryo.lu&sz=32",
  },
  {
    title: "Modi",
    url: "https://www.akm.io",
    favicon: "https://www.google.com/s2/favicons?domain=www.akm.io&sz=32",
  },
];

export const loadFavorites = (): Favorite[] => {
  const saved = localStorage.getItem(
    APP_STORAGE_KEYS["internet-explorer"].FAVORITES
  );
  return saved ? JSON.parse(saved) : DEFAULT_FAVORITES;
};

export const saveFavorites = (favorites: Favorite[]): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["internet-explorer"].FAVORITES,
    JSON.stringify(favorites)
  );
};

const APP_STATE_KEY = "app:state";

export const loadAppState = (): AppManagerState => {
  const saved = localStorage.getItem(APP_STATE_KEY);
  return saved ? JSON.parse(saved) : {};
};

export const saveAppState = (state: AppManagerState): void => {
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
};

// Chat specific storage
export const loadChatMessages = (): Message[] | null => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.chats.MESSAGES);
  if (!saved) return null;
  const messages = JSON.parse(saved);
  return messages.map(
    (msg: Omit<Message, "createdAt"> & { createdAt: string }) => ({
      ...msg,
      createdAt: new Date(msg.createdAt),
    })
  );
};

export const saveChatMessages = (messages: Message[]): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.chats.MESSAGES,
    JSON.stringify(messages)
  );
};

export const DEFAULT_URL = "https://ryo.lu";

export const loadLastUrl = (): string => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS["internet-explorer"].LAST_URL) ||
    DEFAULT_URL
  );
};

export const saveLastUrl = (url: string): void => {
  localStorage.setItem(APP_STORAGE_KEYS["internet-explorer"].LAST_URL, url);
};
