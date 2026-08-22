import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FolderPair, SettingsFile } from './types';

export const DEFAULT_SETTINGS_PATH = path.join(os.homedir(), '.peter-sync', 'settings.json');

export function resolveSettingsPath(configured?: string): string {
	const value = configured?.trim();
	if (!value) {
		return DEFAULT_SETTINGS_PATH;
	}
	if (value.startsWith('~')) {
		return path.join(os.homedir(), value.slice(1));
	}
	return path.resolve(value);
}

export function parseSettings(raw: string): SettingsFile {
	const data = JSON.parse(raw) as unknown;
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new Error('Settings file must be a JSON object.');
	}
	const pairsValue = (data as { pairs?: unknown }).pairs;
	if (pairsValue === undefined) {
		return { pairs: [] };
	}
	if (!Array.isArray(pairsValue)) {
		throw new Error('Settings "pairs" must be an array.');
	}
	return { pairs: pairsValue.map(parsePair) };
}

export function loadSettings(settingsPath: string): SettingsFile {
	if (!fs.existsSync(settingsPath)) {
		return { pairs: [] };
	}
	return parseSettings(fs.readFileSync(settingsPath, 'utf8'));
}

function parsePair(item: unknown): FolderPair {
	if (!item || typeof item !== 'object' || Array.isArray(item)) {
		throw new Error('Each pair must be a JSON object.');
	}
	const record = item as Record<string, unknown>;
	if (typeof record.name !== 'string' || !record.name.trim()) {
		throw new Error('Pair is missing required field: name');
	}
	if (typeof record.left !== 'string') {
		throw new Error('Pair is missing required field: left');
	}
	if (typeof record.right !== 'string') {
		throw new Error('Pair is missing required field: right');
	}
	const snapshot = record.snapshot ?? [];
	if (!Array.isArray(snapshot) || !snapshot.every((entry) => typeof entry === 'string')) {
		throw new Error('Pair snapshot must be a list of file paths.');
	}
	const exclude = record.exclude ?? [];
	if (!Array.isArray(exclude) || !exclude.every((entry) => typeof entry === 'string')) {
		throw new Error('Pair exclude must be a list of folder paths.');
	}
	return {
		name: record.name,
		left: record.left,
		right: record.right,
		snapshot,
		exclude,
	};
}
