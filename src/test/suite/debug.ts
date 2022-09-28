import * as vscode from 'vscode';
import * as myExtension from '../../extension';

export function logAllTokens(tokens: myExtension.IToken[]) {
	tokens.forEach(function (f) {logToken(f);});
}

export function logToken(token: myExtension.IToken) {
	console.log('T='+token.type, 
	            'L='+token.line, 
				'S='+token.start,
				'L='+token.length,
				'M='+token.modifiers,
				'K='+token.keyword);
}

export function logAllRanges(ranges: vscode.FoldingRange[]) {
	ranges.forEach(function (r) {logRange(r);});
}

export function logRange(range: vscode.FoldingRange) {
	console.log('S='+range.start, 
	            'E='+range.end);
}
