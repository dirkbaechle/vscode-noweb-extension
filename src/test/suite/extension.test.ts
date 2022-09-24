// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';

suite('Noweb semantic highlighting', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Basic tests', function () {
		// Empty file
		let tokens = buildSemanticTokens("");
		assert.strictEqual(tokens.length, 0);
		// Single chunk start
		tokens = buildSemanticTokens("@ ");
		assert.strictEqual(tokens.length, 1);
		assert.deepStrictEqual(tokens[0], t(0, 0, 1, myExtension.chunkStartType, myExtension.chunkStartModifiers));
	});
});

function buildSemanticTokens(content: string): myExtension.IToken[] {
	let cancel = new vscode.CancellationTokenSource();
	const semProv = new myExtension.NowebTokenProvider();
	return semProv.parse(content, cancel.token);
}

function t(line: number, start: number, length: number,
	       type: string, modifiers: string[] = []): myExtension.IToken {
	const keyword = "";
	return { line, start, length, type, modifiers, keyword };
}
