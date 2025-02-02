import { Soundboard, WindowPosition, WindowSize } from "../types/types";
import { AppManagerState, AppState } from "../apps/base/types";
import { Message } from "ai";
import { getWindowConfig, getMobileWindowSize } from "../config/appRegistry";

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
  textedit: {
    WINDOW: "textedit:window",
    CONTENT: "textedit:content",
    HAS_SEEN_HELP: "textedit:hasSeenHelp",
    LAST_FILE_PATH: "textedit:last-file-path",
  },
  "control-panels": {
    WINDOW: "control-panels:window",
    HAS_SEEN_HELP: "control-panels:hasSeenHelp",
    DESKTOP_VISIBLE: "control-panels:desktop-visible",
  },
  minesweeper: {
    WINDOW: "minesweeper:window",
    HAS_SEEN_HELP: "minesweeper:hasSeenHelp",
  },
  finder: {
    WINDOW: "finder:window",
    CURRENT_PATH: "finder:current-path",
  },
} as const;

interface WindowState {
  position: WindowPosition;
  size: WindowSize;
}

export const loadWindowState = (
  appId: keyof typeof APP_STORAGE_KEYS
): WindowState => {
  const key = APP_STORAGE_KEYS[appId].WINDOW;
  const saved = localStorage.getItem(key);
  if (saved) {
    return JSON.parse(saved);
  }

  const isMobile = window.innerWidth < 768;
  const mobileY = 28; // Fixed Y position for mobile to account for menu bar
  const config = getWindowConfig(appId);

  return {
    position: {
      x: isMobile ? 0 : 16 + Object.keys(APP_STORAGE_KEYS).indexOf(appId) * 32,
      y: isMobile
        ? mobileY
        : 40 + Object.keys(APP_STORAGE_KEYS).indexOf(appId) * 20,
    },
    size: isMobile ? getMobileWindowSize(appId) : config.defaultSize,
  };
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
  year?: string;
}

export interface HistoryEntry {
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
  year?: string;
}

export const DEFAULT_FAVORITES: Favorite[] = [
  {
    title: "Apple",
    url: "https://apple.com",
    favicon: "https://www.google.com/s2/favicons?domain=apple.com&sz=32",
    year: "2002",
  },
  {
    title: "Notion",
    url: "https://notion.so",
    favicon: "https://www.google.com/s2/favicons?domain=notion.so&sz=32",
    year: "2019",
  },
  {
    title: "NewJeans",
    url: "https://newjeans.kr",
    favicon: "https://www.google.com/s2/favicons?domain=newjeans.kr&sz=32",
    year: "current",
  },
  {
    title: "Ryo",
    url: "https://ryo.lu",
    favicon: "https://www.google.com/s2/favicons?domain=ryo.lu&sz=32",
    year: "current",
  },
  {
    title: "PS7",
    url: "https://play.ryo.lu",
    favicon: "https://www.google.com/s2/favicons?domain=play.ryo.lu&sz=32",
    year: "current",
  },
  {
    title: "HyperCards",
    url: "https://hcsimulator.com",
    favicon: "https://www.google.com/s2/favicons?domain=hcsimulator.com&sz=32",
    year: "current",
  },
  {
    title: "Stephen",
    url: "https://wustep.me",
    favicon: "https://www.google.com/s2/favicons?domain=wustep.me&sz=32",
    year: "current",
  },
  {
    title: "Frank",
    url: "https://okfrank.co",
    favicon: "https://www.google.com/s2/favicons?domain=okfrank.co&sz=32",
    year: "current",
  },
  {
    title: "Tyler",
    url: "https://tylerbeauchamp.net",
    favicon:
      "https://www.google.com/s2/favicons?domain=tylerbeauchamp.net&sz=32",
    year: "current",
  },
  {
    title: "Ian",
    url: "https://shaoruu.io",
    favicon: "https://www.google.com/s2/favicons?domain=shaoruu.io&sz=32",
    year: "current",
  },
  {
    title: "Sam",
    url: "https://www.samuelcatania.com",
    favicon:
      "https://www.google.com/s2/favicons?domain=www.samuelcatania.com&sz=32",
    year: "current",
  },
  {
    title: "Modi",
    url: "https://www.akm.io",
    favicon: "https://www.google.com/s2/favicons?domain=www.akm.io&sz=32",
    year: "current",
  },
  {
    title: "Lucas",
    url: "https://www.lucasn.com",
    favicon: "https://www.google.com/s2/favicons?domain=www.lucasn.com&sz=32",
    year: "current",
  },
  {
    title: "Andrew",
    url: "https://www.andrewl.ee",
    favicon: "https://www.google.com/s2/favicons?domain=www.andrewl.ee&sz=32",
    year: "current",
  },
  {
    title: "Theo",
    url: "https://tmb.sh",
    favicon: "https://www.google.com/s2/favicons?domain=tmb.sh&sz=32",
    year: "current",
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

interface OldAppState {
  isOpen: boolean;
  position?: { x: number; y: number };
  isForeground?: boolean;
  zIndex?: number;
}

interface OldAppManagerState {
  [appId: string]: OldAppState;
}

export const loadAppState = (): AppManagerState => {
  const saved = localStorage.getItem(APP_STATE_KEY);
  // Initialize with default state for all possible apps
  const defaultState: AppManagerState = {
    windowOrder: [],
    apps: Object.keys(APP_STORAGE_KEYS).reduce(
      (acc, appId) => ({
        ...acc,
        [appId]: { isOpen: false },
      }),
      {} as { [appId: string]: AppState }
    ),
  };

  if (saved) {
    const parsedState = JSON.parse(saved) as
      | OldAppManagerState
      | AppManagerState;
    // Handle migration from old format to new format
    if (!("windowOrder" in parsedState)) {
      const oldState = parsedState as OldAppManagerState;
      return {
        windowOrder: Object.entries(oldState)
          .filter(([, state]) => state.isOpen)
          .sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0))
          .map(([id]) => id),
        apps: Object.entries(oldState).reduce(
          (acc, [id, state]) => ({
            ...acc,
            [id]: {
              isOpen: state.isOpen,
              position: state.position,
              isForeground: state.isForeground,
            },
          }),
          {} as { [appId: string]: AppState }
        ),
      };
    }
    // Merge saved state with default state
    const newState = parsedState as AppManagerState;
    return {
      windowOrder: newState.windowOrder,
      apps: { ...defaultState.apps, ...newState.apps },
    };
  }
  return defaultState;
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

export const DEFAULT_URL = "https://apple.com";
export const DEFAULT_YEAR = "2002";

export const loadLastUrl = (): string => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS["internet-explorer"].LAST_URL) ||
    DEFAULT_URL
  );
};

