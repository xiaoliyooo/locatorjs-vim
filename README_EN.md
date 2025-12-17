# Locator Vim 🎯

[中文](./README.md)

- A Chrome browser extension that allows you to click on Vue3 components directly from the browser to open the corresponding source code file in Kitty terminal using Vim/Neovim.
- The Vim version of [locatorjs](https://github.com/infi-pc/locatorjs), supporting only Vim/Neovim.

## 📢 Note

- For personal use, compatibility is not guaranteed, features added as needed.

## ✨ Features

- 🎯 **Component Locator**: `Alt + Click` on any Vue3 component to jump directly to the source code.
- 🐱 **Kitty Integration**: Automatically finds the Kitty process and tab opening the current project as much as possible.
- 📝 **Vim/NeoVim Support**: Open the source file belonging to the `DOM` in **Vim/Neovim**.
- 🌈 **Highlighting**: `Alt + Hover` to show component borders and source file path.

## 📋 Requirements

- [Kitty Terminal](https://sw.kovidgoyal.net/kitty/) only
- MacOS only
- Vim/Neovim only
- Chrome browser only
- Computer with Node.js environment installed and using [nvm](https://github.com/nvm-sh/nvm) to manage versions

## 🚀 Installation Steps

### 1. Configure Kitty Remote Control

Add the following to `kitty.conf`:

```bash
allow_remote_control yes
listen_on unix:/tmp/locator_vim_kitty--
```

Then restart Kitty.

### 2. Load Chrome Extension

1. Open Chrome and visit `chrome://extensions`
2. Turn on "Developer mode" in the top right corner
3. Click "Load unpacked"
4. After downloading the repository, select the `locatorjs-vim` folder
5. Note down the displayed Extension ID

### 3. Install Native Host

```bash
cd /path/to/locatorjs-vim
chmod +x install_host.sh
./install_host.sh
```

Enter the Chrome Extension ID when prompted.

### 4. Reload Extension

Return to `chrome://extensions` and click the refresh button for the extension.

## 🎮 Usage

1. Open your **Vue3** application in the browser
2. Hold the **Alt** key and hover over a component
3. After seeing the green border, **Alt + Click** to open the corresponding file in **Vim/Neovim**

## 🔧 Troubleshooting

### No response when clicking

1. Ensure Kitty is configured with `allow_remote_control yes` and `listen_on unix:/tmp/locator_vim_kitty--`
2. Ensure Kitty has been restarted (completely close the process)
3. Check Chrome DevTools console for errors
4. Ensure Node.js and nvm are installed
5. Check debug log: `cat ~/locator_vim_debug.log`

## 📄 License

MIT
