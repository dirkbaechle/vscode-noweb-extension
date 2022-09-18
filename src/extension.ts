/**
 * Noweb Extension for Visual Studio Code
 * Copyright (C) 2022  Dirk Baechle <dl9obn@darc.de>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as vscode from 'vscode';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const legend = (function () {
    const types = [
        'comment', 'enum', 'enumMember', 'function', 'keyword', 'label',
        'macro', 'number', 'operator', 'parameter', 'property', 'string',
        'struct', 'type', 'variable',
    ];
    types.forEach((type, index) => tokenTypes.set(type, index));
    const modifiers = [
        'declaration', 'definition', 'documentation', 'modification',
        'readonly', 'static',
    ];
    modifiers.forEach((modifier, index) => tokenModifiers.set(modifier, index));
    return new vscode.SemanticTokensLegend(types, modifiers);
})();

interface IToken {
    line: number;
    start: number;
    length: number;
    type: string;
    modifiers: string[];
    keyword: string;
}

// Parsing mode
enum Mode { tex = 1, code };
// Token types/modifiers for our detected items
const chunkStartType = 'function';
const chunkStartModifiers = ['declaration'];
const definitionType = 'variable';
const addDefinitionType = 'variable';
const referenceType = 'keyword';
const undefinedReferenceType = 'comment';
const codeType = 'string';

// Regexes
const reDefinition = /^<<(.*)>>=\s*$/;
const reAddDefinition = /^<<(.*)>>\+=\s*$/;
const reReference = /^\s*<<(.*)>>\s*$/;
const reChunkStart = /^@\s*.*$/;

class NowebTokenProvider implements vscode.DocumentSemanticTokensProvider {
    provideDocumentSemanticTokens(doc: vscode.TextDocument, cancel: vscode.CancellationToken) {
        const builder = new vscode.SemanticTokensBuilder();
        this._parse(doc.getText(), cancel).forEach((token) => builder.push(
            token.line, token.start, token.length,
            this._encodeType(token.type),
            this._encodeModifiers(token.modifiers),
        ));
        return builder.build();
    }

    private _parse(text: string, cancel: vscode.CancellationToken): IToken[] {
        let tokens: IToken[] = [];
        let keywords = {defines: new Set<string>()};
        let mode = Mode.tex;
        let i = 0;
        const lines = text.split(/\r?\n/);
        while (i < lines.length && !cancel.isCancellationRequested) {
            const line = lines[i];
            switch (mode as Mode) {
                case Mode.code:
                    mode = this._parseCode(tokens, i, line);
                    break;
                default:
                    mode = this._parseTeX(tokens, i, line, keywords);
            }
            i++;
        }

        // Loop over all tokens and check whether all found keywords
        // are actually defined. Patch the tokens to use a different
        // type/color if they aren't.
        tokens.forEach(item => {
            if (keywords.defines.size > 0 && item.keyword && !keywords.defines.has(item.keyword)) {
                item.type = undefinedReferenceType;
            }
        });
        return tokens;
    }

    private _parseCode(tokens: IToken[], i: number, line: string): Mode {
        // Check for the start of a new Noweb chunk
        if (reChunkStart.test(line)) {
            tokens.push({
                line: i, start: 0, length: 1,
                type: chunkStartType, modifiers: chunkStartModifiers,
                keyword: ''
            });
            return Mode.tex;
        } else {
            // Check for a keyword reference
            const match = reReference.exec(line);
            if (match) {
                tokens.push({
                    line: i, start: 0, length: line.length,
                    type: referenceType, modifiers: [],
                    keyword: match[1]
                });
            } else {
                // We assume that all other lines are code
                tokens.push({
                    line: i, start: 0, length: line.length,
                    type: codeType, modifiers: [],
                    keyword: ''
                });
            }
        }
        return Mode.code;
    }

    private _parseTeX(tokens: IToken[], i: number, line: string, keywords: {defines: Set<string>}): Mode {
        // Check for the start of a new Noweb chunk
        if (reChunkStart.test(line)) {
            tokens.push({
                line: i, start: 0, length: 1,
                type: chunkStartType, modifiers: chunkStartModifiers,
                keyword: ''
            });
        } else {
            // Check for a keyword definition
            const match = reDefinition.exec(line);
            if (match) {
                tokens.push({
                    line: i, start: 0, length: line.length,
                    type: definitionType, modifiers: [],
                    keyword: ''
                });
                keywords.defines.add(match[1]);
                return Mode.code;
            } else {
                // Check for an addition to a keyword
                const match = reAddDefinition.exec(line);
                if (match) {
                    tokens.push({
                        line: i, start: 0, length: line.length,
                        type: addDefinitionType, modifiers: [],
                        keyword: match[1]
                    });
                    return Mode.code;
                }
            }
        }
        return Mode.tex;
    }

    private _encodeType(type: string) {
        return tokenTypes.get(type)!;
    }

    private _encodeModifiers(modifiers: string[]): number {
        let result = 0;
        modifiers.forEach((modifier) => {
            result |= 1 << tokenModifiers.get(modifier)!;
        });
        return result;
    }
};

class NowebFoldingRangeProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] {
        let ranges: vscode.FoldingRange[] = [];
        const docText = document.getText();

        let lastFoldline = 0;
        let i = 0;
        const lines = docText.split(/\r?\n/);
        while (i < lines.length) {
            const line = lines[i];

            // Check for the start of a new Noweb chunk
            if (reChunkStart.test(line)) {
                if ((i-1) > lastFoldline) {
                    ranges.push(new vscode.FoldingRange(lastFoldline, i-1));
                    lastFoldline = i;
                }
            }
            i++;
        }

        return ranges;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const selector: vscode.DocumentFilter = { language: 'noweb' };
    const tokenProvider = new NowebTokenProvider();
    const foldingProvider = new NowebFoldingRangeProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(selector, tokenProvider, legend)
        );
    vscode.languages.registerFoldingRangeProvider({ scheme: 'file', language: 'noweb' }, foldingProvider);
}
