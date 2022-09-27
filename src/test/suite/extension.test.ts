// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';
import { nowebText } from './texts';
import {containsToken, t, 
	    chunk, definition, code, reference, undefinedReference} from './utils';

suite('Noweb semantic highlighting', () => {

	test('Empty file', function () {
		let tokens = buildSemanticTokens("");
		assert.strictEqual(tokens.length, 0);

	});

	test('Single chunk start', function () {
		let tokens = buildSemanticTokens("@ ");
		assert.strictEqual(tokens.length, 1);
		assert.deepStrictEqual(tokens[0], chunk(0, 0, 1));
	});

	test('Single chunk start with doc and definition', function () {
		let tokens = buildSemanticTokens("@\nTest\n<<t>>=\nxyz\n<<abc>>");
		assert.strictEqual(tokens.length, 4);
		let s: myExtension.IToken = chunk(0, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "Chunk isn't contained");
		s = definition(2, 0, 6);
		assert.strictEqual(containsToken(tokens, s), true, "Definition isn't contained");
		s = code(3, 0, 3);
		assert.strictEqual(containsToken(tokens, s), true, "Code section isn't contained");
		s = undefinedReference(4, 0, 7, "abc");
		assert.strictEqual(containsToken(tokens, s), true, "Undefined reference isn't contained");
	});

	test('Single chunk with resolved reference', function () {
		let tokens = buildSemanticTokens(nowebText('resdef'));
		assert.strictEqual(tokens.length, 7);
		let s: myExtension.IToken = chunk(0, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "First chunk isn't contained");
		s = definition(2, 0, 6);
		assert.strictEqual(containsToken(tokens, s), true, "First definition isn't contained");
		s = code(3, 0, 3);
		assert.strictEqual(containsToken(tokens, s), true, "First code section isn't contained");
		s = reference(4, 0, 7, "abc");
		assert.strictEqual(containsToken(tokens, s), true, "Reference isn't contained");
		s = chunk(5, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "Second chunk isn't contained");
		s = definition(6, 0, 8);
		assert.strictEqual(containsToken(tokens, s), true, "Second definition isn't contained");
		s = code(7, 0, 3);
		assert.strictEqual(containsToken(tokens, s), true, "Second code section isn't contained");

	});

});

function buildSemanticTokens(content: string): myExtension.IToken[] {
	let cancel = new vscode.CancellationTokenSource();
	const semProv = new myExtension.NowebTokenProvider();
	return semProv.parse(content, cancel.token);
}
