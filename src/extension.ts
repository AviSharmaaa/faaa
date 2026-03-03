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

const VOLUME_KEY = "faaa.volume";

const VOLUME_OPTIONS = [
  { label: "🔇 Mute", value: 0 },
  { label: "🔈 25%", value: 0.25 },
  { label: "🔉 50%", value: 0.5 },
  { label: "🔊 75%", value: 0.75 },
  { label: "🔊 100%", value: 1.0 },
];

function volumeLabel(volume: number): string {
  if (volume === 0) return "🔇 FAAA";
  if (volume <= 0.25) return "🔈 FAAA 25%";
  if (volume <= 0.5) return "🔉 FAAA 50%";
  if (volume <= 0.75) return "🔊 FAAA 75%";
  return "🔊 FAAA 100%";
}

export function activate(context: vscode.ExtensionContext) {
  console.log("FAAA is watching your failures 👀");

  let volume: number = context.globalState.get<number>(VOLUME_KEY) ?? 1.0;

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "faaa.setVolume";
  statusBarItem.tooltip = "FAAA: Click to change volume";
  statusBarItem.text = volumeLabel(volume);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Command to pick volume
  context.subscriptions.push(
    vscode.commands.registerCommand("faaa.setVolume", async () => {
      const picked = await vscode.window.showQuickPick(
        VOLUME_OPTIONS.map((o) => ({
          ...o,
          description: o.value === volume ? "current" : undefined,
        })),
        { title: "FAAA Volume", placeHolder: "Select volume level" },
      );
      if (!picked) return;
      volume = picked.value;
      context.globalState.update(VOLUME_KEY, volume);
      statusBarItem.text = volumeLabel(volume);
    }),
  );

  function playSound() {
    if (volume === 0) return;

    const soundName = sounds[crypto.randomInt(0, sounds.length)];
    const soundPath = path.join(context.extensionPath, "sounds", soundName);
    const platform = process.platform;
    let cmd: string;

    if (platform === "darwin") {
      // afplay -v: 0.0–1.0 (and beyond), default 1.0
      cmd = `afplay -v ${volume} "${soundPath}"`;
    } else if (platform === "linux") {
      // mpg123 -f: scale factor 0–32768 (32768 = 100%)
      const mpgScale = Math.round(volume * 32768);
      // ffplay -volume: 0–100
      const ffVolume = Math.round(volume * 100);
      // paplay --volume: 0–65536
      const paVolume = Math.round(volume * 65536);
      cmd = `mpg123 -q -f ${mpgScale} "${soundPath}" 2>/dev/null || ffplay -nodisp -autoexit -volume ${ffVolume} "${soundPath}" 2>/dev/null || paplay --volume=${paVolume} "${soundPath}" 2>/dev/null || aplay "${soundPath}" 2>/dev/null`;
    } else if (platform === "win32") {
      cmd = `powershell -c "$p = New-Object System.Windows.Media.MediaPlayer; $p.Open('${soundPath}'); $p.Volume = ${volume}; $p.Play(); Start-Sleep 3"`;
    } else {
      return;
    }

    cp.exec(cmd, (err) => {
      if (err) console.error("FAAA failed to FAAA:", err.message);
    });
  }

  // Method 1: VS Code Task failures
  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.exitCode === undefined || e.exitCode === 0) return;
      if (e.exitCode === 130) return;

      playSound();
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

      playSound();
    }),
  );
}

export function deactivate() {}
