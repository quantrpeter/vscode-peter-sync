import { ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { runCli, startWatch } from './cli';
import { loadSettings, resolveSettingsPath } from './settings';
import { ExcludeItem, PairItem, PairsTreeProvider } from './pairsView';
import { FolderPair } from './types';

let output: vscode.OutputChannel;
let status: vscode.StatusBarItem;
let tree: PairsTreeProvider;
let watchProcess: ChildProcessWithoutNullStreams | undefined;
let watchTarget: string | undefined;
let settingsWatcher: vscode.FileSystemWatcher | undefined;

export function activate(context: vscode.ExtensionContext): void {
	output = vscode.window.createOutputChannel('peter-sync');
	status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 80);
	status.command = 'peter-sync.syncAll';
	status.show();
	tree = new PairsTreeProvider();

	context.subscriptions.push(
		output,
		status,
		vscode.window.registerTreeDataProvider('peter-sync.pairs', tree),
		vscode.commands.registerCommand('peter-sync.refresh', () => refreshPairs()),
		vscode.commands.registerCommand('peter-sync.addPair', () => addPair()),
		vscode.commands.registerCommand('peter-sync.removePair', (item?: PairItem) => removePair(item)),
		vscode.commands.registerCommand('peter-sync.editExcludes', (item?: PairItem) => editExcludes(item)),
		vscode.commands.registerCommand('peter-sync.addExclude', (item?: PairItem) => addExclude(item)),
		vscode.commands.registerCommand('peter-sync.removeExclude', (item?: ExcludeItem) => removeExclude(item)),
		vscode.commands.registerCommand('peter-sync.syncPair', (item?: PairItem) => syncPairs(item)),
		vscode.commands.registerCommand('peter-sync.syncAll', () => syncPairs()),
		vscode.commands.registerCommand('peter-sync.watchPair', (item?: PairItem) => startWatching(item)),
		vscode.commands.registerCommand('peter-sync.watchAll', () => startWatching()),
		vscode.commands.registerCommand('peter-sync.stopWatch', () => stopWatching('Stopped watching.')),
		vscode.commands.registerCommand('peter-sync.openSettingsFile', () => openSettingsFile()),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('peter-sync')) {
				watchSettingsFile(context);
				refreshPairs();
			}
		}),
	);

	watchSettingsFile(context);
	refreshPairs();
	void vscode.commands.executeCommand('setContext', 'peter-sync.watching', false);
}

export function deactivate(): void {
	stopWatching();
	settingsWatcher?.dispose();
}

function getConfig() {
	const config = vscode.workspace.getConfiguration('peter-sync');
	const settingsPath = resolveSettingsPath(config.get<string>('settingsPath'));
	return {
		cliPath: config.get<string>('cliPath', 'peter-sync'),
		settingsPath,
		configuredSettingsPath: config.get<string>('settingsPath', '').trim(),
		watchInterval: config.get<number>('watchInterval', 2),
	};
}

function refreshPairs(): FolderPair[] {
	const { settingsPath } = getConfig();
	try {
		const settings = loadSettings(settingsPath);
		tree.refresh(settings.pairs, watchTarget);
		updateStatus(settings.pairs.length);
		return settings.pairs;
	} catch (error) {
		tree.refresh([]);
		const message = error instanceof Error ? error.message : String(error);
		void vscode.window.showErrorMessage(`peter-sync: ${message}`);
		return [];
	}
}

function updateStatus(pairCount: number): void {
	if (watchTarget) {
		status.text = `$(sync~spin) peter-sync: watching ${watchTarget === '*' ? 'all' : watchTarget}`;
		status.tooltip = 'Click to sync all pairs once';
		return;
	}
	status.text = `$(mirror) peter-sync: ${pairCount} pair${pairCount === 1 ? '' : 's'}`;
	status.tooltip = 'Click to sync all pairs';
}

