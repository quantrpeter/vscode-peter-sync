export interface FolderPair {
	name: string;
	left: string;
	right: string;
	snapshot: string[];
}

export interface SettingsFile {
	pairs: FolderPair[];
}

export interface CliResult {
	code: number;
	stdout: string;
	stderr: string;
}
