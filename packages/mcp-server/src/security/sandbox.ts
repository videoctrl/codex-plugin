export function describeLocalSandbox() {
  return {
    mode: "local",
    sourceMediaPolicy: "VideoControl reads source media by reference and writes project state under .videocontrol."
  };
}
