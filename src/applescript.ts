import { execFile } from "child_process";

export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

export function hexToKeynoteRGB(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) * 257;
  const g = parseInt(hex.slice(3, 5), 16) * 257;
  const b = parseInt(hex.slice(5, 7), 16) * 257;
  return { r, g, b };
}

export function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr?.trim() || error.message;
        reject(new Error(`AppleScript error: ${message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export function runJXA(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr?.trim() || error.message;
        reject(new Error(`JXA error: ${message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export function keynoteScript(body: string): string {
  return `tell application "Keynote"\n${body}\nend tell`;
}

export function ensureKeynoteRunning(): string {
  return `tell application "Keynote" to activate
delay 0.5`;
}
