import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { CliResult } from './types';

export interface CliOptions {
	cliPath: string;
	settingsPath?: string;
	cwd?: string;
}

export function buildCliArgs(command: string[], settingsPath?: string): string[] {
	const args: string[] = [];
	if (settingsPath?.trim()) {
		args.push('--settings', settingsPath.trim());
	}
	args.push(...command);
	return args;
}

export function splitCommand(cliPath: string): { command: string; prefix: string[] } {
	const parts = cliPath.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return { command: 'peter-sync', prefix: [] };
	}
	return { command: parts[0], prefix: parts.slice(1) };
}

export interface SyncProgress {
	name: string;
	done: number;
	total: number;
	relative: string;
}

export function parseProgressLine(line: string): SyncProgress | undefined {
	if (!line.startsWith('PROGRESS\t')) {
		return undefined;
	}
	const parts = line.split('\t');
	if (parts.length < 5) {
		return undefined;
	}
	const done = Number(parts[2]);
	const total = Number(parts[3]);
	if (!Number.isFinite(done) || !Number.isFinite(total) || total < 1) {
		return undefined;
	}
	return {
		name: parts[1],
		done,
		total,
		relative: parts.slice(4).join('\t'),
	};
}

export function runCli(
	options: CliOptions,
	command: string[],
	onProgress?: (progress: SyncProgress) => void,
): Promise<CliResult> {
	const { command: executable, prefix } = splitCommand(options.cliPath);
	const args = [...prefix, ...buildCliArgs(command, options.settingsPath)];

	return new Promise((resolve, reject) => {
		const child = spawn(executable, args, {
			cwd: options.cwd,
			env: { ...process.env, NO_COLOR: '1' },
		});
		let stdout = '';
		let stderr = '';
		let pending = '';
		child.stdout.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			stdout += text;
			if (!onProgress) {
				return;
			}
			pending += text;
			const lines = pending.split(/\r?\n/);
			pending = lines.pop() ?? '';
			for (const line of lines) {
				const progress = parseProgressLine(line);
				if (progress) {
					onProgress(progress);
				}
			}
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on('error', (error) => {
			reject(error);
		});
		child.on('close', (code) => {
			if (onProgress && pending) {
				const progress = parseProgressLine(pending);
				if (progress) {
					onProgress(progress);
				}
			}
			resolve({ code: code ?? 1, stdout, stderr });
		});
	});
}

export function startWatch(
	options: CliOptions,
	command: string[],
	onOutput: (text: string) => void,
): ChildProcessWithoutNullStreams {
	const { command: executable, prefix } = splitCommand(options.cliPath);
	const args = [...prefix, ...buildCliArgs(command, options.settingsPath)];
	const child = spawn(executable, args, {
		cwd: options.cwd,
		env: process.env,
	});
	child.stdout.on('data', (chunk: Buffer) => onOutput(chunk.toString()));
	child.stderr.on('data', (chunk: Buffer) => onOutput(chunk.toString()));
	return child;
}
