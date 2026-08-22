import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { buildCliArgs, splitCommand } from '../cli';
import { parseSettings, resolveSettingsPath } from '../settings';

suite('Extension Test Suite', () => {
	test('activates and registers peter-sync commands', async () => {
		const extension = vscode.extensions.getExtension('peter.peter-sync');
		assert.ok(extension, 'extension peter.peter-sync should be present');
		if (!extension) {
			return;
		}
		await extension.activate();
		assert.ok(extension.isActive);

		const commands = await vscode.commands.getCommands(true);
		for (const command of [
			'peter-sync.refresh',
			'peter-sync.addPair',
			'peter-sync.removePair',
			'peter-sync.editExcludes',
			'peter-sync.addExclude',
			'peter-sync.removeExclude',
			'peter-sync.syncPair',
			'peter-sync.syncAll',
			'peter-sync.watchPair',
			'peter-sync.watchAll',
			'peter-sync.stopWatch',
			'peter-sync.openSettingsFile',
		]) {
			assert.ok(commands.includes(command), `missing command ${command}`);
		}
	});

	test('parses settings JSON pairs', () => {
		const settings = parseSettings(JSON.stringify({
			pairs: [{
				name: 'notes',
				left: '/tmp/a',
				right: '/tmp/b',
				snapshot: ['readme.md'],
				exclude: ['node_modules', '.git'],
			}],
		}));
		assert.strictEqual(settings.pairs.length, 1);
		assert.strictEqual(settings.pairs[0].name, 'notes');
		assert.deepStrictEqual(settings.pairs[0].snapshot, ['readme.md']);
		assert.deepStrictEqual(settings.pairs[0].exclude, ['node_modules', '.git']);
	});

	test('treats missing exclude as empty', () => {
		const settings = parseSettings(JSON.stringify({
			pairs: [{
				name: 'notes',
				left: '/tmp/a',
				right: '/tmp/b',
			}],
		}));
		assert.deepStrictEqual(settings.pairs[0].exclude, []);
	});

	test('treats missing pairs as empty', () => {
		assert.deepStrictEqual(parseSettings('{}').pairs, []);
	});

	test('rejects invalid settings', () => {
		assert.throws(() => parseSettings('[]'), /JSON object/);
		assert.throws(() => parseSettings('{"pairs":{}}'), /pairs/);
		assert.throws(() => parseSettings('{"pairs":[{"left":"/a","right":"/b"}]}'), /name/);
	});

	test('resolves settings path and CLI args', () => {
		assert.strictEqual(resolveSettingsPath(''), path.join(os.homedir(), '.peter-sync', 'settings.json'));
		assert.strictEqual(resolveSettingsPath('~/custom.json'), path.join(os.homedir(), 'custom.json'));
		assert.deepStrictEqual(buildCliArgs(['sync', 'notes'], '/tmp/settings.json'), [
			'--settings',
			'/tmp/settings.json',
			'sync',
			'notes',
		]);
		assert.deepStrictEqual(splitCommand('python -m peter_sync'), {
			command: 'python',
			prefix: ['-m', 'peter_sync'],
		});
	});
});
