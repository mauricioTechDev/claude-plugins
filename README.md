# claude-plugins

Claude Code plugins, published as the plugin marketplace `techdev-plugins`.

| Plugin | What it does |
| --- | --- |
| [usage-guard](plugins/usage-guard) | Watches your plan's 5-hour and weekly limits at no token cost and has Claude wrap up safely before one runs out. |

## Install

In a Claude Code terminal session:

```
/plugin install usage-guard --marketplace mauricioTechDev/claude-plugins
```

Or from a shell:

```bash
claude plugin marketplace add mauricioTechDev/claude-plugins
claude plugin install usage-guard@techdev-plugins
```

The repository is private for now, so these work only for accounts that can read it.

## Working on a plugin

Each plugin lives in `plugins/<name>/` and has an entry in `.claude-plugin/marketplace.json`.

```bash
claude plugin validate .                  # the marketplace file and every plugin it lists
claude plugin test plugins/usage-guard    # engine tests, no model calls
claude plugin eval plugins/usage-guard --model haiku --runs 1 --scaffold --allow-tools Write Edit Bash --no-publish
```

Evals run real Claude sessions on your plan, so they count toward your usage limits.

To run plugins straight from a clone, add the clone as a marketplace once:

```bash
claude plugin marketplace add /path/to/claude-plugins
claude plugin install usage-guard@techdev-plugins
```

Claude Code then reads each plugin from the clone itself. Run `/reload-plugins` after an edit.

## Keeping personal data out

This repository is meant to be shareable, so nothing in it should identify a person or a machine.

- `scripts/check-pii.sh` looks for email addresses, home-directory paths, phone numbers and common secret formats. It also looks for your own name, email and username, which it reads from your machine each time it runs, so they never have to be written down here.
- `.githooks/pre-commit` runs that check on every commit. Turn it on once per clone with `git config core.hooksPath .githooks`. The hook also refuses a commit whose author email isn't a GitHub noreply address.
- `.gitignore` keeps out files Claude Code generates beside a plugin: type files that list your connected tools, and eval results that hold full session traces.
- Run `scripts/check-pii.sh --all` before changing the repository's visibility.
