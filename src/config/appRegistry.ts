import { TextEditApp } from "@/apps/textedit";
import { InternetExplorerApp } from "@/apps/internet-explorer";
import { ChatsApp } from "@/apps/chats";
import ControlPanelsApp from "@/apps/control-panels";
import { MinesweeperApp } from "@/apps/minesweeper";
import { SoundboardApp } from "@/apps/soundboard";
import { FinderApp } from "@/apps/finder";

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowConstraints {
  minSize?: WindowSize;
  maxSize?: WindowSize;
  defaultSize: WindowSize;
  mobileDefaultSize?: WindowSize;
}

// Default window constraints for any app not specified
const defaultWindowConstraints: WindowConstraints = {
  defaultSize: { width: 730, height: 475 },
  minSize: { width: 300, height: 200 },
};

// Registry of all available apps with their window configurations
export const appRegistry = {
  [FinderApp.id]: {
    ...FinderApp,
    windowConfig: {
      defaultSize: { width: 400, height: 300 },
      minSize: { width: 300, height: 200 },
    } as WindowConstraints,
  },

  [SoundboardApp.id]: {
    ...SoundboardApp,
    windowConfig: {
      defaultSize: { width: 650, height: 475 },
      minSize: { width: 550, height: 375 },
    } as WindowConstraints,
  },
  [InternetExplorerApp.id]: {
    ...InternetExplorerApp,
    windowConfig: {
      defaultSize: { width: 730, height: 600 },
      minSize: { width: 400, height: 300 },
    } as WindowConstraints,
  },
  [ChatsApp.id]: {
    ...ChatsApp,
    windowConfig: {
      defaultSize: { width: 316, height: 360 },
      minSize: { width: 280, height: 320 },
    } as WindowConstraints,
  },
  [TextEditApp.id]: {
    ...TextEditApp,
    windowConfig: {
      defaultSize: { width: 420, height: 475 },
      minSize: { width: 368, height: 200 },
    } as WindowConstraints,
  },
  [MinesweeperApp.id]: {
    ...MinesweeperApp,
    windowConfig: {
      defaultSize: { width: 305, height: 400 },
      minSize: { width: 305, height: 400 },
      maxSize: { width: 305, height: 400 },
    } as WindowConstraints,
  },
  [ControlPanelsApp.id]: {
    ...ControlPanelsApp,
    windowConfig: {
      defaultSize: { width: 365, height: 400 },
      minSize: { width: 320, height: 400 },
      maxSize: { width: 365, height: 600 },
    } as WindowConstraints,
  },
} as const;

// Type for app IDs
export type AppId = keyof typeof appRegistry & string;

// Helper function to get app icon path
export const getAppIconPath = (appId: AppId): string => {
  const app = appRegistry[appId];
  if (typeof app.icon === "string") {
    return app.icon;
  }
  return app.icon.src;
};

// Helper function to get all apps except Finder
export const getNonFinderApps = (): Array<{
  name: string;
  icon: string;
  id: AppId;
}> => {
  return Object.entries(appRegistry)
    .filter(([id]) => id !== "finder")
    .map(([id, app]) => ({
      name: app.name,
      icon: getAppIconPath(id as AppId),
      id: id as AppId,
    }));
};

// Helper function to get app metadata
export const getAppMetadata = (appId: AppId) => {
  return appRegistry[appId].metadata;
};

// Helper function to get app component
export const getAppComponent = (appId: AppId) => {
  return appRegistry[appId].component;
};

// Helper function to get window configuration
export const getWindowConfig = (appId: AppId): WindowConstraints => {
  return appRegistry[appId].windowConfig || defaultWindowConstraints;
};

// Helper function to get mobile window size
export const getMobileWindowSize = (appId: AppId): WindowSize => {
  const config = getWindowConfig(appId);
  if (config.mobileDefaultSize) {
    return config.mobileDefaultSize;
  }
  return {
    width: window.innerWidth,
    height: config.defaultSize.height,
  };
};
