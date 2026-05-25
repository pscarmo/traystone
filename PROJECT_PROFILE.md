# 项目档案

## 基本信息

- **项目一句话**：Obsidian 桌面端插件，将 Obsidian 运行到系统托盘，支持自定义窗口管理和全局快速笔记
- **项目类型**：`Plugin-for-Obsidian`（桌面端插件）
- **主分支 / 发布方式**：无 git 仓库；手动部署到 Obsidian 插件目录
- **主工作区路径约定**：项目根目录即工作区
- **仓库布局**：单仓

## 运行时与语言

- **语言与最低版本**：JavaScript（Node.js / Electron，随 Obsidian 内置）
- **包管理 / 锁文件**：无（单文件 `main.js`，无 `package.json`）
- **AI 引入新依赖**：须用户每次确认

## 源码与产物

- **主要源码路径**：`main.js`
- **生成物 / 禁止手改**：无
- **构建命令**：无（直接编辑 `main.js`）
- **类型检查 / 静态检查**：无
- **测试命令**：无自动化测试；手动在 Obsidian 中验证
- **CI**：无

## 产品文件范围

- **产品文件（Architect 不可直接改）**：`main.js`、`manifest.json`、`main_test.js`
- **Architect 额外可写**：无（仅限默认 `reviews/`、`tasks/`、`docs/design/`）

## 部署或同步

**无单独部署步骤；文件修改即生效**（Obsidian 热加载或重启插件后生效）。

## 严审触发

默认：存储层、数据迁移、鉴权、支付、并发安全、移动端关键路径、或单次改动跨 >3 个产品文件时，须 Architect 严格审查后再由用户授权 commit。

本项目追加：（无）

## 按项目类型的默认关注项

### Plugin-for-Obsidian

- 目标平台：macOS / Windows / Linux（桌面端）
- 宿主最低版本：Obsidian 1.0.0+
- Electron API 访问方式：`require("electron").remote`
- 插件入口：`module.exports = TrayPlugin`
- 设置持久化：Obsidian Plugin API（`this.loadData()` / `this.saveData()`）

## 设计文档位置

- **设计/方案笔记目录**：无

## 删除备份

- **备份根目录**：`.ai-deletion-backups/`
- **保留天数**：30
- **清理责任方**：human

## 其他约束

- 无 git 仓库，无法通过 `git checkout` 恢复文件；删除前务必备份到 `.ai-deletion-backups/`
- `main.js.backup` 为用户保留的旧版备份，勿随意修改或删除
