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

export function runCli(options: CliOptions, command: string[]): Promise<CliResult> {
	const { command: executable, prefix } = splitCommand(options.cliPath);
	const args = [...prefix, ...buildCliArgs(command, options.settingsPath)];

	return new Promise((resolve, reject) => {
		const child = spawn(executable, args, {
			cwd: options.cwd,
			env: process.env,
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on('error', (error) => {
			reject(error);
		});
		child.on('close', (code) => {
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
