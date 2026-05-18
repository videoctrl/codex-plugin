export type ExportPreset = "720p" | "1080p" | "4k";

export type RenderSize = {
  width: number;
  height: number;
};

export function renderSizeForPreset(preset: ExportPreset): RenderSize {
  switch (preset) {
    case "720p":
      return { width: 1280, height: 720 };
    case "1080p":
      return { width: 1920, height: 1080 };
    case "4k":
      return { width: 3840, height: 2160 };
  }
}
