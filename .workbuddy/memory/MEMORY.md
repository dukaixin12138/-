# 博客项目长期记忆

## 仓库与分支
- 本地路径：`F:/博客`（Nuxt 项目：app/ + server/ + prisma/ + tests/）
- 远程 `gitee` → https://gitee.com/the-forgotten-you/blog.git（公开仓库「遗忘的你/博客」，默认分支 `Blog`）
- 远程 `origin` → `git@github.com:dukaixin12138/-.git`（GitHub 仓库 dukaixin12138/-，描述「个人博客」，公开，默认分支 main，走 SSH 密钥认证）
- 工作分支约定：一个主题一个分支，命名首字母大写英文单词

## 约定
- `.gitignore` 已排除：node_modules、.env、.nuxt/.output、prisma/*.db、public/uploads、public/downloads、.codebuddy/、.playwright-cli/
- 敏感文件：`.env` 不入库，只提交 `.env.example`
- 注意 Windows 大小写不敏感文件系统会让远程名与分支名同名（如远程 blog + 分支 Blog）触发 `refname is ambiguous`，远程名宜用 origin
- 本机 git 凭据助手为 `helper-selector`，在非交互环境执行 `git push` 会卡在凭据弹窗直到超时；自动化推送须加 `GIT_TERMINAL_PROMPT=0`

## 周更推送（weekly-push）
- 脚本：`scripts/weekly-push.py`（Python，stdlib，无依赖）
  - 一次性本地提交 → 依次推送到各远程（`git push <remote> HEAD:refs/heads/<branch>`）
  - 配置在脚本顶部 `REMOTES`：`{remote, branch, via, label}`；`via` 目前只有 `git`（两个远程都走普通 git push）
  - 当前映射：gitee → Blog（HTTPS，凭据在凭据管理器）、origin → Blog（SSH，`~/.ssh/id_ed25519` 无口令密钥）
  - 脚本会给子进程注入 `GIT_TERMINAL_PROMPT=0`、`GCM_INTERACTIVE=never`、`GIT_SSH_COMMAND="ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new"`，确保无人值守不挂起
  - 退出码：0 成功 / 2 环境 / 3 命中密钥 / 4 推送失败 / 5 提交失败
  - `--dry-run` 完全不写任何东西（连索引都不动）；`--no-push` 只提交本地
  - 密钥扫描支持 `.gau-allowlist`（路径 glob）与行内 `gau:allow` 标记，用 `--allow-secrets` 整体放行
  - 运行日志写在 `.git/weekly-push.log`（不会入库）
- 定时：WorkBuddy 定时任务「博客项目周更推送」id `455fe5b2-194a-4fb8-9f0f-2b125ba41779`，每周六 12:00（rrule `FREQ=WEEKLY;BYDAY=SA;BYHOUR=12;BYMINUTE=0`）
- 环境约束：**Node 在本机无法创建子进程（EBUSY），调 git 的脚本必须用 Python**
