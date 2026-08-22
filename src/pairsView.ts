import * as vscode from 'vscode';
import { FolderPair } from './types';

export class PairItem extends vscode.TreeItem {
	constructor(
		public readonly pair: FolderPair,
		watching: boolean,
	) {
		super(pair.name, vscode.TreeItemCollapsibleState.None);
		this.tooltip = `${pair.left}\n${pair.right}`;
		this.description = watching ? 'watching' : `${pair.left} ↔ ${pair.right}`;
		this.contextValue = watching ? 'pairWatching' : 'pair';
		this.iconPath = new vscode.ThemeIcon(watching ? 'eye' : 'folder');
		this.command = {
			command: 'peter-sync.syncPair',
			title: 'Sync Pair',
			arguments: [this],
		};
	}
}

export class PairsTreeProvider implements vscode.TreeDataProvider<PairItem> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<PairItem | undefined | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private pairs: FolderPair[] = [];
	private watchingName: string | undefined;

	refresh(pairs: FolderPair[], watchingName?: string): void {
		this.pairs = pairs;
		this.watchingName = watchingName;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: PairItem): vscode.TreeItem {
		return element;
	}

	getChildren(): PairItem[] {
		return this.pairs.map((pair) => new PairItem(pair, this.watchingName === pair.name || this.watchingName === '*'));
	}
}
