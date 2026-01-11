#!/usr/bin/env node

const path = require('path');

const {
  setKittyPath,
  setOpener,
  getKittySocket,
  getKittyWindows,
  findKittyTabForProject,
  focusKittyTab,
  sendVimCommand,
  launchInNewTab,
  launchKittyInstance,
} = require('../kitty');

const { findProjectRoot, log } = require('../helper');
const { DEFAULT_KITTY_PATH, DEFAULT_OPENER } = require('../constants');

// Native messaging uses stdin/stdout with length-prefixed messages
let inputBuffer = Buffer.alloc(0);

process.stdin.on('data', chunk => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  processMessages();
});

process.stdin.on('end', () => {
  process.exit(0);
});

process.stdin.on('error', err => {
  log(`Stdin error: ${err.message}`);
});

function processMessages() {
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0);

    if (inputBuffer.length < 4 + messageLength) {
      return;
    }

    const messageBuffer = inputBuffer.slice(4, 4 + messageLength);
    inputBuffer = inputBuffer.slice(4 + messageLength);

    try {
      const message = JSON.parse(messageBuffer.toString('utf8'));
      handleMessage(message);
    } catch (e) {
      log(`Failed to parse message: ${e.message}`);
      sendMessage({ success: false, error: e.message });
    }
  }
}

function handleMessage(message) {
  const action = message.action;

  if (action === 'openFile') {
    const filePath = message.file || '';
    const line = message.line || 1;
    const column = message.column || 1;

    setKittyPath(message.kittyPath || DEFAULT_KITTY_PATH);
    setOpener(message.opener || DEFAULT_OPENER);

    if (!filePath) {
      throw new Error('No file path provided');
    }

    const socket = getKittySocket();
    const kittyData = getKittyWindows(socket);
    const tabInfo = findKittyTabForProject(filePath, kittyData);
    openInVim(filePath, line, column, socket, tabInfo);
    sendMessage({ success: true });
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
}

function openInVim(filePath, line, column, socket = null, tabInfo = null) {
  filePath = path.resolve(filePath);
  const fileDir = path.dirname(filePath);

  if (tabInfo) {
    focusKittyTab(tabInfo, socket);

    if (tabInfo.vimWindowId) {
      sendVimCommand(tabInfo.vimWindowId, filePath, line, socket);
    } else {
      const projectDir = findProjectRoot(fileDir);
      launchInNewTab(projectDir, filePath, line, socket);
    }
  } else {
    const projectDir = findProjectRoot(fileDir);
    launchKittyInstance(projectDir, filePath, line);
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
