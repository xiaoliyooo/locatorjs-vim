const path = require('path');
const fs = require('fs');

const { LOG_FILE } = require('./constants');

function findProjectRoot(startDir) {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return startDir;
}

function log(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} - ${msg}\n`);
}

module.exports = {
  findProjectRoot,
  log,
};
