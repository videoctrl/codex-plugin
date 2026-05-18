import { spawn } from "node:child_process";

export type ProcessResult = {
  stdout: string;
  stderr: string;
};

export async function runProcess(command: string, args: string[], options: { cwd?: string } = {}): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(new Error(`${command} could not be started. Install FFmpeg and try again. ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} failed with exit code ${code}.\n${stderr || stdout}`));
      }
    });
  });
}

export async function assertExecutable(command: string) {
  await runProcess(command, ["-version"]);
}