export const saveLastUrl = (url: string): void => {
  localStorage.setItem(APP_STORAGE_KEYS["internet-explorer"].LAST_URL, url);
};

export const loadHistory = (): HistoryEntry[] => {
  const saved = localStorage.getItem(
    APP_STORAGE_KEYS["internet-explorer"].HISTORY
  );
  return saved ? JSON.parse(saved) : [];
};

export const saveHistory = (history: HistoryEntry[]): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["internet-explorer"].HISTORY,
    JSON.stringify(history)
  );
};

export const addToHistory = (entry: Omit<HistoryEntry, "timestamp">): void => {
  const history = loadHistory();
  const newEntry = { ...entry, timestamp: Date.now() };
  history.unshift(newEntry);
  // Keep only last 100 entries
  saveHistory(history.slice(0, 100));
};

// Add new functions for wayback year
export const loadWaybackYear = (): string => {
  return (
    localStorage.getItem(
      APP_STORAGE_KEYS["internet-explorer"].LAST_URL + ":year"
    ) || DEFAULT_YEAR
  );
};

export const saveWaybackYear = (year: string): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["internet-explorer"].LAST_URL + ":year",
    year
  );
};

// Desktop icon visibility state
const DESKTOP_ICONS_KEY = "desktop:icons";

interface DesktopIconState {
  [appId: string]: {
    visible: boolean;
  };
}

const DEFAULT_DESKTOP_ICONS: DesktopIconState = {
  soundboard: { visible: true },
  "internet-explorer": { visible: true },
  chats: { visible: true },
  textedit: { visible: true },
  "control-panels": { visible: false },
  minesweeper: { visible: true },
  finder: { visible: false },
};

export const loadDesktopIconState = (): DesktopIconState => {
  const saved = localStorage.getItem(DESKTOP_ICONS_KEY);
  if (saved) {
    return { ...DEFAULT_DESKTOP_ICONS, ...JSON.parse(saved) };
  }
  return DEFAULT_DESKTOP_ICONS;
};

export const saveDesktopIconState = (state: DesktopIconState): void => {
  localStorage.setItem(DESKTOP_ICONS_KEY, JSON.stringify(state));
};

export const calculateStorageSpace = () => {
  let total = 0;
  let used = 0;

  try {
    // Estimate total space (typical quota is around 10MB)
    total = 10 * 1024 * 1024; // 10MB in bytes

    // Calculate used space
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += value.length * 2; // Multiply by 2 for UTF-16 encoding
        }
      }
    }
  } catch (error) {
    console.error("Error calculating storage space:", error);
  }

  return {
    total,
    used,
    available: total - used,
    percentUsed: Math.round((used / total) * 100),
  };
};
