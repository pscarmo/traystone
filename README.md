# Traystone

Run the app in the system tray with custom window management and global quick notes.

## Features

- **Launch on startup**: Automatically open the app when you log in to your computer.
- **Run in background**: Hide the app to the system tray instead of quitting when you click the close button.
- **Dock icon toggle** (macOS): Click the Dock icon to restore or hide the window.
- **No shutdown blocking**: The app exits normally on system shutdown.
- **Global hotkeys**: Toggle window focus and create quick notes with keyboard shortcuts.
- **Custom tray icon**: Replace the tray icon and tooltip text.
- **Quick note**: Create a new note instantly via the tray menu or hotkey.
- **Hide taskbar icon**: Hide the window icon from the taskbar or Dock.

## Installation

### From the Obsidian Community Plugins directory

1. Open Obsidian Settings → Community Plugins.
2. Search for "Traystone".
3. Click Install and Enable.

### Manual installation

1. Download the latest release from [GitHub Releases](https://github.com/tinswangtao-web/traystone/releases).
2. Create the directory `.obsidian/plugins/traystone/` inside your vault.
3. Copy `main.js` and `manifest.json` into that directory.
4. Restart Obsidian and enable the Traystone plugin in Settings → Community Plugins.

## Usage

After enabling the plugin, an icon will appear in the system tray or menu bar:

- **Left-click the icon** (Windows/Linux): Toggle the window visibility.
- **Left-click the icon** (macOS): Open the context menu.
- **Right-click the icon**: Open the menu to create a quick note, show/hide the window, relaunch, or close.

### Recommended settings

1. Enable "Run in background" — the app hides to the tray instead of quitting when you close the window.
2. Enable "Create tray icon" — manage the window via the tray icon.
3. Optionally enable "Launch on startup" + "Hide on launch".

## Notes

This is a desktop-only plugin. It provides full tray functionality on macOS, Windows, and Linux. On mobile devices, the plugin does not perform any actions and only displays an informational message.

## Acknowledgements

Based on [obsidian-tray](https://github.com/dragonwocky/obsidian-tray) by dragonwocky, developed under the MIT license.
