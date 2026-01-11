const { execFileSync, execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { DEFAULT_KITTY_PATH, DEFAULT_OPENER } = require('./constants');

let KITTY_PATH = DEFAULT_KITTY_PATH;
let OPENER = DEFAULT_OPENER;

function setKittyPath(kittyPath) {
  KITTY_PATH = kittyPath;
}

function setOpener(opener) {
  OPENER = opener;
}

function getKittyPath() {
  return KITTY_PATH;
}

function getOpener() {
  return OPENER;
}

function getKittySocket() {
  const envSocket = process.env.KITTY_LISTEN_ON;
  if (envSocket) return envSocket;

  const tmpFiles = fs.readdirSync('/tmp');
  for (const file of tmpFiles) {
    if (!file.startsWith('locator_vim_kitty-')) continue;

    const fullPath = `/tmp/${file}`;
    const stats = fs.statSync(fullPath);
    if (stats.isSocket()) {
      return `unix:${fullPath}`;
    }
  }

  return null;
}

function runKittyCmd(args, socket = null) {
  const cmdArgs = ['@'];
  if (socket) {
    cmdArgs.push('--to', socket);
  }
  cmdArgs.push(...args);
  return execFileSync(KITTY_PATH, cmdArgs, { encoding: 'utf8' });
}

function getKittyWindows(socket = null) {
  const result = runKittyCmd(['ls'], socket);
  return JSON.parse(result);
}

function findKittyTabForProject(filePath, kittyData) {
  if (!kittyData) return null;

  filePath = path.resolve(filePath);

  let bestMatch = null;
  let bestMatchLength = 0;

  for (const osWindow of kittyData) {
    const osWindowId = osWindow.id;

    for (const tab of osWindow.tabs || []) {
      const tabId = tab.id;
      const tabWindows = tab.windows || [];

      for (const window of tabWindows) {
        const windowId = window.id;
        const foregroundProcesses = window.foreground_processes || [];

        for (const proc of foregroundProcesses) {
          const cwd = proc.cwd;
          if (!filePath.startsWith(cwd)) continue;

          if (cwd.length > bestMatchLength) {
            bestMatchLength = cwd.length;

            const cmdline = proc.cmdline || [];
            const isVim = cmdline.some(c => String(c).toLowerCase().includes(OPENER));

            bestMatch = {
              osWindowId,
              tabId,
              vimWindowId: isVim ? windowId : null,
              cwd,
            };
          }
        }
      }
    }
  }

  return bestMatch;
}

function activateKittyApp() {
  execSync('osascript -e \'tell application "kitty" to activate\'', { timeout: 2000 });
}

function launchKittyInstance(projectDir, filePath, line) {
  activateKittyApp();
  spawn(KITTY_PATH, ['--directory', projectDir, OPENER, `+${line}`, filePath], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

function focusKittyTab(tabInfo, socket = null) {
  activateKittyApp();
  runKittyCmd(['focus-tab', '--match', `id:${tabInfo.tabId}`], socket);

  const windowId = tabInfo.vimWindowId;
  if (windowId) {
    runKittyCmd(['focus-window', '--match', `id:${windowId}`], socket);
  }
}

function sendVimCommand(windowId, filePath, line, socket = null) {
  const windowMatch = `id:${windowId}`;
  const escapedPath = filePath.replace(/ /g, '\\ ').replace(/'/g, "\\'");
  const vimCmd = `\x1b:e +${line} ${escapedPath}\r`;
  runKittyCmd(['send-text', '--match', windowMatch, vimCmd], socket);
}

function launchInNewTab(projectDir, filePath, line, socket = null) {
  const launchCmd = `${OPENER} +${line} '${filePath}'`;
  runKittyCmd(['launch', '--type=tab', '--cwd', projectDir, '/bin/zsh', '-lc', launchCmd], socket);
}

module.exports = {
  setKittyPath,
  setOpener,
  getKittyPath,
  getOpener,
  getKittySocket,
  runKittyCmd,
  getKittyWindows,
  findKittyTabForProject,
  activateKittyApp,
  focusKittyTab,
  sendVimCommand,
  launchInNewTab,
  launchKittyInstance,
};
