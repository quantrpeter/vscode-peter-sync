# peter-sync

VS Code sidebar for the [peter-sync](https://pypi.org/project/peter-sync/) CLI. Add folder pairs, sync them once, or watch them continuously.

The extension does not reimplement sync. It reads `~/.peter-sync/settings.json` and runs `peter-sync add|remove|sync|watch`.

## Requirements

Install the CLI first:

```bash
pip install peter-sync
```

If `peter-sync` is not on PATH, set **peter-sync.cliPath** to the executable, for example:

`/Users/peter/workspace/peter-sync/.venv/bin/peter-sync`

You can also use `python -m peter_sync`.

## Features

- Activity bar view of saved folder pairs
- Add a pair with a name and two folder pickers
- Sync one pair or all pairs
- Watch one pair or all pairs (polls at `peter-sync.watchInterval`)
- Stop watch from the view title or a watching pair
- Open the settings JSON file
- Status bar item and **peter-sync** output channel

## Run from source

1. Open this folder in VS Code.
2. Press F5 (**Run Extension**).
3. In the Extension Development Host, open the peter-sync activity bar icon.
4. Add a pair, then Sync or Watch.

## Settings

- `peter-sync.cliPath`: executable or `python -m peter_sync` (default `peter-sync`)
- `peter-sync.settingsPath`: optional settings JSON; empty uses `~/.peter-sync/settings.json`
- `peter-sync.watchInterval`: seconds between watch polls (default `2`)

## Commands

- peter-sync: Add Pair
- peter-sync: Sync All
- peter-sync: Watch All
- peter-sync: Stop Watch
- peter-sync: Refresh
- peter-sync: Open Settings File

Pair-specific Sync / Watch / Remove actions are on each tree item.

## Known Issues

Watch is a long-running CLI process. Stopping it sends SIGTERM to that process. If the CLI is missing, commands fail with a message to install it or set `peter-sync.cliPath`.

## Package

```bash
npm install
npm run compile
```

Then press `F5` in VSCode to launch an Extension Development Host.

## Packaging

```bash
npm install -g @vscode/vsce
vsce package
vsce publish
```

publish to cursor

```bash
npm install -g ovsx
ovsx publish -p <token>
```

Install the generated `.vsix` via "Extensions: Install from VSIX...".
