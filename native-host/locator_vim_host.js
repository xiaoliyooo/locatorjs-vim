#!/usr/bin/env node

const { execFileSync, execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_KITTY_PATH = '/Applications/kitty.app/Contents/MacOS/kitty';
const DEFAULT_OPENER = 'nvim';
const LOG_FILE = path.join(os.homedir(), 'locator_vim_debug.log');

let KITTY_PATH = DEFAULT_KITTY_PATH;
let OPENER = DEFAULT_OPENER;

log('=== Native host started ===');

// Native messaging uses stdin/stdout with length-prefixed messages
let inputBuffer = Buffer.alloc(0);

process.stdin.on('data', chunk => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  processMessages();
});

process.stdin.on('end', () => {
  log('Stdin ended, exiting');
  process.exit(0);
});

process.stdin.on('error', err => {
  log(`Stdin error: ${err.message}`);
});

function processMessages() {
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0);

    if (inputBuffer.length < 4 + messageLength) {
      // Wait for more data
      return;
    }

    const messageBuffer = inputBuffer.slice(4, 4 + messageLength);
    inputBuffer = inputBuffer.slice(4 + messageLength);

    try {
      const message = JSON.parse(messageBuffer.toString('utf8'));
      handleMessage(message);
    } catch (e) {
      log(`Failed to parse message: ${e.message}`);
      sendMessage({ success: false, error: 'Failed to parse message' });
    }
  }
}

function sendMessage(message) {
  const messageString = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageString, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);
}

function handleMessage(message) {
  log(`Received message: ${JSON.stringify(message)}`);
  const action = message.action;

  if (action === 'openFile') {
    const filePath = message.file || '';
    const line = message.line || 1;
    const column = message.column || 1;
    KITTY_PATH = message.kittyPath || DEFAULT_KITTY_PATH;
    OPENER = message.opener || DEFAULT_OPENER;

    if (!filePath) {
      sendMessage({ success: false, error: 'No file path provided' });
      return;
    }

    const socket = getKittySocket();
    log(`Using socket: ${socket}`);

    const kittyData = getKittyWindows(socket);
    log(`Kitty data available: ${kittyData !== null}`);

    // Find the best matching tab for this file's project
    const tabInfo = findKittyTabForProject(filePath, kittyData);

    // Open the file in OPENER
    const success = openInVim(filePath, line, column, socket, tabInfo);

    if (success) {
      sendMessage({ success: true });
    } else {
      sendMessage({
        success: false,
        error: `Failed to open file in ${OPENER}. Check ~/locator_vim_debug.log`,
      });
    }
  } else {
    sendMessage({ success: false, error: `Unknown action: ${action}` });
  }
}

function getKittySocket() {
  const envSocket = process.env.KITTY_LISTEN_ON; // cmdline:  kitty --listen-on
  if (envSocket) {
    log(`Found socket from env: ${envSocket}`);
    return envSocket;
  }

  const customPaths = [
    // todo custom path
  ];

  for (const socketPath of customPaths) {
    if (fs.existsSync(socketPath)) {
      log(`Found socket at: ${socketPath}`);
      return `unix:${socketPath}`;
    }
  }

  // Find kitty sockets in /tmp
  try {
    const tmpFiles = fs.readdirSync('/tmp');
    for (const file of tmpFiles) {
      // Look for locator_vim_kitty-XXXX
      if (file.startsWith('locator_vim_kitty-')) {
        const fullPath = `/tmp/${file}`;
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isSocket()) {
            log(`Found socket at: ${fullPath}`);
            return `unix:${fullPath}`;
          }
        } catch (e) {
          log(`Unknown err: ${e.message}`);
        }
      }
    }
  } catch (e) {
    log(`Failed to scan /tmp: ${e.message}`);
  }

  log('No socket found');
  return null;
}

/**
 * Run a kitty @ command
 */
