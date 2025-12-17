# Locator Vim 🎯

[English](./README_EN.md)

- 一个 Chrome 浏览器扩展，让你可以直接从浏览器中点击 Vue3 组件，在 Kitty 终端中使用 Vim/Neovim 打开对应的源代码文件。
- [locatorjs](https://github.com/infi-pc/locatorjs)的vim版本，仅支持Vim/Neovim。

## 📢注意

- 个人使用，不保证兼容性，功能按需添加。

## ✨ 功能特点

- 🎯 **组件定位**: `Alt + 点击` 任意 Vue3 组件，直接跳转到源代码
- 🐱 **Kitty 集成**: 尽可能自动找到打开当前项目的 Kitty 进程和标签页
- 📝 **Vim/NeoVim 支持**: 在 **Vim/Neovim** 中打开 `DOM` 所属源文件
- 🌈 **高亮显示**: `Alt + 悬停` 显示组件边框和源文件路径

## 📋 环境要求

- 仅支持[Kitty Terminal](https://sw.kovidgoyal.net/kitty/)
- 仅支持MacOS
- 仅支持Vim/Neovim
- 仅支持Chrome浏览器
- 安装Nodejs环境且使用[nvm](https://github.com/nvm-sh/nvm)管理版本

## 🚀 安装步骤

### 1. 配置 Kitty 远程控制

在 `kitty.conf` 中添加：

```bash
allow_remote_control yes
listen_on unix:/tmp/locator_vim_kitty--
```

然后重启 Kitty。

### 2. 加载 Chrome 扩展

1. 打开 Chrome，访问 `chrome://extensions`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 下载仓库后，选择 `locatorjs-vim` 文件夹
5. 记下显示的扩展 ID

### 3. 安装 Native Host

```bash
cd /path/to/locatorjs-vim
chmod +x install_host.sh
./install_host.sh
```

按提示输入Chrome扩展 ID。

### 4. 重新加载扩展

回到 `chrome://extensions`，点击扩展的刷新按钮。

## 🎮 使用方法

1. 在浏览器中打开你的 **Vue3** 应用
2. 按住 **Alt** 键，鼠标悬停在组件上
3. 看到绿色边框后，**Alt + 点击** 即可在 **Vim/Neovim** 中打开对应文件

## 🔧 故障排除

### 点击无反应

1. 确保 Kitty 已配置 `allow_remote_control yes` 和 `listen_on unix:/tmp/locator_vim_kitty--`
2. 确保已重启 Kitty（彻底关闭进程）
3. 检查 Chrome 开发者工具控制台是否有错误
4. 确保 Node.js 和 nvm 已安装
5. 查看调试日志：`cat ~/locator_vim_debug.log`

## 📄 License

MIT
