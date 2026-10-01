#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
周更推送脚本（weekly-push）
============================================================================
作用：把「本周写的代码」一次性提交到本地仓库，再依次推送到多个远程仓库。

为什么是 Python 而不是 Node：
    本机（WorkBuddy 沙箱环境）下 Node 的 child_process 创建任何子进程都会
    抛 `spawnSync ... EBUSY`（连 spawn 自己都失败），而 Python 的 subprocess
    正常可用。脚本必须调 git，所以用 Python 实现。

设计要点：
    1. 只做一次本地提交，然后把这一个提交推给所有远程 —— 多平台内容完全一致；
    2. 每个远程可有各自的「目标分支」（见 REMOTES 的 branch），推的是当前 HEAD，
       落到远程时改名为该分支：git push <remote> HEAD:refs/heads/<branch>；
    3. 所有 git 子命令都带 GIT_TERMINAL_PROMPT=0 / GCM_INTERACTIVE=never，
       避免无人值守时卡在凭据弹窗上（本机不设这两个变量，实测必卡死到超时）；
    4. 提交前做一次密钥扫描，命中就整体中止，绝不把密钥推上远程；
    5. 某个远程失败不影响其他远程，逐个尝试、逐个汇报。

用法：
    python scripts/weekly-push.py                 # 正常执行：提交 + 推送
    python scripts/weekly-push.py --dry-run       # 预演：只看会发生什么，不写任何东西
    python scripts/weekly-push.py --no-push       # 只提交到本地，不推送
    python scripts/weekly-push.py --message "..."  # 自定义提交信息
    python scripts/weekly-push.py --json          # 输出机器可读结果
    python scripts/weekly-push.py --allow-secrets # 跳过密钥拦截（确认无误时再用）

退出码（与 github-auto-upload 技能保持一致）：
    0 成功 · 2 环境问题 · 3 命中密钥被拦 · 4 推送失败 · 5 提交失败
