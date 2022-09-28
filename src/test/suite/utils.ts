import * as vscode from 'vscode';
import * as myExtension from '../../extension';

//
// Semantic highlighting
//

export function containsToken(tokens: myExtension.IToken[], t: myExtension.IToken): boolean {
	if (tokens.find(value => tokenEquals(t, value)) !== undefined) {
		return true;
	}

	return false;
}

export function t(line: number, start: number, length: number,
	       type: string, modifiers: string[] = [], keyword: string = ""): myExtension.IToken {
	return { line, start, length, type, modifiers, keyword };
}

export function chunk(line: number, start: number, length: number): myExtension.IToken {
    return t(line, start, length, myExtension.chunkStartType, myExtension.chunkStartModifiers);
}

export function definition(line: number, start: number, length: number): myExtension.IToken {
    return t(line, start, length, myExtension.definitionType);
}

export function code(line: number, start: number, length: number): myExtension.IToken {
    return t(line, start, length, myExtension.codeType);
}

export function reference(line: number, start: number, length: number, keyword: string): myExtension.IToken {
    return t(line, start, length, myExtension.referenceType, [], keyword);
}

export function undefinedReference(line: number, start: number, length: number, keyword: string): myExtension.IToken {
    return t(line, start, length, myExtension.undefinedReferenceType, [], keyword);
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

//
// Folding ranges
//

export function containsRange(ranges: vscode.FoldingRange[], r: vscode.FoldingRange): boolean {
	if (ranges.find(value => rangeEquals(r, value)) !== undefined) {
		return true;
	}

	return false;
}

export function r(start: number, end: number): vscode.FoldingRange {
	return new vscode.FoldingRange(start, end);
}

function rangeEquals(a: vscode.FoldingRange, b: vscode.FoldingRange): boolean {
	if ((a.start === b.start) &&
	    (a.end === b.end)) {
		return true;
	}
	return false;
}
