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
}

enum Mode { tex = 1, code };
const chunkStartType = 'function';
const chunkStartModifiers = ['declaration'];
const definitionType = 'variable';
const referenceType = 'keyword';
const undefinedReferenceType = 'comment';
const latexType = 'text';
const codeType = 'string';

const reDefinition = /^<<.*>>=\s*$/;
const reReference = /^\s*<<.*>>\s*$/;
const reChunkStart = /^@\s*$/;

class SemanticTokenProvider implements vscode.DocumentSemanticTokensProvider {
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
        let mode = Mode.code;
        let i = 0;
        const lines = text.split(/\r?\n/);
        while (i < lines.length && !cancel.isCancellationRequested) {
            const line = lines[i];
            switch (mode as Mode) {
                case Mode.code:
                    mode = this._parseCode(tokens, i, line);
                    break;
                default:
                    mode = this._parseTeX(tokens, i, line);
            }
            i++;
        }
        return tokens;
    }

    private _parseCode(tokens: IToken[], i: number, line: string): Mode {
        if (reChunkStart.test(line)) {
            tokens.push({
                line: i, start: 0, length: 1,
                type: chunkStartType, modifiers: chunkStartModifiers,
            });
            return Mode.tex;
        } else if (reReference.test(line)) {
                tokens.push({
                    line: i, start: 0, length: line.length,
                    type: referenceType, modifiers: [],
                });
        } else {
            tokens.push({
                line: i, start: 0, length: line.length,
                type: codeType, modifiers: [],
            });
        }
        return Mode.code;
    }

    private _parseTeX(tokens: IToken[], i: number, line: string): Mode {
        if (reChunkStart.test(line)) {
            tokens.push({
                line: i, start: 0, length: 1,
                type: chunkStartType, modifiers: chunkStartModifiers,
            });
        } else if (reDefinition.test(line)) {
            tokens.push({
                line: i, start: 0, length: line.length,
                type: definitionType, modifiers: [],
            });
            return Mode.code;
        } else {
            // handle LaTeX parsing here
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

export function activate(context: vscode.ExtensionContext) {
    const selector: vscode.DocumentFilter = { language: 'noweb' };
    const tokenProvider = new SemanticTokenProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(selector, tokenProvider, legend)
    );
}