function runKittyCmd(args, socket = null) {
  const cmdArgs = ['@'];
  if (socket) {
    cmdArgs.push('--to', socket);
  }
  cmdArgs.push(...args);

  log(`Running command: ${KITTY_PATH} ${cmdArgs.join(' ')}`);

  try {
    const result = execFileSync(KITTY_PATH, cmdArgs, {
      timeout: 5000,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    log(`Result: success, stdout=${result.substring(0, 200)}`);
    return { success: true, stdout: result };
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('Kitty not found');
    } else {
      log(`Command failed: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

function getKittyWindows(socket = null) {
  const result = runKittyCmd(['ls'], socket);
  if (result.success) {
    try {
      return JSON.parse(result.stdout);
    } catch (e) {
      log('Failed to parse kitty ls output');
    }
  }
  return null;
}

function findKittyTabForProject(filePath, kittyData) {
  if (!kittyData) return null;

  filePath = path.resolve(filePath);
  const fileDir = path.dirname(filePath);
  log(`Looking for tab with project containing: ${fileDir}`);

  let bestMatch = null;
  let bestMatchDepth = 0;

  for (const osWindow of kittyData) {
    const osWindowId = osWindow.id;
    const isFocusedOsWindow = osWindow.is_focused || false;

    for (const tab of osWindow.tabs || []) {
      const tabId = tab.id;
      const isActiveTab = tab.is_active || false;
      const tabWindows = tab.windows || [];

      for (const window of tabWindows) {
        const windowId = window.id;

        // Collect all possible cwds for this window
        const cwdsToCheck = [];

        // Check if this window has OPENER running (by title, cmdline, or foreground_processes)
        const windowTitle = (window.title || '').toLowerCase();
        const lastCmdline = (window.last_reported_cmdline || '').toLowerCase();
        const inAlternateScreen = window.in_alternate_screen || false;

        // Window is likely running vim if:
        // 1. Title contains "nvim" or "vim"
        // 2. last_reported_cmdline contains "nvim" or "vim"
        // 3. It's in alternate screen mode (full-screen TUI apps like vim use this)
        const titleHasVim = windowTitle.includes(OPENER);
        const cmdlineHasVim = lastCmdline.includes(OPENER);
        const likeVimByTitle = (titleHasVim || cmdlineHasVim) && inAlternateScreen;

        // Add window's cwd
        const windowCwd = window.cwd || '';
        if (windowCwd) {
          cwdsToCheck.push({
            cwd: path.resolve(windowCwd),
            vimWindowId: likeVimByTitle ? windowId : null,
          });
        }

        // Add foreground processes' cwds
        const foregroundProcesses = window.foreground_processes || [];
        for (const proc of foregroundProcesses) {
          const procCwd = proc.cwd || '';
          if (procCwd) {
            const cmdline = proc.cmdline || [];
            const isVIm = cmdline.some(c => String(c).toLowerCase().includes(OPENER));
            // Also mark as OPENER if title matches
            cwdsToCheck.push({
              cwd: path.resolve(procCwd),
              vimWindowId: isVIm || likeVimByTitle ? windowId : null,
            });
          }
        }

        // Check each cwd
        for (const { cwd, vimWindowId } of cwdsToCheck) {
          if (fileDir.startsWith(cwd + path.sep) || fileDir === cwd) {
            let matchDepth = cwd.length;

            // Prefer matches with OPENER running
            if (vimWindowId) {
              matchDepth += 1000;
            }

            if (matchDepth > bestMatchDepth) {
              bestMatchDepth = matchDepth;

              log(`Found match: cwd=${cwd}, ${OPENER}_window=${vimWindowId}, tab=${tabId}`);

              bestMatch = {
                osWindowId,
                tabId,
                matchedWindowId: windowId,
                vimWindowId,
                cwd,
                hasVim: vimWindowId !== null,
                isActiveTab,
                isFocusedOsWindow,
              };
            }
          }
        }
      }
    }
  }

  if (bestMatch) {
    log(`Best match: ${JSON.stringify(bestMatch)}`);
  } else {
    log('No matching tab found');
  }

  return bestMatch;
}

function activateKittyApp() {
  try {
    execSync('osascript -e \'tell application "kitty" to activate\'', {
      timeout: 2000,
    });
    log('Activated Kitty app');
    return true;
  } catch (e) {
    log(`Failed to activate Kitty: ${e.message}`);
    return false;
  }
}

function focusKittyTab(tabInfo, socket = null) {
  log(`Focusing tab: ${JSON.stringify(tabInfo)}`);

  activateKittyApp();

  runKittyCmd(['focus-tab', '--match', `id:${tabInfo.tabId}`], socket);

  // Focus the OPENER window if exists, otherwise the matched window
  const windowId = tabInfo.vimWindowId || tabInfo.matchedWindowId;
  if (windowId) {
    runKittyCmd(['focus-window', '--match', `id:${windowId}`], socket);
  }

  log('Tab focused');
  return true;
}

function openInVim(filePath, line, column, socket = null, tabInfo = null) {
  filePath = path.resolve(filePath);
  const fileDir = path.dirname(filePath);
  log(`Opening file: ${filePath}:${line}:${column}`);

  if (tabInfo) {
    focusKittyTab(tabInfo, socket);

    if (tabInfo.hasVim && tabInfo.vimWindowId) {
      // Vim is running - send :edit command
      const windowMatch = `id:${tabInfo.vimWindowId}`;
      const escapedPath = filePath.replace(/ /g, '\\ ').replace(/'/g, "\\'");
      // \x1b is Escape, ensures in normal mode
      const vimCmd = `\x1b:e +${line} ${escapedPath}\r`;

      log(`Sending :edit to ${OPENER} window ${tabInfo.vimWindowId}`);
      const result = runKittyCmd(['send-text', '--match', windowMatch, vimCmd], socket);
      if (result.success) {
        log(`Sent :edit command to existing ${OPENER}`);
        return true;
      } else {
        log('Failed to send :edit command, trying launch');
      }
    }

    // Vim not running - launch vim in a new window in the SAME TAB
    log(`Launching ${OPENER} in new window within the same tab`);
    const result = runKittyCmd(
      [
        'launch',
        '--type=window',
        '--cwd',
        fileDir,
        '--match',
        `id:${tabInfo.tabId}`,
        OPENER,
        `+${line}`,
        filePath,
      ],
      socket
    );

    if (result.success) {
      log(`Launched ${OPENER} in new window within same tab`);
      return true;
    }
  }

  // No matching tab found - create a new tab in existing Kitty (if running)
  log('Creating new tab for file');

  if (socket) {
    activateKittyApp();
  }

  const result = runKittyCmd(
    ['launch', '--type=tab', '--cwd', fileDir, OPENER, `+${line}`, filePath],
    socket
  );

  if (result.success) {
    log(`Launched new tab with ${OPENER} in existing Kitty`);
    return true;
  }

  // Only open new Kitty window if no existing Kitty is running at all
  if (socket) {
    // Kitty exists but command failed - log error but don't spawn new instance
    log('Failed to create tab in existing Kitty, but Kitty is running. Not spawning new instance.');
    return false;
  }

  // No Kitty running at all - spawn new instance
  log('No Kitty running, opening new Kitty window');
  try {
    activateKittyApp();
    spawn(KITTY_PATH, ['--directory', fileDir, OPENER, `+${line}`, filePath], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    return true;
  } catch (e) {
    log('Failed to open Kitty');
    return false;
  }
}

function log(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} - ${msg}\n`);
}
