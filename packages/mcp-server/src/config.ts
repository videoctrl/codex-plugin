export type VideoControlConfig = {
  mode: "local";
  previewPort: number;
};

export function loadConfig(): VideoControlConfig {
  return {
    mode: "local",
    previewPort: Number.parseInt(process.env.VIDEOCONTROL_PREVIEW_PORT ?? "48731", 10)
  };
}