async function addPair(): Promise<void> {
	const name = await vscode.window.showInputBox({
		prompt: 'Name for this folder pair',
		placeHolder: 'notes',
		validateInput: (value) => value.trim() ? undefined : 'Name cannot be empty',
	});
	if (!name) {
		return;
	}

	const left = await pickFolder('Select left folder');
	if (!left) {
		return;
	}
	const right = await pickFolder('Select right folder');
	if (!right) {
		returexcludeText = await vscode.window.showInputBox({
		prompt: 'Folders to exclude (comma-separated). Leave blank for none.',
		placeHolder: 'node_modules, .git, dist',
	});
	if (excludeText === undefined) {
		return;
	}

	const command = ['add', name.trim(), left, right, ...excludeFlags(parseExcludeList(excludeText))];
	const result = await runManaged(command
	}

	const result = await runManaged(['add', name.trim(), left, right]);
	if (result?.code === 0) {
		void vscode.window.showInformationMessage(`Added pair '${name.trim()}'`);
		refreshPairs();
	}
}

async function removePair(item?: PairItem): Promise<void> {
	const pair = item?.pair ?? await pickPair('Pair to remove');
	if (!pair) {
		return;
	}
	const choice = await vscode.window.showWarningMessage(
		`Remove pair '${pair.name}'? Folders are not deleted.`,
		{ modal: true },
		'Remove',
	);
	if (choice !== 'Remove') {
		return;
	

async function editExcludes(item?: PairItem): Promise<void> {
	const pair = item?.pair ?? await pickPair('Pair to edit excludes');
	if (!pair) {
		return;
	}
	const excludeText = await vscode.window.showInputBox({
		prompt: `Excluded folders for '${pair.name}' (comma-separated). Clear the box to sync everything.`,
		value: pair.exclude.join(', '),
		placeHolder: 'node_modules, .git, dist',
	});
	if (excludeText === undefined) {
		return;
	}
	const result = await runManaged(['exclude', pair.name, '--set', ...parseExcludeList(excludeText)]);
	if (result?.code === 0) {
		void vscode.window.showInformationMessage(`Updated excludes for '${pair.name}'`);
		refreshPairs();
	}
}

async function addExclude(item?: PairItem): Promise<void> {
	const pair = item?.pair ?? await pickPair('Pair to add an exclude');
	if (!pair) {
		return;
	}
	const folder = await vscode.window.showInputBox({
		prompt: `Folder to exclude from '${pair.name}'. Bare names match anywhere.`,
		placeHolder: 'node_modules',
		validateInput: (value) => value.trim() ? undefined : 'Folder cannot be empty',
	});
	if (!folder) {
		return;
	}
	const result = await runManaged(['exclude', pair.name, '--add', folder.trim()]);
	if (result?.code === 0) {
		void vscode.window.showInformationMessage(`Excluded '${folder.trim()}' from '${pair.name}'`);
		refreshPairs();
	}
}

async function removeExclude(item?: ExcludeItem): Promise<void> {
	if (!item) {
		const pair = await pickPair('Pair to remove an exclude from');
		if (!pair) {
			return;
		}
		if (pair.exclude.length === 0) {
			void vscode.window.showInformationMessage(`Pair '${pair.name}' has no excluded folders.`);
			return;
		}
		const picked = await vscode.window.showQuickPick(pair.exclude, {
			placeHolder: `Exclude to remove from '${pair.name}'`,
		});
		if (!picked) {
			return;
		}
		const result = await runManaged(['exclude', pair.name, '--remove', picked]);
		if (result?.code === 0) {
			void vscode.window.showInformationMessage(`Stopped excluding '${picked}' from '${pair.name}'`);
			refreshPairs();
		}
		return;
	}
	const result = await runManaged(['exclude', item.pair.name, '--remove', item.folder]);
	if (result?.code === 0) {
		void vscode.window.showInformationMessage(`Stopped excluding '${item.folder}' from '${item.pair.name}'`);
		refreshPairs();
	}
}}
	if (watchTarget === pair.name) {
		stopWatching();
	}
	const result = await runManaged(['remove', pair.name]);
	if (result?.code === 0) {
		void vscode.window.showInformationMessage(`Removed pair '${pair.name}'`);
		refreshPairs();
	}
}

async function syncPairs(item?: PairItem): Promise<void> {
	const command = item?.pair ? ['sync', item.pair.name] : ['sync'];
	const result = await runManaged(command);
	if (result?.code === 0) {
		const summary = firstLine(result.stdout) || 'Sync finished.';
		void vscode.window.showInformationMessage(summary);
		refreshPairs();
	}
}

async function startWatching(item?: PairItem): Promise<void> {
	const config = getConfig();
	const pair = item?.pair;
	const command = ['watch', ...(pair ? [pair.name] : []), '--interval', String(config.watchInterval)];
	stopWatching();

	output.clear();
	output.show(true);
	output.appendLine(`$ ${config.cliPath} ${command.join(' ')}`);

	let child: ChildProcessWithoutNullStreams;
	try {
		child = startWatch(
			{
				cliPath: config.cliPath,
				settingsPath: config.configuredSettingsPath || undefined,
			},
			command,
			(text) => output.append(text),
		);
	} catch (error) {
		showCliMissing(error);
		return;
	}

	watchProcess = child;
	watchTarget = pair?.name ?? '*';
	void vscode.commands.executeCommand('setContext', 'peter-sync.watching', true);
	refreshPairs();

	child.on('error', (error: Error) => {
		if (watchProcess === child) {
			showCliMissing(error);
			stopWatching();
		}
	});
	child.on('close', (code: number | null) => {
		if (watchProcess === child) {
			output.appendLine(`\nwatch exited with code ${code ?? 1}`);
			stopWatching();
		}
	});
}

function stopWatching(message?: string): void {
	const child = watchProcess;
	watchProcess = undefined;
	watchTarget = undefined;
	void vscode.commands.executeCommand('setContext', 'peter-sync.watching', false);
	if (child && !child.killed) {
		child.kill();
	}
	if (message) {
		void vscode.window.showInformationMessage(message);
	}
	if (tree) {
		refreshPairs();
	}
}

async function openSettingsFile(): Promise<void> {
	const { settingsPath } = getConfig();
	const uri = vscode.Uri.file(settingsPath);
	try {
		await vscode.workspace.fs.stat(uri);
	} catch {
		void vscode.window.showWarningMessage(`Settings file does not exist yet: ${settingsPath}`);
		return;
	}
	const document = await vscode.workspace.openTextDocument(uri);
	await vscode.window.showTextDocument(document);
}

async function runManaged(command: string[]) {
	const config = getConfig();
	

function parseExcludeList(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function excludeFlags(folders: string[]): string[] {
	return folders.flatMap((folder) => ['--exclude', folder]);
}output.appendLine(`$ ${config.cliPath} ${command.join(' ')}`);
	try {
		const result = await runCli(
			{
				cliPath: config.cliPath,
				settingsPath: config.configuredSettingsPath || undefined,
			},
			command,
		);
		if (result.stdout.trim()) {
			output.appendLine(result.stdout.trimEnd());
		}
		if (result.stderr.trim()) {
			output.appendLine(result.stderr.trimEnd());
		}
		if (result.code !== 0) {
			const detail = firstLine(result.stderr) || firstLine(result.stdout) || `exit code ${result.code}`;
			void vscode.window.showErrorMessage(`peter-sync: ${detail}`);
			output.show(true);
		}
		return result;
	} catch (error) {
		showCliMissing(error);
		return undefined;
	}
}

function showCliMissing(error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	output.appendLine(message);
	output.show(true);
	void vscode.window.showErrorMessage(
		`peter-sync CLI not found. Install with pip install peter-sync, then set peter-sync.cliPath if needed. (${message})`,
	);
}

async function pickFolder(label: string): Promise<string | undefined> {
	const selected = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: label,
	});
	return selected?.[0]?.fsPath;
}

async function pickPair(placeHolder: string): Promise<FolderPair | undefined> {
	const pairs = refreshPairs();
	if (pairs.length === 0) {
		void vscode.window.showInformationMessage('No folder pairs configured.');
		return undefined;
	}
	const picked = await vscode.window.showQuickPick(
		pairs.map((pair) => ({
			label: pair.name,
			description: `${pair.left} ↔ ${pair.right}`,
			pair,
		})),
		{ placeHolder },
	);
	return picked?.pair;
}

function watchSettingsFile(context: vscode.ExtensionContext): void {
	settingsWatcher?.dispose();
	const { settingsPath } = getConfig();
	const pattern = new vscode.RelativePattern(
		vscode.Uri.file(path.dirname(settingsPath)),
		path.basename(settingsPath),
	);
	settingsWatcher = vscode.workspace.createFileSystemWatcher(pattern);
	settingsWatcher.onDidChange(() => refreshPairs());
	settingsWatcher.onDidCreate(() => refreshPairs());
	settingsWatcher.onDidDelete(() => refreshPairs());
	context.subscriptions.push(settingsWatcher);
}

function firstLine(text: string): string {
	return text.trim().split(/\r?\n/, 1)[0] ?? '';
}
