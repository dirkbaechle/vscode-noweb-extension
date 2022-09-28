// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../../extension';
import { nowebText } from './texts';
import { containsToken, t, 
	    chunk, definition, code, reference, undefinedReference } from './utils';

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

	test('Chunks only start in first column', function () {
		let tokens = buildSemanticTokens(" @");
		assert.strictEqual(tokens.length, 0, "Chunk shouldn't start in second column");
		tokens = buildSemanticTokens("\t@");
		assert.strictEqual(tokens.length, 0, "Chunk shouldn't start after TAB");
		tokens = buildSemanticTokens("test@");
		assert.strictEqual(tokens.length, 0, "Chunk shouldn't start after string");
		tokens = buildSemanticTokens("@test");
		assert.strictEqual(tokens.length, 0, "Chunk shouldn't start when text follows directly");
		tokens = buildSemanticTokens("@\ttest");
		let s: myExtension.IToken = chunk(0, 0, 1);
		assert.strictEqual(tokens.length, 1, "Chunk should start with TAB");
		assert.strictEqual(containsToken(tokens, s), true, "Chunk with TAB isn't detected");
		tokens = buildSemanticTokens("@  \t  test");
		assert.strictEqual(tokens.length, 1, "Chunk should start with TABs and spaces");
		assert.strictEqual(containsToken(tokens, s), true, "Chunk with TABs and spaces isn't detected");
	});

	test('Definitions only start in first column', function () {
		let tokens = buildSemanticTokens("@\n <<abc>>=");
		assert.strictEqual(tokens.length, 1, "Definition shouldn't start in second column");
		tokens = buildSemanticTokens("@\n\t<<abc>>=");
		assert.strictEqual(tokens.length, 1, "Definition shouldn't start after TAB");
		tokens = buildSemanticTokens("@\ntest<<abc>>=");
		assert.strictEqual(tokens.length, 1, "Definition shouldn't start after string");
		tokens = buildSemanticTokens("@test");
		assert.strictEqual(tokens.length, 0, "Chunk shouldn't start when text follows directly");
		tokens = buildSemanticTokens("@\ttest");
		let s: myExtension.IToken = chunk(0, 0, 1);
		assert.strictEqual(tokens.length, 1, "Chunk should start with TAB");
		assert.strictEqual(containsToken(tokens, s), true, "Chunk with TAB isn't detected");
		tokens = buildSemanticTokens("@  \t  test");
		assert.strictEqual(tokens.length, 1, "Chunk should start with TABs and spaces");
		assert.strictEqual(containsToken(tokens, s), true, "Chunk with TABs and spaces isn't detected");
	});

	test('Multiple references per line', function () {
		let tokens = buildSemanticTokens("@\n<<abc>>=\n<<xyz>><<lmn>>");
		assert.strictEqual(tokens.length, 4, "References not detected - a");
 		let s: myExtension.IToken = undefinedReference(2, 0, 7, "xyz");
		assert.strictEqual(containsToken(tokens, s), true, "First reference isn't detected - a");
		s = undefinedReference(2, 7, 7, "lmn");
		assert.strictEqual(containsToken(tokens, s), true, "Second reference isn't detected - a");

		tokens = buildSemanticTokens("@\n<<abc>>=\ntest<<xyz>><<lmn>>");
		assert.strictEqual(tokens.length, 5, "Code not detected - b");
		s = code(2, 0, 4);
		assert.strictEqual(containsToken(tokens, s), true, "Code in first column isn't detected - b");
		s = undefinedReference(2, 4, 7, "xyz");
		assert.strictEqual(containsToken(tokens, s), true, "First reference isn't detected - b");
		s = undefinedReference(2, 11, 7, "lmn");
		assert.strictEqual(containsToken(tokens, s), true, "Second reference isn't detected - b");

		tokens = buildSemanticTokens("@\n<<abc>>=\n<<xyz>>test<<lmn>>");
		assert.strictEqual(tokens.length, 5, "Code not detected - c");
		s = code(2, 7, 4);
		assert.strictEqual(containsToken(tokens, s), true, "Code between references isn't detected - c");
		s = undefinedReference(2, 0, 7, "xyz");
		assert.strictEqual(containsToken(tokens, s), true, "First reference isn't detected - c");
		s = undefinedReference(2, 11, 7, "lmn");
		assert.strictEqual(containsToken(tokens, s), true, "Second reference isn't detected - c");

		tokens = buildSemanticTokens("@\n<<abc>>=\n<<xyz>><<lmn>>test");
		assert.strictEqual(tokens.length, 5, "Code not detected - d");
		s = code(2, 14, 4);
		assert.strictEqual(containsToken(tokens, s), true, "Code after references isn't detected - d");
		s = undefinedReference(2, 0, 7, "xyz");
		assert.strictEqual(containsToken(tokens, s), true, "First reference isn't detected - d");
		s = undefinedReference(2, 7, 7, "lmn");
		assert.strictEqual(containsToken(tokens, s), true, "Second reference isn't detected - d");

		tokens = buildSemanticTokens("@\n<<abc>>=\none<<xyz>>two<<lmn>>three");
		assert.strictEqual(tokens.length, 7, "Code not detected - e");
		s = code(2, 0, 3);
		assert.strictEqual(containsToken(tokens, s), true, "Code before references isn't detected - e");
		s = code(2, 10, 3);
		assert.strictEqual(containsToken(tokens, s), true, "Code between references isn't detected - e");
		s = code(2, 20, 5);
		assert.strictEqual(containsToken(tokens, s), true, "Code after references isn't detected - e");
		s = undefinedReference(2, 3, 7, "xyz");
		assert.strictEqual(containsToken(tokens, s), true, "First reference isn't detected - e");
		s = undefinedReference(2, 13, 7, "lmn");
		assert.strictEqual(containsToken(tokens, s), true, "Second reference isn't detected - e");

	});


	test('Multiple doc sections', function () {
		let tokens = buildSemanticTokens("@\none\n@\ntwo\n\n@ \nthree");
		assert.strictEqual(tokens.length, 3, "Chunks not detected- a");
		let s: myExtension.IToken = chunk(0, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "First chunk isn't detected - a");
		s = chunk(2, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "Second chunk isn't detected - a");
		s = chunk(5, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "Third chunk isn't detected - a");

		tokens = buildSemanticTokens("\ntest\n@\none\n@\ntwo\n\n@ \nthree");
		assert.strictEqual(tokens.length, 3, "Chunks not detected - b");
		s = chunk(2, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "First chunk isn't detected - b");
		s = chunk(4, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "Second chunk isn't detected - b");
		s = chunk(7, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "Third chunk isn't detected - b");
	});

	test('Multiple definitions per chunk', function () {
		let tokens = buildSemanticTokens(nowebText('muldef'));
		assert.strictEqual(tokens.length, 9);
		let s: myExtension.IToken = chunk(0, 0, 1);
		assert.strictEqual(containsToken(tokens, s), true, "First chunk isn't contained");
		s = definition(2, 0, 6);
		assert.strictEqual(containsToken(tokens, s), true, "First definition isn't contained");
		s = code(3, 0, 3);
		assert.strictEqual(containsToken(tokens, s), true, "First code section isn't contained");
		s = reference(4, 0, 7, "abc");
		assert.strictEqual(containsToken(tokens, s), true, "Reference isn't contained");
		s = definition(6, 0, 8);
		assert.strictEqual(containsToken(tokens, s), true, "Second definition isn't contained");
		s = code(7, 0, 3);
		assert.strictEqual(containsToken(tokens, s), true, "Second code section isn't contained");
		s = definition(9, 0, 8);
		assert.strictEqual(containsToken(tokens, s), true, "Third definition isn't contained");
		s = code(10, 0, 4);
		assert.strictEqual(containsToken(tokens, s), true, "Third code section isn't contained");
		s = undefinedReference(10, 4, 7, "hjk");
		assert.strictEqual(containsToken(tokens, s), true, "Unresolved reference isn't contained");
	});

});


function buildSemanticTokens(content: string): myExtension.IToken[] {
	let cancel = new vscode.CancellationTokenSource();
	const semProv = new myExtension.NowebTokenProvider();
	return semProv.parse(content, cancel.token);
}
