import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallpaper } from "@/hooks/useWallpaper";

type PhotoCategory =
  | "3d_graphics"
  | "convergency"
  | "foliage"
  | "landscapes"
  | "nostalgia"
  | "objects"
  | "structures";

const TILE_WALLPAPERS = [
  "default",
  "macos",
  "bondi",
  "bondi_dark",
  "bondi_light",
  "bondi_medium",
  "bondi_extra_dark",
  "french_blue_dark",
  "french_blue_light",
  "sunny",
  "sunny_dark",
  "sunny_light",
  "poppy",
  "poppy_dark",
  "poppy_light",
  "poppy_medium",
  "azul_dark",
  "azul_light",
  "azul_extra_light",
  "pistachio_dark",
  "pistachio_light",
  "pistachio_medium",
  "candy_bar",
  "candy_bar_sunny",
  "candy_bar_pistachio",
  "candy_bar_azul",
  "waves_sunny",
  "waves_bondi",
  "waves_azul",
  "ripple_poppy",
  "ripple_bondi",
  "ripple_azul",
  "rio_pistachio",
  "rio_azul",
  "bubbles_poppy",
  "bubbles_bondi",
  "bossanova_poppy",
  "bossanova_poppy_2",
  "bossanova_bondi",
  "diagonals_poppy",
  "diagonals_bondi",
  "diagonals_bondi_dark",
  "flat_peanuts",
  "flat_peanuts_poppy",
  "peanuts_pistachio",
  "peanuts_azul",
].map((name) => `/wallpapers/tiles/${name}.png`);

const PHOTO_WALLPAPERS: Record<PhotoCategory, string[]> = {
  "3d_graphics": [
    "capsule",
    "capsule_azul",
    "capsule_pistachio",
    "tub",
    "tub_azul",
    "tub_bondi",
    "ufo_1",
    "ufo_2",
    "ufo_3",
  ],
  convergency: Array.from({ length: 15 }, (_, i) => `convergence_${i + 1}`),
  foliage: [
    "blue_flowers",
    "cactus",
    "golden_poppy",
    "red_cyclamens",
    "red_tulips",
    "rose",
    "spider_lily",
    "waterdrops_on_leaf",
    "yellow_tulips",
  ],
  landscapes: [
    "beach",
    "clouds",
    "french_alps",
    "ganges_river",
    "golden_gate_at_dusk",
    "mono_lake",
    "palace_on_lake_in_jaipur",
    "rain_god_mesa",
    "refuge-col_de_la_grasse-alps",
    "zabriskie_point",
  ],
  nostalgia: [
    "acropolis",
    "beach_on_ko_samui",
    "birds_in_flight",
    "cancun_sunset",
    "cliffs_of_moher",
    "fish_eagle",
    "galway_bay",
    "glacier_national_park",
    "highway_395",
    "hong_kong_at_night",
    "islamorada_sunrise",
    "lily_pad",
    "long_island_sound",
    "mac_os_background",
    "midsummer_night",
    "moraine_lake",
    "oasis_in_baja",
    "red_clouds",
    "toronto_skyline",
    "tuolumne_meadows",
    "yosemite_valley",
    "yucatan",
  ],
  objects: [
    "alpine_granite",
    "bicycles",
    "bottles",
    "burmese_claypots",
    "burning_candle",
    "chairs",
    "faucet_handle",
    "neon",
    "salt_shaker_top",
    "shamus",
  ],
  structures: [
    "gate",
    "gate_lock",
    "glass_door_knob",
    "padlock",
    "rusty_lock",
    "shutters",
    "stone_wall",
    "wall_of_stones",
  ],
};

// Transform photo paths
Object.entries(PHOTO_WALLPAPERS).forEach(([category, photos]) => {
  PHOTO_WALLPAPERS[category as PhotoCategory] = photos.map(
    (name) => `/wallpapers/photos/${category}/${name}.jpg`
  );
});

const PHOTO_CATEGORIES = Object.keys(PHOTO_WALLPAPERS) as PhotoCategory[];

interface WallpaperPickerProps {
  onSelect?: (path: string) => void;
}

export function WallpaperPicker({ onSelect }: WallpaperPickerProps) {
  const { currentWallpaper, setWallpaper } = useWallpaper();
  const [selectedCategory, setSelectedCategory] = useState<
    "tiles" | PhotoCategory
  >(() => {
    // Set initial category based on current wallpaper
    if (currentWallpaper.includes("/wallpapers/tiles/")) {
      return "tiles";
    }
    for (const category of PHOTO_CATEGORIES) {
      if (currentWallpaper.includes(`/wallpapers/photos/${category}/`)) {
        return category;
      }
    }
    return "tiles";
  });

  const handleWallpaperSelect = (path: string) => {
    setWallpaper(path);
    if (onSelect) {
      onSelect(path);
    }
  };

  // Force rerender when wallpaper changes
  useEffect(() => {
    if (currentWallpaper.includes("/wallpapers/tiles/")) {
      setSelectedCategory("tiles");
    } else {
      for (const category of PHOTO_CATEGORIES) {
        if (currentWallpaper.includes(`/wallpapers/photos/${category}/`)) {
          setSelectedCategory(category);
          break;
        }
      }
    }
  }, [currentWallpaper]);

  const formatCategoryLabel = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <Select
        value={selectedCategory}
        onValueChange={(value) =>
          setSelectedCategory(value as typeof selectedCategory)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tiles">Tiled Patterns</SelectItem>
          {PHOTO_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {formatCategoryLabel(category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ScrollArea className="flex-1 h-[200px]">
        <div
          className={`grid gap-2 ${
            selectedCategory === "tiles" ? "grid-cols-8" : "grid-cols-3"
          }`}
        >
          {selectedCategory === "tiles" ? (
            TILE_WALLPAPERS.map((path) => (
              <div
                key={path}
                className={`w-full aspect-square border cursor-pointer hover:opacity-90 ${
                  currentWallpaper === path
                    ? "border-[#000000]"
                    : "border-transparent"
                }`}
                style={{
                  backgroundImage: `url(${path})`,
                  backgroundSize: "64px 64px",
                  backgroundRepeat: "repeat",
                }}
                onClick={() => handleWallpaperSelect(path)}
              />
            ))
          ) : PHOTO_WALLPAPERS[selectedCategory] ? (
            PHOTO_WALLPAPERS[selectedCategory].map((path) => (
              <div
                key={path}
                className={`w-full aspect-video border-2 cursor-pointer hover:opacity-90 ${
                  currentWallpaper === path
                    ? "border-[#000000]"
                    : "border-transparent"
                }`}
                style={{
                  backgroundImage: `url(${path})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                onClick={() => handleWallpaperSelect(path)}
              />
            ))
          ) : (
            <div className="col-span-4 text-center py-8 text-gray-500">
              Photos coming soon for this category...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
