---
name: usage-guard
description: Wraps up work safely before a Claude plan usage limit (5-hour or weekly) runs out, saving a handoff to pick up from after the reset. Use when a [usage-guard] note says a limit is close, when the user asks to wrap up or save progress before hitting a limit, or to resume work from a usage-guard handoff.
---

# Usage guard

This plugin's hook watches the plan's limits without spending tokens and adds a `[usage-guard]` note when one passes the threshold (95% by default). Little of the limit is left by then, so wrap up in as few tool calls as you can: no exploring, no re-reading files you already know, no new subagents.

## Wrap up

1. **Reach a safe stopping point.** Finish the step in progress only if it takes a call or two. Otherwise leave it as it is and say in the handoff exactly what's incomplete. Never revert or discard work to tidy up. Start nothing new, and skip long builds or test runs.
2. **Stop what keeps spending.** Stop subagents, workflows and loops you started; they draw on the same limit. Servers and shells can stay up.
3. **Write the handoff** to the path in the note, overwriting any older one. Without a note, use `~/.claude/handoffs/`, then the working directory with every `/` replaced by `-`, then `.md`. Keep it under 40 lines:
   - **Goal**: what the user is trying to get done.
   - **Done**: what was finished and checked.
   - **In progress**: what's half-done, with file paths and lines.
   - **Next**: the next steps in order, concrete enough to start without re-investigating.
   - **Check**: the command or test that shows the work is right.
   - **Notes**: decisions, gotchas, and questions for the user.

   In a git repository, add the output of `git status --short`. Don't commit, push or stash unless the user's instructions already call for it.
4. **Tell the user** in three lines or fewer: which limit, its percent and reset time, where the handoff is, and that they can say "continue" once it resets.
5. **End the turn.** Do no more work until the user says to continue, even with the task unfinished. If the user tells you to keep going anyway, do; it's their call.

## Resume

When the user wants to carry on after a wrap-up:

1. If this conversation already holds the context, continue from where it stopped. Otherwise read the handoff, compare its `git status` with the tree as it is now, and say in one line what you'll do next.
2. Delete the handoff file once you've picked the work back up, so a stale one never misleads a later session.
3. Continue from **Next**.
