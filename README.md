# Traystone

将 Obsidian 运行到系统托盘，支持自定义窗口管理和全局快速笔记。

## 功能

- **开机自动启动**：登录电脑时自动打开 Obsidian
- **后台运行**：点击关闭按钮时隐藏到系统托盘，不退出应用
- **Dock 图标切换**（macOS）：点击 Dock 图标可恢复/隐藏窗口
- **关机不阻塞**：系统关机时 Obsidian 正常退出，不再阻止关机
- **全局快捷键**：快速切换窗口焦点、一键创建笔记
- **自定义托盘图标**：可更换托盘图标和提示文字
- **快速笔记**：通过快捷键或托盘菜单即时创建笔记
- **隐藏任务栏图标**：从程序坞/任务栏隐藏窗口图标

## 安装

### 从 Obsidian 社区插件市场安装

1. 打开 Obsidian 设置 → 社区插件
2. 搜索 "Traystone"
3. 点击安装并启用

### 手动安装

1. 从 [GitHub Releases](https://github.com/tinswangtao-web/traystone/releases) 下载最新版本
2. 在 Obsidian 库中创建 `.obsidian/plugins/traystone/` 目录
3. 将 `main.js` 和 `manifest.json` 复制到该目录
4. 重启 Obsidian，在设置中启用 Traystone 插件

## 使用说明

启用插件后，系统托盘/菜单栏会出现 Obsidian 图标：

- **左键点击图标**（Windows/Linux）：切换窗口显示/隐藏
- **左键点击图标**（macOS）：弹出菜单
- **右键点击图标**：打开菜单，可快速笔记、显示/隐藏窗口、重启或关闭

### 推荐设置

1. 启用「后台运行」— 关闭窗口时不退出，隐藏到托盘
2. 启用「创建托盘图标」— 通过托盘图标管理窗口
3. 可选：启用「开机自动启动」+「启动时隐藏」

## 说明

这是一个桌面端插件，在 macOS、Windows 和 Linux 上提供完整的托盘功能。移动端加载时不会执行任何功能，仅显示提示信息。

## 致谢

基于 [obsidian-tray](https://github.com/dragonwocky/obsidian-tray) by dragonwocky，在 MIT 协议下开发。
