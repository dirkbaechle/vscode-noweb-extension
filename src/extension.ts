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

export interface IToken {
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
export const chunkStartType = 'function';
export const chunkStartModifiers = ['declaration'];
export const definitionType = 'variable';
export const referenceType = 'keyword';
export const undefinedReferenceType = 'comment';
export const codeType = 'string';

// Regexes
const reDefinition = /^<<(.*)>>=\s*$/;
const reReference = /<<(.*?)>>/g;
const reChunkStart = /^@\s*.*$/;

export class NowebTokenProvider implements vscode.DocumentSemanticTokensProvider {
    provideDocumentSemanticTokens(doc: vscode.TextDocument, cancel: vscode.CancellationToken) {
        const builder = new vscode.SemanticTokensBuilder();
        this.parse(doc.getText(), cancel).forEach((token) => builder.push(
            token.line, token.start, token.length,
            this._encodeType(token.type),
            this._encodeModifiers(token.modifiers),
        ));
        return builder.build();
    }

    public parse(text: string, cancel: vscode.CancellationToken): IToken[] {
        let tokens: IToken[] = [];
        let keywords = {defines: new Set<string>()};
        let mode = Mode.tex;
        let i = 0;
        const lines = text.split(/\r?\n/);
        while (i < lines.length && !cancel.isCancellationRequested) {
            const line = lines[i];
            switch (mode as Mode) {
                case Mode.code:
                    mode = this._parseCode(tokens, i, line, keywords);
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

    private _parseCode(tokens: IToken[], i: number, line: string, keywords: {defines: Set<string>}): Mode {
        // Check for the start of a new Noweb chunk
        if (reChunkStart.test(line)) {
            tokens.push({
                line: i, start: 0, length: 1,
                type: chunkStartType, modifiers: chunkStartModifiers,
                keyword: ''
            });
            return Mode.tex;
        } else {
            // Check for keyword definitions first
            const {mode, found} = this._checkForDefinitionKeywords(tokens, i, line, keywords);
            if (!found) {
                // Check for keyword references
                let hasReference: boolean = false;
                let lastCodeIndex = 0;
                let match = reReference.exec(line);
                while (match) {
                    hasReference = true;
                    tokens.push({
                        line: i, start: match.index, length: match[0].length,
                        type: referenceType, modifiers: [],
                        keyword: match[1]
                    });
                    // Handle code snippets between matches
                    if (lastCodeIndex < match.index) {
                        tokens.push({
                            line: i, start: lastCodeIndex, length: (match.index - lastCodeIndex),
                            type: codeType, modifiers: [],
                            keyword: ''
                        });
                    }
                    lastCodeIndex = match.index + match[0].length;
                    match = reReference.exec(line);
                }
                if (hasReference) {
                    // Close remaining code snippet after last match
                    if (lastCodeIndex < line.length) {
                        // Add final code markup
                        tokens.push({
                            line: i, start: lastCodeIndex, length: (line.length - lastCodeIndex),
                            type: codeType, modifiers: [],
                            keyword: ''
                        });
                    }
                }
                if (!hasReference) {
                    // We assume that all other lines are code
                    tokens.push({
                        line: i, start: 0, length: line.length,
                        type: codeType, modifiers: [],
                        keyword: ''
                    });
                }
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
            const {mode, found} = this._checkForDefinitionKeywords(tokens, i, line, keywords);
            if (found) {
                return mode;
            }
        }
        return Mode.tex;
    }

    private _checkForDefinitionKeywords(tokens: IToken[], i: number, line: string, keywords: {defines: Set<string>}): {mode: Mode, found: boolean} {
        let found: boolean = false;
        // Check for a keyword definition
        const match = reDefinition.exec(line);
        if (match) {
            tokens.push({
                line: i, start: 0, length: line.length,
                type: definitionType, modifiers: [],
                keyword: ''
            });
            keywords.defines.add(match[1]);
            found = true;
        }

        return {mode: Mode.code, found: found};
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

export class NowebFoldingRangeProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] {
        return this.parse(document.getText(), token);
    }

    public parse(text: string, token: vscode.CancellationToken): vscode.FoldingRange[] {
        let ranges: vscode.FoldingRange[] = [];
        let lastFoldline = 0;
        let i = 0;
        const lines = text.split(/\r?\n/);
        while (i < lines.length) {
            const line = lines[i];

            // Check for the start of a new Noweb chunk
            if (reChunkStart.test(line)) {
                if ((i-1) > lastFoldline) {
                    ranges.push(new vscode.FoldingRange(lastFoldline, i-1));
                }
                lastFoldline = i;
            }
            i++;
        }
        // Final fold at end of file
        if ((i-1) > lastFoldline) {
            ranges.push(new vscode.FoldingRange(lastFoldline, i-1));
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
