#!/usr/bin/env python3
"""Toff Studio guard: a Claude Code PreToolUse hook.

Claude Code runs this before every Bash, Write, Edit, MultiEdit and NotebookEdit call
(see .claude/settings.json). Exit code 0 lets the call run; exit code 2 blocks it, and
the message on stderr is shown to Claude. It enforces the repo's standing rules:

  1. An Anthropic API key never appears in a file, a command or a log.
  2. Files are added to git by name: no "git add .", "-A", "--all", "*", ":/" or "-u",
     and no "git commit -a".
  3. No force pushes and no destructive git (reset --hard, clean -f, checkout/restore of
     everything, stash drop/clear, branch -D, deleting remote branches).
  4. Nothing that was in assets/ before this round is deleted or moved (CLAUDE.md).
     "Before this round" means on the latest backup-before-round-NN branch (or, if
     there is none, tracked in HEAD). Files created since then may be removed.
  5. Pushing main (which publishes the live site) only after the owner has said
     "ship it": the file .claude/ship-approved must exist.
  6. Files are only written inside this repo, ~/Documents/toff-studio-tools, a
     ~/Downloads/toff-... folder, a temporary folder or ~/.claude (so never in the
     Bluebird or Everest folders).

Python 3.9 compatible (the Mac's built-in python3). It never blocks on a payload it
can't read: Claude Code must keep working if anything here goes wrong.
"""
import json
import os
import re
import shlex
import subprocess
import sys

KEY_RE = re.compile(r"sk-ant-[A-Za-z0-9_\-]{8,}")
GIT_GLOBAL_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}
ASSET_MSG = ("files that were in assets/ before this round are never deleted or moved (CLAUDE.md). Stop loading a "
             "retired file instead and list it as retired in README.md. (Files you created this round may be removed.)")


def block(msg):
    sys.stderr.write("Blocked by .claude/hooks/guard.py: " + msg + "\n")
    sys.exit(2)


def segments(cmd):
    """Split a shell command on unquoted ; & | and newlines (quote-aware)."""
    out, cur, quote, i = [], [], None, 0
    while i < len(cmd):
        ch = cmd[i]
        if quote:
            cur.append(ch)
            if ch == "\\" and quote == '"' and i + 1 < len(cmd):
                cur.append(cmd[i + 1])
                i += 1
            elif ch == quote:
                quote = None
        elif ch in ("'", '"'):
            quote = ch
            cur.append(ch)
        elif ch == "\\" and i + 1 < len(cmd):
            cur.append(ch)
            cur.append(cmd[i + 1])
            i += 1
        elif ch in ";&|\n":
            out.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
        i += 1
    out.append("".join(cur))
    return [s.strip() for s in out if s.strip()]


def words(segment):
    try:
        return shlex.split(segment, posix=True)
    except ValueError:
        return segment.split()


