/**
 * Claude CLI runner.
 *
 * Wraps `claude -p` (pipe/non-interactive mode) as a child process.
 * Returns the full response text. Handles timeouts and errors.
 */

import { spawn } from "node:child_process";

export interface ClaudeRunOptions {
  /** The prompt to send to claude */
  prompt: string;
  /** Working directory for claude (affects project context) */
  cwd?: string;
  /** Timeout in milliseconds (default: 120_000 = 2 min) */
  timeout?: number;
  /** Maximum output length in characters (default: 4000 for Discord) */
  maxOutput?: number;
}

export interface ClaudeRunResult {
  /** Whether the command completed successfully */
  success: boolean;
  /** The response text from claude */
  output: string;
  /** Error message if failed */
  error?: string;
  /** Whether the output was truncated */
  truncated: boolean;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Run claude in pipe mode and return the result.
 *
 * Uses `claude -p` which reads a prompt from stdin and writes
 * the response to stdout. No interactive session, no TUI.
 */
export async function runClaude(
  options: ClaudeRunOptions
): Promise<ClaudeRunResult> {
  const {
    prompt,
    cwd,
    timeout = 120_000,
    maxOutput = 4000,
  } = options;

  const startTime = Date.now();

  return new Promise<ClaudeRunResult>((resolve) => {
    const child = spawn("claude", ["-p"], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: cleanEnv(),
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let killed = false;

    // Timeout handler
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      // Give it a moment to clean up, then force kill
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeout);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        output: "",
        error: `Failed to spawn claude: ${err.message}`,
        truncated: false,
        durationMs: Date.now() - startTime,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      let output = Buffer.concat(stdoutChunks).toString("utf-8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();

      if (killed) {
        resolve({
          success: false,
          output: truncateOutput(output, maxOutput),
          error: `Timed out after ${Math.round(timeout / 1000)}s`,
          truncated: output.length > maxOutput,
          durationMs,
        });
        return;
      }

      if (code !== 0) {
        resolve({
          success: false,
          output: truncateOutput(output, maxOutput),
          error: stderr || `Process exited with code ${code}`,
          truncated: output.length > maxOutput,
          durationMs,
        });
        return;
      }

      const truncated = output.length > maxOutput;
      resolve({
        success: true,
        output: truncateOutput(output, maxOutput),
        truncated,
        durationMs,
      });
    });

    // Send the prompt via stdin and close
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Build a clean env that won't trigger Claude Code's nesting guard. */
function cleanEnv(): NodeJS.ProcessEnv {
  const { CLAUDECODE, ...rest } = process.env;
  return rest;
}

/** Truncate output to fit Discord's limits */
function truncateOutput(text: string, max: number): string {
  if (text.length <= max) return text;
  const suffix = "\n\n… (truncated)";
  return text.slice(0, max - suffix.length) + suffix;
}