"""

import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

# ============================================================================
# 一、配置区（要改就改这里）
# ============================================================================

# 远程仓库清单，按列表顺序「一一推送」。
#   remote：本地 git 远程名（git remote 里不存在则跳过并记录）
#   branch：该平台对应的分支名（推的是当前 HEAD，落到远程时叫这个名字）
#   via   ：推送通道，目前只有 "git"（直接 git push）
#           Gitee 走 HTTPS，凭据存在本机凭据管理器里；
#           GitHub 走 SSH（origin = git@github.com:dukaixin12138/-.git），
#           用 ~/.ssh/id_ed25519（无口令）认证，不需要令牌，也不会过期。
#   label：日志里显示的名字
REMOTES = [
    {"remote": "gitee",  "branch": "Blog", "via": "git", "label": "Gitee"},
    {"remote": "origin", "branch": "Blog", "via": "git", "label": "GitHub"},
]

# 单个远程推送的超时（秒）——无人值守时防止网络问题无限挂起
PUSH_TIMEOUT_SEC = 180

# 提交信息模板，可用 {date} {week} {files}
COMMIT_TEMPLATE = "chore(weekly): 周更 {date}（第 {week} 周，{files} 个文件）"

# ============================================================================
# 二、密钥扫描规则（提交前的安全网）
# ============================================================================

SECRET_RULES = [
    ("私钥文件块",        re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("AWS Access Key",    re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GitHub 令牌",       re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b")),
    ("GitHub 细粒度令牌", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{60,}\b")),
    ("Slack 令牌",        re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("Google API Key",    re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("OpenAI Key",        re.compile(r"\bsk-[A-Za-z0-9]{32,}\b")),
    ("Stripe Key",        re.compile(r"\bsk_live_[A-Za-z0-9]{20,}\b")),
    ("JWT",               re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    ("npm 发布令牌",      re.compile(r"_authToken\s*=\s*\S+")),
]

# 通用赋值规则：password = "xxx" 这类；还要过一遍 GENERIC_OK 白名单才真正拦截
GENERIC_RULE = re.compile(r"""(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["'][^"']{8,}["']""", re.I)
GENERIC_OK = re.compile(
    r"(process\.env|import\.meta\.env|useRuntimeConfig|os\.environ|os\.getenv|getenv|"
    r"example|placeholder|your[_-]|xxx+|changeme|test|demo|<[^>]+>)", re.I)

# 文件名级规则：这些文件天生装凭据，直接拦
SENSITIVE_FILES = [
    re.compile(r"^\.env(\..+)?$", re.I),          # .env / .env.local（.env.example 单独放行）
    re.compile(r"^id_(rsa|dsa|ecdsa|ed25519)$", re.I),
    re.compile(r"\.(pem|p12|pfx|keystore|jks|ppk)$", re.I),
    re.compile(r"^service-account.*\.json$", re.I),
    re.compile(r"^\.creds\.json$", re.I),
]

SKIP_PATH = re.compile(r"(^|/)(node_modules|\.git|\.nuxt|\.output|dist)/")
TEXT_EXT = {
    ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".vue", ".json", ".jsonc",
    ".yml", ".yaml", ".md", ".txt", ".sql", ".prisma", ".toml", ".ini", ".cfg",
    ".conf", ".sh", ".bash", ".ps1", ".bat", ".cmd", ".html", ".css", ".scss",
    ".xml", ".example", ".npmrc",
}
SCAN_MAX_BYTES = 2_000_000

# ============================================================================
# 三、基础设施
# ============================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
LOG_FILE = ROOT / ".git" / "weekly-push.log"

# Windows 控制台默认可能是 GBK，中文日志会乱码/抛异常，这里强制 UTF-8
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

NOTES = []
AS_JSON = False


def say(msg=""):
    """记录并（非 JSON 模式下）打印一行过程日志"""
    NOTES.append(msg)
    if not AS_JSON:
        print(msg)


def log(line):
    """写日志到 .git/weekly-push.log（放在 .git 里，永远不会被提交）"""
    try:
        if not (ROOT / ".git").is_dir():
            return
        with open(LOG_FILE, "a", encoding="utf-8") as fh:
            fh.write(f"[{datetime.now().isoformat(timespec='seconds')}] {line}\n")
    except Exception:
        pass  # 日志失败不影响主流程


def run(cmd, args, timeout=60, allow_fail=False, cwd=None):
    """执行一条命令，返回 (退出码, 合并输出)。

    关键：注入 GIT_TERMINAL_PROMPT=0 / GCM_INTERACTIVE=never，
    无人值守环境下禁止一切凭据交互，否则会卡在弹窗上直到超时。
    """
    env = dict(os.environ)
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GCM_INTERACTIVE"] = "never"
    # SSH 推送同样要禁交互：BatchMode 保证遇到任何需要输入的情况（未注册的密钥、
    # 未知主机、口令）立刻失败，而不是挂着等输入。accept-new 只自动接受首次遇到的主机指纹。
    env["GIT_SSH_COMMAND"] = "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
    env["LC_ALL"] = "C.UTF-8"
    kwargs = {}
    if os.name == "nt":
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        proc = subprocess.run(
            [cmd] + list(args),
            cwd=str(cwd or ROOT),
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            **kwargs,
        )
        out = ((proc.stdout or "") + (proc.stderr or "")).strip()
        code = proc.returncode
    except subprocess.TimeoutExpired:
        return 124, f"超时（>{timeout}s）"
    except FileNotFoundError as exc:
        return 127, f"找不到可执行文件：{exc}"

    if code != 0 and not allow_fail:
        raise RuntimeError(f"{cmd} {' '.join(map(str, args))} 退出码 {code}\n{out}")
    return code, out


def git_out(args):
    """取 git 输出，失败返回空串"""
    try:
        return run("git", args, allow_fail=True)[1].strip()
    except Exception:
        return ""


def iso_week(d):
    """ISO 周数"""
    return d.isocalendar()[1]


def mask(s):
    """打码：只留头 4 尾 4，避免日志里二次泄漏"""
    if len(s) <= 12:
        return s[:2] + "***"
    return f"{s[:4]}***{s[-4:]} ({len(s)} 字符)"


# ============================================================================
# 四、密钥扫描
# ============================================================================

def load_allowlist():
    p = ROOT / ".gau-allowlist"
    if not p.exists():
        return []
    out = []
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.append(line)
    return out


def scan_secrets(paths):
    """扫描给定文件（仓库相对路径），返回命中列表"""
    allow = load_allowlist()
    findings = []
    for rel in paths:
        posix = rel.replace("\\", "/")
        if SKIP_PATH.search(posix):
            continue
        if any(fnmatch.fnmatch(posix, pat) or fnmatch.fnmatch(posix.split("/")[-1], pat)
               for pat in allow):
            continue

        fname = posix.split("/")[-1]
        # 文件名级命中（.env.example 是模板，放行）
        if not re.search(r"\.env\.example$", fname, re.I) and \
                any(r.search(fname) for r in SENSITIVE_FILES):
            findings.append({"path": posix, "line": 0, "rule": "敏感文件名",
                             "preview": f"文件名 {fname} 通常存放凭据"})
            continue

        ext = os.path.splitext(fname)[1].lower()
        if ext and ext not in TEXT_EXT:
            continue  # 二进制等直接跳过
        fpath = ROOT / posix
        try:
            if fpath.stat().st_size > SCAN_MAX_BYTES:
                continue
            text = fpath.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for lineno, raw in enumerate(text.splitlines(), start=1):
            if "gau:allow" in raw or "gau-secret-allow" in raw:
                continue
            line = raw[:4000]
            for rule, rx in SECRET_RULES:
                m = rx.search(line)
                if m:
                    findings.append({"path": posix, "line": lineno, "rule": rule,
                                     "preview": mask(m.group(0))})
            g = GENERIC_RULE.search(line)
            if g and not GENERIC_OK.search(line):
                findings.append({"path": posix, "line": lineno, "rule": "疑似硬编码口令",
                                 "preview": mask(g.group(0))})
    return findings


# ============================================================================
# 五、推送
# ============================================================================

def push_via_git(remote, branch):
    """走普通 git push，把当前 HEAD 推到该远程的指定分支"""
    code, out = run("git", ["push", remote, f"HEAD:refs/heads/{branch}"],
                    timeout=PUSH_TIMEOUT_SEC, allow_fail=True)
    tail = " | ".join([ln for ln in out.splitlines() if ln.strip()][-2:])
    if code == 0:
        return True, (tail or "Everything up-to-date")
    if code == 124:
        return False, f"超时（>{PUSH_TIMEOUT_SEC}s），可能是凭据弹窗或网络不通"
    return False, f"git 退出码 {code}：{tail}"


# ============================================================================
# 六、主流程
# ============================================================================

def main():
    ap = argparse.ArgumentParser(description="周更：提交本地 + 依次推送多个远程")
    ap.add_argument("--dry-run", action="store_true", help="预演，不写任何东西")
    ap.add_argument("--no-push", action="store_true", help="只提交到本地，不推送")
    ap.add_argument("--message", default="", help="自定义提交信息")
    ap.add_argument("--json", action="store_true", help="输出机器可读结果")
    ap.add_argument("--allow-secrets", action="store_true", help="跳过密钥拦截")
    args = ap.parse_args()

    global AS_JSON
    AS_JSON = args.json

    result = {"ok": False, "dry_run": args.dry_run, "branch": "", "commit": None,
              "push": [], "secrets": [], "notes": NOTES}

    # ---- 0. 环境检查 --------------------------------------------------
    if not (ROOT / ".git").exists():
        say(f"[err] {ROOT} 不是 git 仓库")
        return finish(result, 2)

    branch = git_out(["rev-parse", "--abbrev-ref", "HEAD"])
    if not branch or branch == "HEAD":
        say("[err] 当前处于游离 HEAD 状态，请先切到某个分支")
        return finish(result, 2)
    result["branch"] = branch

    say(f"仓库   : {ROOT}")
    say(f"分支   : {branch}")
    mode = "预演（不写任何东西）" if args.dry_run else ("只提交到本地" if args.no_push else "提交 + 推送")
    say(f"模式   : {mode}")

    # ---- 1. 暂存改动 --------------------------------------------------
    if args.dry_run:
        # 预演模式绝不碰索引：只读 git status 推算「如果真跑会提交哪些文件」
        staged = []
        for ln in git_out(["status", "--porcelain"]).splitlines():
            if not ln.strip():
                continue
            path = ln[3:].strip()
            if " -> " in path:        # 重命名：取新路径
                path = path.split(" -> ", 1)[1]
            path = path.strip('"')
            if path:
                staged.append(path)
    else:
        run("git", ["add", "-A"])
        staged = [ln for ln in git_out(["diff", "--cached", "--name-only"]).splitlines() if ln.strip()]
    say(f"待提交 : {len(staged)} 个文件")

    # ---- 2. 密钥扫描 --------------------------------------------------
    findings = scan_secrets(staged)
    result["secrets"] = findings
    if findings and not args.allow_secrets:
        say("")
        say(f"[拦截] 发现 {len(findings)} 处疑似密钥，已中止：未提交、未推送。")
        for f in findings[:20]:
            say(f"   {f['path']}:{f['line']}  {f['rule']}  {f['preview']}")
        say("   确认是误报 → 把路径写进 .gau-allowlist，或在对应行末尾加 gau:allow 标记")
        say("   确认要放飞 → 加 --allow-secrets 重新执行")
        log(f"ABORTED by secret scan: {len(findings)} finding(s)")
        return finish(result, 3)
    if findings:
        say(f"[warn] 发现 {len(findings)} 处疑似密钥，但已用 --allow-secrets 放行")

    # ---- 3. 本地提交 --------------------------------------------------
    today = date.today()
    msg = args.message or COMMIT_TEMPLATE.format(
        date=today.isoformat(), week=iso_week(today), files=len(staged))

    if not staged:
        say("提交   : 工作区干净，本周无新增改动，跳过提交")
        # 工作区干净时提示是否还有历史提交没推上去（上次失败的残留）
        for r in REMOTES:
            ref = f"{r['remote']}/{r['branch']}"
            if not git_out(["rev-parse", "--verify", "--quiet", ref]):
                continue
            ahead = git_out(["rev-list", "--count", f"{ref}..HEAD"])
            if ahead and ahead != "0":
                say(f"待推送 : 相对 {ref} 领先 {ahead} 个提交")
    elif args.dry_run:
        say(f"提交   : [预演] 将提交 {len(staged)} 个文件 → {msg}")
    else:
        code, out = run("git", ["commit", "-m", msg], timeout=120, allow_fail=True)
        if code != 0:
            say(f"[err] 提交失败：{' | '.join(out.splitlines()[:3])}")
            log(f"COMMIT FAILED: {out[:300]}")
            return finish(result, 5)
        sha = git_out(["rev-parse", "--short", "HEAD"])
        result["commit"] = {"sha": sha, "message": msg, "files": len(staged)}
        say(f"提交   : {sha}  {msg}")
        log(f"COMMITTED {sha} ({len(staged)} files): {msg}")

    # ---- 4. 逐个推送远程 ----------------------------------------------
    if args.no_push or args.dry_run:
        say("")
        remotes = git_out(["remote"]).splitlines()
        for r in REMOTES:
            if r["remote"] in remotes:
                say(f"[{r['label']}] 将推送 HEAD → {r['remote']}/{r['branch']}（{r['via']}）")
            else:
                say(f"[{r['label']}] 远程 {r['remote']} 不存在，跳过")
        say("")
        say("预演结束，未做任何修改。" if args.dry_run else "已跳过推送（--no-push）。")
        return finish(result, 0)

    say("")
    remotes = git_out(["remote"]).splitlines()
    failed = 0
    for r in REMOTES:
        if r["remote"] not in remotes:
            say(f"[{r['label']}] 跳过：本地没有 {r['remote']} 这个远程")
            result["push"].append({"label": r["label"], "remote": r["remote"],
                                   "branch": r["branch"], "ok": False, "skipped": True,
                                   "detail": "远程不存在"})
            continue
        if r["via"] == "auto-upload":          # 预留通道，当前未使用
            ok, detail = False, "auto-upload 通道未启用"
        else:
            ok, detail = push_via_git(r["remote"], r["branch"])
        result["push"].append({"label": r["label"], "remote": r["remote"],
                               "branch": r["branch"], "ok": ok, "detail": detail})
        say(f"[{r['label']}] {'成功' if ok else '失败'} → {r['remote']}/{r['branch']}  {detail}")
        log(f"PUSH {r['label']} {'OK' if ok else 'FAIL'} {r['remote']}/{r['branch']}: {detail}")
        if not ok:
            failed += 1

    say("")
    if failed == 0:
        say("全部远程推送完成。")
    else:
        say(f"{failed} 个远程推送失败，详见上面日志；本地提交已完成，修好后重跑本脚本即可（幂等）。")
    return finish(result, 0 if failed == 0 else 4)


def finish(result, code):
    result["exit_code"] = code
    result["ok"] = code == 0
    if AS_JSON:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return code


if __name__ == "__main__":
    sys.exit(main())