def strip_prefixes(w):
    """Drop leading env assignments and wrappers such as sudo, env, command, time, nohup."""
    i = 0
    while i < len(w):
        t = w[i]
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", t) or t in ("sudo", "env", "command", "time", "nohup", "exec", "builtin", "("):
            i += 1
            continue
        break
    return w[i:]


def git_parts(w):
    """For a git command, return (subcommand, args, -C directory or None); otherwise None."""
    if not w or os.path.basename(w[0]) != "git":
        return None
    i, cwd_override = 1, None
    while i < len(w) and w[i].startswith("-"):
        opt = w[i]
        if opt in GIT_GLOBAL_WITH_VALUE:
            if opt == "-C" and i + 1 < len(w):
                cwd_override = w[i + 1]
            i += 2
            continue
        i += 1
    if i >= len(w):
        return None
    return w[i], w[i + 1:], cwd_override


def short_flags(args):
    out = set()
    for a in args:
        if a.startswith("-") and not a.startswith("--") and len(a) > 1:
            out.update(a[1:])
    return out


def resolve(path, cwd):
    path = os.path.expanduser(path)
    if not os.path.isabs(path):
        path = os.path.join(cwd, path)
    return os.path.normpath(path)


def inside(path, root):
    root = os.path.normpath(root)
    return path == root or path.startswith(root + os.sep)


def current_branch(cwd):
    try:
        out = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd,
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip()
    except Exception:
        return ""


def baseline(project):
    """The latest backup-before-round-NN branch, or HEAD if there is none."""
    try:
        out = subprocess.run(["git", "for-each-ref", "--format=%(refname:short)", "refs/heads/backup-before-round-*"],
                             cwd=project, capture_output=True, text=True, timeout=5).stdout.split()
    except Exception:
        out = []
    rounds = []
    for name in out:
        m = re.search(r"round-(\d+)$", name)
        if m:
            rounds.append((int(m.group(1)), name))
    return max(rounds)[1] if rounds else "HEAD"


def protected_asset(path, project):
    """True if path is inside assets/ and it (or anything under it) existed before this round."""
    if not inside(path, os.path.join(project, "assets")):
        return False
    rel = os.path.relpath(path, project).replace(os.sep, "/")
    if any(c in rel for c in "*?[{"):
        return True                     # a pattern we can't resolve safely: protect
    try:
        r = subprocess.run(["git", "ls-tree", "-r", "--name-only", baseline(project), "--", rel],
                           cwd=project, capture_output=True, text=True, timeout=5)
    except Exception:
        return True
    if r.returncode != 0:
        return True                     # can't tell: protect
    return bool(r.stdout.strip())


def check_git(sub, args, cwd, project):
    flags = short_flags(args)
    longs = {a.split("=", 1)[0] for a in args if a.startswith("--")}
    plain = [a for a in args if not a.startswith("-")]

    if sub == "add":
        if any(a in (".", "./", "*", ":/", ":/*", "-A", "--all", "-u", "--update") for a in args) or "A" in flags or "u" in flags:
            block("files are added by name only (never 'git add .', '-A', '--all', '*', ':/' or '-u'). "
                  "Run git status, look at every file, then add the ones you mean by name.")
    elif sub == "commit":
        if "a" in flags or "--all" in longs:
            block("never 'git commit -a'. Add files by name, then commit.")
    elif sub == "push":
        if ("f" in flags or longs & {"--force", "--force-with-lease", "--force-if-includes", "--mirror", "--delete", "--prune"}
                or any(a.startswith("+") or a.startswith(":") for a in plain)):
            block("no force pushes and no deleting remote branches.")
        refspecs = plain[1:]
        to_main = "--all" in longs or any(re.search(r"(^|:)(refs/heads/)?main$", r) for r in refspecs)
        if not refspecs and current_branch(cwd) == "main":
            to_main = True
        if to_main and not os.path.exists(os.path.join(project, ".claude", "ship-approved")):
            block("pushing main publishes the live site. Only after the owner has replied 'ship it': write the date "
                  "and the owner's words into .claude/ship-approved, then push again. Until then push your working branch.")
    elif sub == "reset":
        if "--hard" in longs:
            block("no 'git reset --hard'. Ask the owner first.")
    elif sub == "clean":
        if "f" in flags or "--force" in longs:
            block("no 'git clean -f'. Ask the owner first.")
    elif sub in ("checkout", "restore"):
        if any(a in (".", "./", ":/", "*") for a in args):
            block("no discarding every change at once. Restore single files by name, and only your own changes.")
    elif sub == "stash":
        if plain[:1] and plain[0] in ("drop", "clear"):
            block("no 'git stash drop' or 'git stash clear'.")
    elif sub == "branch":
        deleting = "D" in flags or "d" in flags or "--delete" in longs
        if "D" in flags or (deleting and any(p.startswith("backup-") for p in plain)):
            block("branches aren't force-deleted, and backup branches are always kept. Ask the owner first.")
    elif sub in ("rm", "mv"):
        sources = plain[:-1] if sub == "mv" and len(plain) > 1 else plain
        if any(protected_asset(resolve(a, cwd), project) for a in sources):
            block(ASSET_MSG)


def check_bash(cmd, cwd, project):
    for seg in segments(cmd):
        w = strip_prefixes(words(seg))
        if not w:
            continue
        prog = os.path.basename(w[0])
        if prog == "cd":
            if len(w) > 1 and not w[1].startswith("-"):
                cwd = resolve(w[1], cwd)
            continue
        g = git_parts(w)
        if g:
            sub, args, cwd_override = g
            check_git(sub, args, resolve(cwd_override, cwd) if cwd_override else cwd, project)
            continue
        if prog in ("rm", "unlink", "rmdir", "mv", "srm", "shred", "trash"):
            targets = [a for a in w[1:] if not a.startswith("-")]
            if prog == "mv" and len(targets) > 1:
                targets = targets[:-1]          # the sources; the last word is the destination
            if any(protected_asset(resolve(a, cwd), project) for a in targets):
                block(ASSET_MSG)
        if prog == "find" and ("-delete" in w or "-exec" in w or "-execdir" in w):
            roots = []
            for a in w[1:]:
                if a.startswith("-") or a in ("(", "!"):
                    break                           # the expression starts here
                roots.append(resolve(a, cwd))
            roots = roots or [cwd]
            assets = os.path.join(project, "assets")
            # a root inside assets that holds original files, or a root (like the repo itself) that contains assets/
            if any(protected_asset(r, project) or (inside(assets, r) and protected_asset(assets, project)) for r in roots):
                block("no bulk deleting or rewriting anywhere that holds files that were in assets/ before this round. "
                      "Run it on a narrower folder (for example scratch/ or a folder you created this round).")


def check_write(path, cwd, project):
    if not path:
        return
    p = resolve(path, cwd)
    home = os.path.expanduser("~")
    allowed = [project, os.path.join(home, "Documents", "toff-studio-tools"), os.path.join(home, ".claude"),
               "/tmp", "/private/tmp", "/var/folders", "/private/var/folders"]
    if os.environ.get("TMPDIR"):
        allowed.append(os.environ["TMPDIR"])
    downloads = os.path.join(home, "Downloads")
    toff_download = inside(p, downloads) and os.path.relpath(p, downloads).split(os.sep)[0].startswith("toff-")
    if not toff_download and not any(inside(p, os.path.normpath(r)) for r in allowed):
        block("files are only written inside this repo, ~/Documents/toff-studio-tools, ~/Downloads/toff-…, a temporary folder "
              "or ~/.claude (the Bluebird and Everest folders, and everything else on the Mac, are read-only). Write it inside the repo "
              "(scratch files go in scratch/).")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    if not isinstance(data, dict):
        sys.exit(0)
    tool = data.get("tool_name") or ""
    inp = data.get("tool_input") or {}
    cwd = data.get("cwd") or os.getcwd()
    project = os.environ.get("CLAUDE_PROJECT_DIR") or cwd

    if KEY_RE.search(json.dumps(inp)):
        block("this contains something that looks like an Anthropic API key. The key lives only in the Cloudflare "
              "Worker's secret: never in a file, a command, a log or a message.")
    if tool == "Bash":
        check_bash(inp.get("command") or "", cwd, project)
    elif tool in ("Write", "Edit", "MultiEdit"):
        check_write(inp.get("file_path"), cwd, project)
    elif tool == "NotebookEdit":
        check_write(inp.get("notebook_path"), cwd, project)
    sys.exit(0)


if __name__ == "__main__":
    main()
