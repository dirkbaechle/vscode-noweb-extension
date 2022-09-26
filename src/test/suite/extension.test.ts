// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';

suite('Noweb semantic highlighting', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Empty file', function () {
		let tokens = buildSemanticTokens("");
		assert.strictEqual(tokens.length, 0);

	});

	test('Single chunk start', function () {
		let tokens = buildSemanticTokens("@ ");
		assert.strictEqual(tokens.length, 1);
		assert.deepStrictEqual(tokens[0], t(0, 0, 1, myExtension.chunkStartType, myExtension.chunkStartModifiers));
	});

	test('Single chunk start with doc and definition', function () {
		let tokens = buildSemanticTokens("@\nTest\n<<t>>=\nxyz\n<<abc>>");
		assert.strictEqual(tokens.length, 4);
		let s: myExtension.IToken = t(0, 0, 1, myExtension.chunkStartType, myExtension.chunkStartModifiers);
		assert.strictEqual(containsToken(tokens, s), true, "Chunk isn't contained");
		s = t(2, 0, 6, myExtension.definitionType);
		assert.strictEqual(containsToken(tokens, s), true, "Definition isn't contained");
		s = t(3, 0, 3, myExtension.codeType);
		assert.strictEqual(containsToken(tokens, s), true, "Code section isn't contained");
		s = t(4, 0, 7, myExtension.undefinedReferenceType, [], "abc");
		assert.strictEqual(containsToken(tokens, s), true, "Undefined reference isn't contained");
	});
});

function containsToken(tokens: myExtension.IToken[], t: myExtension.IToken): boolean {
	if (tokens.find(value => tokenEquals(t, value)) !== undefined) {
		return true;
	}

	return false;
}

function tokenEquals(a: myExtension.IToken, b: myExtension.IToken): boolean {
	if ((a.type === b.type) &&
	    (a.line === b.line) &&
		(a.start === b.start) &&
		(a.length === b.length) &&
		(a.keyword === b.keyword) &&
		(JSON.stringify(a.modifiers) === JSON.stringify(b.modifiers))
	) {
		return true;
	}
	return false;
}

function buildSemanticTokens(content: string): myExtension.IToken[] {
	let cancel = new vscode.CancellationTokenSource();
	const semProv = new myExtension.NowebTokenProvider();
	return semProv.parse(content, cancel.token);
}

function t(line: number, start: number, length: number,
	       type: string, modifiers: string[] = [], keyword: string = ""): myExtension.IToken {
	return { line, start, length, type, modifiers, keyword };
}
