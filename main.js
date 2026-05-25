/**
 * Traystone
 */

"use strict";

const LOG_PREFIX = "traystone",
  LOG_LOADING = "加载中",
  LOG_CLEANUP = "清理中",
  LOG_SHOWING_WINDOWS = "显示窗口",
  LOG_HIDING_WINDOWS = "隐藏窗口",
  LOG_WINDOW_CLOSE = "拦截窗口关闭",
  LOG_TRAY_ICON = "创建托盘图标",
  LOG_REGISTER_HOTKEY = "注册快捷键",
  LOG_UNREGISTER_HOTKEY = "注销快捷键",
  ACTION_QUICK_NOTE = "快速笔记",
  ACTION_SHOW = "显示仓库",
  ACTION_HIDE = "隐藏仓库",
  ACTION_RELAUNCH = "重启 Obsidian",
  ACTION_CLOSE = "关闭仓库",
  DEFAULT_DATE_FORMAT = "YYYY-MM-DD",
  ACCELERATOR_FORMAT = `
    此快捷键全局注册，即使 Obsidian 没有键盘焦点也能触发。格式说明：
    <a href="https://www.electronjs.org/docs/latest/api/accelerator" target="_blank" rel="noopener">
    Electron accelerator</a>
  `,
  MOMENT_FORMAT = `
    格式说明：
    <a href="https://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener">
    Moment.js 格式字符串</a>
  `,
  OBSIDIAN_BASE64_ICON = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHZSURBVDhPlZKxTxRBFMa/XZcF7nIG7mjxjoRCwomJxgsFdhaASqzQxFDzB1AQKgstLGxIiBQGJBpiCCGx8h+wgYaGgAWNd0dyHofeEYVwt/PmOTMZV9aDIL/s5pvZvPfN9yaL/+HR3eXcypta0m4juFbP5GHuXc9IbunDFc9db/G81/ZzhDMN7g8td47mll4R5BfHwZN4LOaA+fHa259PbUmIYzWkt3e2NZNo3/V9v1vvU6kkstk+tLW3ItUVr/m+c3N8MlkwxYqmBFcbwUQQCNOcyVzDwEAWjuPi5DhAMV/tKOYPX5hCyz8Gz1zX5SmWjBvZfmTSaRBJkGAIoxJHv+pVW2yIGNxOJ8bUVNcFEWLxuG1ia6JercTbttwQTeDwPS0kCMXiXtgk/jQrFUw7ptYSMWApF40yo/ytjHq98fdk3ayVE+cn2CxMb6ruz9qAJKFUKoWza1VJSi/n0+ffgYHdWW2gHuxXymg0gjCB0sjpmiaDnkL3RzDyzLqBUKns2ztQqUR0fk2TwSrGSf1eczqF5vsPZRCQSSAFLk6gqctgQRkc6TWRQLV2YMYQki9OoNkqzFQ9r+WOGuW5CrJbOzyAlPKr6MSGLbkcDwbf35oY/jRkt6cAfgNwowruAMz9AgAAAABJRU5ErkJggg==`,
  log = (message) => console.log(`${LOG_PREFIX}: ${message}`);

let tray, plugin, onWindowCreationRef, onWindowFocusRef, onBeforeQuitRef, onActivateRef;
const obsidian = require("obsidian");

let app, Tray, Menu, nativeImage, BrowserWindow, getCurrentWindow, globalShortcut;
try {
  const electronRemote = require("electron").remote;
  app = electronRemote.app;
  Tray = electronRemote.Tray;
  Menu = electronRemote.Menu;
  nativeImage = electronRemote.nativeImage;
  BrowserWindow = electronRemote.BrowserWindow;
  getCurrentWindow = electronRemote.getCurrentWindow;
  globalShortcut = electronRemote.globalShortcut;
} catch {
  // Electron 不可用（移动端），桌面端功能不会被调用
}

const vaultWindows = new Set(),
  maximizedWindows = new Set(),
  getWindows = () => [...vaultWindows],
  observeWindows = () => {
    const onWindowCreation = (win) => {
      if (win.isDestroyed()) return;
      vaultWindows.add(win);
      win.setSkipTaskbar(plugin.settings.hideTaskbarIcon);
      win.on("close", () => {
        if (win !== getCurrentWindow()) vaultWindows.delete(win);
      });
      win.on("closed", () => {
        vaultWindows.delete(win);
        maximizedWindows.delete(win);
      });
      // 最小化后保持最大化窗口状态
      if (win.isMaximized()) maximizedWindows.add(win);
      win.on("maximize", () => maximizedWindows.add(win));
      win.on("unmaximize", () => maximizedWindows.delete(win));
    };
    onWindowCreationRef = onWindowCreation;
    onWindowCreation(getCurrentWindow());
    getCurrentWindow().webContents.on("did-create-window", onWindowCreation);
    if (process.platform === "darwin") {
      // macOS 上"隐藏任务栏图标"选项通过 app.dock.hide() 实现，
      // 因此整个应用会从程序坞隐藏，包括其他仓库的窗口。
      // 通过"关闭仓库"按钮关闭仓库时，清理流程会调用 app.dock.show()
      // 以恢复对其他未启用托盘插件的仓库的访问。
      // 因此，当切换到一个启用了此选项的仓库时，需要此监听器重新隐藏程序坞
      onWindowFocusRef = () => {
        if (plugin.settings.hideTaskbarIcon) hideTaskbarIcons();
      };
      getCurrentWindow().on("focus", onWindowFocusRef);
    }
  },
  showWindows = () => {
    log(LOG_SHOWING_WINDOWS);
    getWindows().forEach((win) => {
      if (win.isDestroyed()) return;
      if (maximizedWindows.has(win)) {
        win.maximize();
        win.focus();
      } else win.show();
    });
  },
  hideWindows = () => {
    log(LOG_HIDING_WINDOWS);
    getWindows().forEach((win) => {
      if (win.isDestroyed()) return;
      win.isFocused() && win.blur();
      plugin.settings.runInBackground ? win.hide() : win.minimize();
    });
  },
  toggleWindows = (checkForFocus = true) => {
    const openWindows = getWindows().some((win) => {
      if (win.isDestroyed()) return false;
      return (!checkForFocus || win.isFocused()) && win.isVisible();
    });
    if (openWindows) hideWindows();
    else showWindows();
  };

const onWindowClose = (event) => event.preventDefault(),
  onWindowUnload = (event) => {
    log(LOG_WINDOW_CLOSE);
    getCurrentWindow().hide();
    event.stopImmediatePropagation();
    // 根据 Electron 文档，手动设置 returnValue 比 return false 更可靠
    event.returnValue = false;
  },
  interceptWindowClose = () => {
    // 在渲染进程中拦截
    window.addEventListener("beforeunload", onWindowUnload, true);
    // 在主进程中拦截：从渲染进程注册时异步执行，本身无法阻止关闭，
    // 但可以抵消 obsidian.asar/main.js 中的 3 秒延迟强制关闭窗口逻辑
    getCurrentWindow().on("close", onWindowClose);
  },
  allowWindowClose = () => {
    getCurrentWindow().removeListener("close", onWindowClose);
    window.removeEventListener("beforeunload", onWindowUnload, true);
  };

const hideTaskbarIcons = () => {
    getWindows().forEach((win) => {
      if (!win.isDestroyed()) win.setSkipTaskbar(true);
    });
    if (process.platform === "darwin") app.dock.hide();
  },
  showTaskbarIcons = () => {
    getWindows().forEach((win) => {
      if (!win.isDestroyed()) win.setSkipTaskbar(false);
    });
    if (process.platform === "darwin") app.dock.show();
  },
  setLaunchOnStartup = () => {
    const { launchOnStartup, runInBackground, hideOnLaunch } = plugin.settings;
    app.setLoginItemSettings({
      openAtLogin: launchOnStartup,
      openAsHidden: runInBackground && hideOnLaunch,
    });
  };

  const registerDockActivate = () => {
    if (process.platform !== "darwin") return;
    onActivateRef = () => {
      const anyVisible = getWindows().some((win) => !win.isDestroyed() && win.isVisible());
      anyVisible ? hideWindows() : showWindows();
    };
    app.on("activate", onActivateRef);
  },
  unregisterDockActivate = () => {
    if (onActivateRef) {
      app.removeListener("activate", onActivateRef);
      onActivateRef = undefined;
    }
  };
const cleanup = () => {
    log(LOG_CLEANUP);
    try { unregisterHotkeys(); } catch {}
    try { unregisterDockActivate(); } catch {}
    try { showTaskbarIcons(); } catch {}
    try { allowWindowClose(); } catch {}
    try {
      if (onBeforeQuitRef) {
        app.removeListener("before-quit", onBeforeQuitRef);
        onBeforeQuitRef = undefined;
      }
    } catch {}
    try {
      if (onWindowCreationRef) {
        getCurrentWindow().webContents.removeListener("did-create-window", onWindowCreationRef);
        onWindowCreationRef = undefined;
      }
    } catch {}
    try {
      if (onWindowFocusRef) {
        getCurrentWindow().removeListener("focus", onWindowFocusRef);
        onWindowFocusRef = undefined;
      }
    } catch {}
    try { destroyTray(); } catch {}
  },
  relaunchApp = () => {
    app.relaunch();
    app.exit(0);
  },
  closeVault = () => {
    log(LOG_CLEANUP);
    cleanup();
    const currentVaultWindows = getWindows(),
      obsidianWindows = BrowserWindow.getAllWindows();
    if (obsidianWindows.length === vaultWindows.length) {
      // 如果仅剩的窗口都在当前仓库中，则直接退出应用——macOS 上成功退出所需
      app.quit();
    } else vaultWindows.forEach((win) => win.destroy());
  };

const addQuickNote = () => {
    const { quickNoteLocation, quickNoteDateFormat } = plugin.settings,
      pattern = quickNoteDateFormat || DEFAULT_DATE_FORMAT,
      date = obsidian.moment().format(pattern),
      name = obsidian
        .normalizePath(`${quickNoteLocation ?? ""}/${date}`)
        .replace(/\*|"|\\|<|>|:|\||\?|\//g, "-"),
      // 手动创建并打开文件，而非依赖 createAndOpenMarkdownFile，
      // 以强制相对于根目录而非当前活动文件创建文件
      //（防止用户将新建笔记的默认位置设为"当前文件所在文件夹"）
      leaf = plugin.app.workspace.getLeaf(),
      root = plugin.app.fileManager.getNewFileParent(""),
      openMode = { active: true, state: { mode: "source" } };
    plugin.app.fileManager
      .createNewMarkdownFile(root, name)
      .then((file) => leaf.openFile(file, openMode));
    showWindows();
  },
  replaceVaultName = (str) => {
    return str.replace(/{{vault}}/g, plugin.app.vault.getName());
  },
  destroyTray = () => {
    tray?.destroy();
    tray = undefined;
  },
  createTrayIcon = () => {
    destroyTray();
    if (!plugin.settings.createTrayIcon) return;
    log(LOG_TRAY_ICON);
    const obsidianIcon = nativeImage.createFromDataURL(
        plugin.settings.trayIconImage ?? OBSIDIAN_BASE64_ICON
      ),
      contextMenu = Menu.buildFromTemplate([
        {
          type: "normal",
          label: ACTION_QUICK_NOTE,
          accelerator: plugin.settings.quickNoteHotkey,
          click: addQuickNote,
        },
        {
          type: "normal",
          label: ACTION_SHOW,
          accelerator: plugin.settings.toggleWindowFocusHotkey,
          click: showWindows,
        },
        {
          type: "normal",
          label: ACTION_HIDE,
          accelerator: plugin.settings.toggleWindowFocusHotkey,
          click: hideWindows,
        },
        { type: "separator" },
        { label: ACTION_RELAUNCH, click: relaunchApp },
        { label: ACTION_CLOSE, click: closeVault },
      ]);
    tray = new Tray(obsidianIcon);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(replaceVaultName(plugin.settings.trayIconTooltip));
    tray.on("click", () => {
      if (process.platform === "darwin") {
        // macOS 不会为菜单项注册独立的左/右键点击动作，图标应打开菜单而不触发切换
        tray.popUpContextMenu();
      } else toggleWindows(false);
    });
  };

const registerHotkeys = () => {
    log(LOG_REGISTER_HOTKEY);
    try {
      const { toggleWindowFocusHotkey, quickNoteHotkey } = plugin.settings;
      if (toggleWindowFocusHotkey) {
        globalShortcut.register(toggleWindowFocusHotkey, toggleWindows);
      }
      if (quickNoteHotkey) {
        globalShortcut.register(quickNoteHotkey, addQuickNote);
      }
    } catch {}
  },
  unregisterHotkeys = () => {
    log(LOG_UNREGISTER_HOTKEY);
    try {
      globalShortcut.unregister(plugin.settings.toggleWindowFocusHotkey);
      globalShortcut.unregister(plugin.settings.quickNoteHotkey);
    } catch {}
  };

const OPTIONS = [
  "窗口管理",
  {
    key: "launchOnStartup",
    desc: "每次登录电脑时自动打开 Obsidian。",
    type: "toggle",
    default: false,
    onChange: setLaunchOnStartup,
  },
  {
    key: "hideOnLaunch",
    desc: `
      启动 Obsidian 时自动最小化。如果启用了"后台运行"选项，
      窗口将隐藏到系统托盘/菜单栏，而不是最小化到任务栏/程序坞。
    `,
    type: "toggle",
    default: false,
  },
  {
    key: "runInBackground",
    desc: `
      点击窗口关闭按钮或使用切换聚焦快捷键时，将应用隐藏到后台继续运行，而不是退出。
    `,
    type: "toggle",
    default: false,
    onChange() {
      setLaunchOnStartup();
      if (plugin.settings.runInBackground) {
        interceptWindowClose();
        onBeforeQuitRef = () => allowWindowClose();
        app.on("before-quit", onBeforeQuitRef);
        registerDockActivate();
      } else {
        unregisterDockActivate();
        if (onBeforeQuitRef) {
          app.removeListener("before-quit", onBeforeQuitRef);
          onBeforeQuitRef = undefined;
        }
        allowWindowClose();
        showWindows();
      }
    },
  },
  {
    key: "hideTaskbarIcon",
    desc: `
      从程序坞/任务栏隐藏窗口图标。建议先启用托盘图标再使用此选项。在 Linux 系统上可能无效。
    `,
    type: "toggle",
    default: false,
    onChange() {
      if (plugin.settings.hideTaskbarIcon) hideTaskbarIcons();
      else showTaskbarIcons();
    },
  },
  {
    key: "createTrayIcon",
    desc: `
      在系统托盘/菜单栏添加图标，点击可将隐藏的 Obsidian 窗口恢复聚焦，
      右键菜单可强制完全退出或重启应用。
    `,
    type: "toggle",
    default: true,
    onChange: createTrayIcon,
  },
  {
    key: "trayIconImage",
    desc: `
      设置托盘/菜单栏图标使用的图片。推荐尺寸：16x16
      <br>预览：<img data-preview style="height: 16px; vertical-align: bottom;">
    `,
    type: "image",
    default: OBSIDIAN_BASE64_ICON,
    onChange: createTrayIcon,
  },
  {
    key: "trayIconTooltip",
    desc: `
      设置托盘/菜单栏图标的提示文字。<code>{{vault}}</code> 占位符将被替换为仓库名称。
      <br>预览：<b class="u-pop" data-preview></b>
    `,
    type: "text",
    default: "{{vault}} | Obsidian",
    postprocessor: replaceVaultName,
    onChange: createTrayIcon,
  },
  {
    key: "toggleWindowFocusHotkey",
    desc: ACCELERATOR_FORMAT,
    type: "hotkey",
    default: "CmdOrCtrl+Shift+Tab",
    onBeforeChange: unregisterHotkeys,
    onChange: registerHotkeys,
  },
  "快速笔记",
  {
    key: "quickNoteLocation",
    desc: "新建快速笔记将放置在此文件夹中。",
    type: "text",
    placeholder: "示例：notes/quick",
  },
  {
    key: "quickNoteDateFormat",
    desc: `
      新建快速笔记将使用此模式的文件名。${MOMENT_FORMAT}
      <br>预览：<b class="u-pop" data-preview></b>
    `,
    type: "moment",
    default: DEFAULT_DATE_FORMAT,
  },
  {
    key: "quickNoteHotkey",
    desc: ACCELERATOR_FORMAT,
    type: "hotkey",
    default: "CmdOrCtrl+Shift+Q",
    onBeforeChange: unregisterHotkeys,
    onChange: registerHotkeys,
  },
];

const keyToLabel = (key) => {
    const labels = {
      launchOnStartup: "开机自动启动",
      hideOnLaunch: "启动时隐藏",
      runInBackground: "后台运行",
      hideTaskbarIcon: "隐藏任务栏图标",
      createTrayIcon: "创建托盘图标",
      trayIconImage: "托盘图标图片",
      trayIconTooltip: "托盘图标提示",
      toggleWindowFocusHotkey: "切换窗口聚焦快捷键",
      quickNoteLocation: "快速笔记位置",
      quickNoteDateFormat: "快速笔记日期格式",
      quickNoteHotkey: "快速笔记快捷键",
    };
    return labels[key] ?? key;
  },
  htmlToFragment = (html) =>
    document
      .createRange()
      .createContextualFragment((html ?? "").replace(/\s+/g, " "));

class SettingsTab extends obsidian.PluginSettingTab {
  display() {
    this.containerEl.empty();
    for (const opt of OPTIONS) {
      const setting = new obsidian.Setting(this.containerEl);
      if (typeof opt === "string") {
        setting.setName(opt);
        setting.setHeading();
      } else {
        if (opt.default) opt.placeholder ??= `示例：${opt.default}`;
        setting.setName(keyToLabel(opt.key));
        setting.setDesc(htmlToFragment(opt.desc));
        const onChange = async (value) => {
          await opt.onBeforeChange?.();
          plugin.settings[opt.key] = value;
          await plugin.saveSettings();
          await opt.onChange?.();
        };

        const value = plugin.settings[opt.key] ?? opt.default ?? "";
        if (opt.type === "toggle") {
          setting.addToggle((toggle) => {
            toggle.setValue(value).onChange(onChange);
          });
        } else if (opt.type === "image") {
          const previewImg = setting.descEl.querySelector("img[data-preview]");
          if (previewImg) previewImg.src = value;
          const fileUpload = setting.descEl.createEl("input");
          fileUpload.style.visibility = "hidden";
          fileUpload.type = "file";
          fileUpload.onchange = (event) => {
            const file = event.target.files[0],
              reader = new FileReader();
            reader.onloadend = () => {
              onChange(reader.result);
              if (previewImg) previewImg.src = reader.result;
            };
            reader.readAsDataURL(file);
          };
          setting.addButton((button) => {
            button.setIcon("image").onClick(() => fileUpload.click());
          });
        } else if (opt.type === "moment") {
          setting.addMomentFormat((moment) => {
            const previewEl = setting.descEl.querySelector("[data-preview]");
            if (previewEl) moment.setSampleEl(previewEl);
            moment
              .setPlaceholder(opt.placeholder)
              .setDefaultFormat(opt.default ?? "")
              .setValue(value)
              .onChange(onChange);
          });
        } else {
          const previewEl = setting.descEl.querySelector("[data-preview]"),
            updatePreview = (value) => {
              if (!previewEl) return;
              previewEl.innerText = opt?.postprocessor(value) ?? value;
            };
          updatePreview(value);
          setting.addText((text) => {
            text
              .setPlaceholder(opt.placeholder)
              .setValue(value)
              .onChange((value) => [onChange(value), updatePreview(value)]);
          });
        }
      }
    }
  }
}

class MobileInfoTab extends obsidian.PluginSettingTab {
  display() {
    this.containerEl.empty();
    new obsidian.Setting(this.containerEl).setName("这是一个桌面端插件").setDesc("请在桌面端使用此插件的全部功能。");
  }
}

class TrayPlugin extends obsidian.Plugin {
  async onload() {
    log(LOG_LOADING);
    if (obsidian.Platform && obsidian.Platform.isMobile) {
      log("检测到移动端，跳过托盘初始化");
      this.addSettingTab(new MobileInfoTab(this.app, this));
      return;
    }
    vaultWindows.clear();
    maximizedWindows.clear();
    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this.app, this));
    const { settings } = this;

    plugin = this;
    createTrayIcon();
    registerHotkeys();
    setLaunchOnStartup();
    observeWindows();
    if (settings.runInBackground) {
      interceptWindowClose();
      onBeforeQuitRef = () => allowWindowClose();
      app.on("before-quit", onBeforeQuitRef);
      registerDockActivate();
    }
    if (settings.hideTaskbarIcon) hideTaskbarIcons();
    if (settings.hideOnLaunch) {
      this.registerEvent(this.app.workspace.onLayoutReady(hideWindows));
    }

    // 添加为命令：可通过命令面板调用，也可在应用内设置非全局快捷键
    this.addCommand({
      id: "relaunch-app",
      name: ACTION_RELAUNCH,
      callback: relaunchApp,
    });
    this.addCommand({
      id: "close-vault",
      name: ACTION_CLOSE,
      callback: closeVault,
    });
  }
  onunload() {
    cleanup();
  }

  async loadSettings() {
    const DEFAULT_SETTINGS = OPTIONS.filter((opt) => typeof opt === "object").map((opt) => ({ [opt.key]: opt.default }));
    this.settings = Object.assign(...DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
module.exports = TrayPlugin;

/* nosourcemap */