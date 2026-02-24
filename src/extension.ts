import * as vscode from "vscode";
import * as path from "path";
import * as cp from "child_process";
import * as crypto from "crypto";

const sounds = [
  "faaa-0.mp3",
  "faaa-1.mp3",
  "faaa-2.mp3",
  "faaa-3.mp3",
  "faaa-4.mp3",
];

export function activate(context: vscode.ExtensionContext) {
  console.log("FAAA is watching your failures 👀");

  // Method 1: VS Code Task failures
  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.exitCode === undefined || e.exitCode === 0) return;
      if (e.exitCode === 130) return;

      playSound(context);
    }),
  );

  // Method 2: Terminal commands (shell integration)
  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (e.exitCode === undefined || e.exitCode === 0) return;

      // 130 = Ctrl+C (SIGINT), user intentionally cancelled
      if (e.exitCode === 130) return;

      // Skip agent/extension-owned terminals
      const terminalName = e.terminal.name.toLowerCase();
      const agentTerminals = [
        "agent",
        "copilot",
        "claude",
        "task",
        "extension",
      ];
      if (agentTerminals.some((name) => terminalName.includes(name))) return;

      // Skip package installs — Ctrl+C on these also exits with code 1 on Mac
      const cmd = e.execution.commandLine.value.toLowerCase().trim();
      const ignore = [
        "npm i",
        "npm install",
        "yarn install",
        "yarn add",
        "pnpm install",
        "pnpm add",
        "pip install",
        "brew",
      ];
      if (ignore.some((c) => cmd.startsWith(c))) return;

      playSound(context);
    }),
  );
}

function playSound(context: vscode.ExtensionContext) {
  // make this more random by picking a random sound from the list
  const soundName = sounds[crypto.randomInt(0, sounds.length)];
  const soundPath = path.join(context.extensionPath, "sounds", soundName);

  const platform = process.platform;
  let cmd: string;

  if (platform === "darwin") {
    cmd = `afplay "${soundPath}"`;
  } else if (platform === "linux") {
    // try mpg123, aplay, or paplay, whichever is available
    cmd = `mpg123 -q "${soundPath}" 2>/dev/null || aplay "${soundPath}" 2>/dev/null || paplay "${soundPath}" 2>/dev/null`;
  } else if (platform === "win32") {
    cmd = `powershell -c "$p = New-Object System.Windows.Media.MediaPlayer; $p.Open('${soundPath}'); $p.Play(); Start-Sleep 3"`;
  } else {
    return;
  }

  cp.exec(cmd, (err) => {
    if (err) console.error("FAAA failed to FAAA:", err.message);
  });
}

export function deactivate() {}
