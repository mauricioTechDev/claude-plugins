# usage-guard

Keeps a Claude Code session from running into a plan usage limit halfway through a task.

![usage-guard's status line under the Claude Code prompt, showing 5h 2% · resets 9:10 AM](https://raw.githubusercontent.com/mauricioTechDev/claude-plugins/main/docs/usage-guard-status.png)

## Install

In a Claude Code terminal session:

```
/plugin install usage-guard --marketplace mauricioTechDev/claude-plugins
```

## What it does

- A mod hook reads the 5-hour and weekly limits Claude Code already receives with every response, so watching them costs no tokens. The 5-hour percent and its reset time stay under the prompt; the weekly figure joins it past 75%.
- When any limit reaches the threshold (95% by default), it adds one short note telling Claude to wrap up with the `usage-guard` skill, and shows a toast and a notification.
- The skill gets the work to a safe stopping point without discarding anything, writes a handoff to `~/.claude/handoffs/`, tells you when the limit resets, and stops. Say "continue" after the reset. A new session started in the same folder gets a pointer to the handoff, with the resume steps, on its first prompt.
- Headless `claude -p` runs are left alone, so scripts that call Claude never get a wrap-up note in their output.

The skill's description is always listed (about 75 tokens per session). The rest of the skill loads only when the guard fires or you run `/usage-guard:usage-guard`.

## Settings

```bash
claude plugin configure usage-guard@techdev-plugins
```

shows the current values. To change one:

```bash
echo '{"threshold": "90"}' | claude plugin configure usage-guard@techdev-plugins --values-stdin
```

- `threshold`: the percent that triggers the wrap-up (default 95). On a heavy model at high effort a single turn can use a few percent, so 90 leaves more room.
- `showStatus`: show usage under the prompt (default on).

## Turning it off

```bash
claude plugin disable usage-guard@techdev-plugins
```

## Checking it

From the repository root:

- `claude plugin test plugins/usage-guard` runs the 8 engine tests (no model calls).
- `claude plugin eval plugins/usage-guard --model haiku --runs 1 --scaffold --allow-tools Write Edit Bash --no-publish` runs the 3 behaviour evals against a no-plugin baseline. Each run is a real session on your plan; on Haiku the suite costs about $0.02.

## License

MIT. See [LICENSE](LICENSE).
