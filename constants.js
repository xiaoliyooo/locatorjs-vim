const path = require('path');
const os = require('os');

const LOG_FILE = path.join(os.homedir(), 'locator_vim_debug.log');
const DEFAULT_KITTY_PATH = '/Applications/kitty.app/Contents/MacOS/kitty';
const DEFAULT_OPENER = 'nvim';

module.exports = {
  LOG_FILE,
  DEFAULT_KITTY_PATH,
  DEFAULT_OPENER,
};
