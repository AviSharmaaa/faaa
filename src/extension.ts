import * as vscode from "vscode";
import * as path from "path";
import * as cp from "child_process";

export function activate(context: vscode.ExtensionContext) {
  console.log("FAAAAH is watching your failures 👀");

  const soundPath = path.join(context.extensionPath, "sounds", "faaa.mp3");

  // Method 1: VS Code Task failures
  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.exitCode === undefined || e.exitCode === 0) return;

      playSound(soundPath);
    }),
  );

  // Method 2: Terminal commands (shell integration)
  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (e.exitCode === undefined || e.exitCode === 0) return;

      playSound(soundPath);
    }),
  );
}

function playSound(filePath: string) {
  const platform = process.platform;
  let cmd: string;

  if (platform === "darwin") {
    cmd = `afplay "${filePath}"`;
  } else if (platform === "linux") {
    cmd = `mpg123 -q "${filePath}" 2>/dev/null || aplay "${filePath}"`;
  } else if (platform === "win32") {
    cmd = `powershell -c "$p = New-Object System.Windows.Media.MediaPlayer; $p.Open('${filePath}'); $p.Play(); Start-Sleep 3"`;
  } else {
    return;
  }

  cp.exec(cmd, (err) => {
    if (err) console.error("FAAAAH failed to FAAAAH:", err.message);
  });
}

export function deactivate() {}
