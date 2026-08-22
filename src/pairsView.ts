import * as vscode from 'vscode';
import { FolderPair } from './types';

export type PairTreeItem = PairItem | ExcludeItem;

export class PairItem extends vscode.TreeItem {
	constructor(
		public readonly pair: FolderPair,
		watching: boolean,
	) {
		super(
			pair.name,
			pair.exclude.length
				? vscode.TreeItemCollapsibleState.Collapsed
				: vscode.TreeItemCollapsibleState.None,
		);
		const excludeLabel = pair.exclude.length
			? `\nexcludes: ${pair.exclude.join(', ')}`
			: '';
		this.tooltip = `${pair.left}\n${pair.right}${excludeLabel}`;
		this.description = watching
			? 'watching'
			: pair.exclude.length
				? `${pair.left} ↔ ${pair.right}  (−${pair.exclude.length})`
				: `${pair.left} ↔ ${pair.right}`;
		this.contextValue = watching ? 'pairWatching' : 'pair';
		this.iconPath = new vscode.ThemeIcon(watching ? 'eye' : 'folder');
		this.command = {
			command: 'peter-sync.syncPair',
			title: 'Sync Pair',
			arguments: [this],
		};
	}
}

export class ExcludeItem extends vscode.TreeItem {
	constructor(
		public readonly pair: FolderPair,
		public readonly folder: string,
	) {
		super(folder, vscode.TreeItemCollapsibleState.None);
		this.tooltip = `Excluded from ${pair.name}: ${folder}`;
		this.description = 'excluded';
		this.contextValue = 'exclude';
		this.iconPath = new vscode.ThemeIcon('exclude');
	}
}

export class PairsTreeProvider implements vscode.TreeDataProvider<PairTreeItem> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<PairTreeItem | undefined | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private pairs: FolderPair[] = [];
	private watchingName: string | undefined;

	refresh(pairs: FolderPair[], watchingName?: string): void {
		this.pairs = pairs;
		this.watchingName = watchingName;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: PairTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: PairTreeItem): PairTreeItem[] {
		if (!element) {
			return this.pairs.map((pair) => new PairItem(
				pair,
				this.watchingName === pair.name || this.watchingName === '*',
			));
		}
		if (element instanceof PairItem) {
			return element.pair.exclude.map((folder) => new ExcludeItem(element.pair, folder));
		}
		return [];
	}
}
