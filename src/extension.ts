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
import * as path from "path";

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

/**
 * Defines the grammar token type for our internal
 * parsing.
 */
interface IToken {
    line: number;
    start: number;
    length: number;
    type: string;
    modifiers: string[];
    keyword: string;
}

/**
 * Defines a grammar file that's in a VS Code Extension.
 */
 interface IExtensionGrammar {
    /**
     * The name of the language, e.g. powershell
     */
    language?: string;
    /**
     * The absolute path to the grammar file
     */
    path?: string;
    /**
     * The path to the extension
     */
    extensionPath?: string;
}

/**
 * Defines a VS Code extension with minimal properties for
 * grammar contribution.
 */
interface IExtensionPackage {
    /**
     * Hashtable of items this extension contributes
     */
    contributes?: {
        /**
         * Array of grammars this extension supports
         */
        grammars?: IExtensionGrammar[],
    };
}

/**
 * Defines a grammar token in a text document, which will get used for
 * the parsing of the LaTeX sections.
 * We need to reproduce the IToken interface from vscode-textmate due to the
 * odd way it has to be required.
 * https://github.com/Microsoft/vscode-textmate/blob/46af9487e1c8fa78aa1f2e2/release/main.d.ts#L161-L165
 */
interface ILaTeXToken {
    /**
     * Zero based offset where the token starts
     */
    startIndex: number;
    /**
     * Zero based offset where the token ends
     */
    readonly endIndex: number;
    /**
     * Array of scope names that the token is a member of
     */
    readonly scopes: string[];
}

/**
 * Defines a list of grammar tokens, typically for an entire text document
 */
interface ITokenList extends Array<ILaTeXToken> { }

/**
 * Due to how the vscode-textmate library is required, we need to minimally define a Grammar
 * object, which can be used to tokenize a text document.
 * https://github.com/Microsoft/vscode-textmate/blob/46af9487e1c8fa78aa1f2e2/release/main.d.ts#L92-L108
 */
interface IGrammar {
    /**
     * Tokenize `lineText` using previous line state `prevState`.
     */
    tokenizeLine(lineText: any, prevState: any): any;
}


// Parsing mode
enum Mode { tex = 1, code };
// Token types/modifiers for our detected items
const chunkStartType = 'function';
const chunkStartModifiers = ['declaration'];
const definitionType = 'variable';
const referenceType = 'keyword';
const undefinedReferenceType = 'comment';
const codeType = 'string';
// Regexes
const reDefinition = /^<<(.*)>>=\s*$/;
const reReference = /^\s*<<(.*)>>\s*$/;
const reChunkStart = /^@\s*$/;

class NowebTokenProvider implements vscode.DocumentSemanticTokensProvider {
    private latexGrammar: IGrammar|undefined;

    provideDocumentSemanticTokens(doc: vscode.TextDocument, cancel: vscode.CancellationToken) {
        // Detect LaTeX grammar and initialize it, if possible
        this.latexGrammar = this.grammar();
        // Setup our token builder
        const builder = new vscode.SemanticTokensBuilder();
        // Start parsing and create output tokens
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
                // TODO: handle LaTeX parsing here
                if (this.latexGrammar !== undefined) {
                    // Convert the document text into a series of grammar tokens
                    // const tokens: ITokenList = this.latexGrammar.tokenizeLine(latexSnippet, null).tokens;
                    tokens.push({
                        line: i, start: 0, length: line.length,
                        type: 'comment', modifiers: [],
                        keyword: ''
                    });
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

    /**
         * Returns the LaTeX grammar parser, from the vscode-textmate node module
         * @returns      A grammar parser for the LaTeX language, is successful or
         *               'undefined' if an error occured
         */
    public grammar(): IGrammar|undefined {
        const tm = this.getCoreNodeModule("vscode-textmate");
        if (tm === null) { return undefined; }
        const registry = new tm.Registry();
        if (registry === null) { return undefined; }
        const grammarPath = this._latexGrammarPath();
        if (grammarPath.length === 0) { return undefined; }
        try {
            return registry.loadGrammarFromPathSync(grammarPath);
        } catch (err) { return undefined; }
    }

    /**
     * Returns a node module installed within VSCode, or null if it fails.
     * Some node modules (e.g. vscode-textmate) cannot be required directly, instead the known module locations
     * must be tried. Documented in https://github.com/Microsoft/vscode/issues/46281
     * @param moduleName Name of the module to load e.g. vscode-textmate
     * @returns          The required module, or null if the module cannot be required
     */
    private getCoreNodeModule(moduleName: string) {
        // Attempt to load the module from known locations
        const loadLocations: string[] = [
            `${vscode.env.appRoot}/node_modules.asar/${moduleName}`,
            `${vscode.env.appRoot}/node_modules/${moduleName}`,
        ];

        for (const filename of loadLocations) {
            try {
                const mod = require(filename);
                return mod;
            } catch (err) {
            }
        }
        return null;
    }

    /**
     * Go through all the VSCode extension packages and search for
     * JSON LaTeX grammars.
     * @returns the path to the first LaTeX grammar we find
     */
    private _latexGrammarPath(): string {
        for (const ext of vscode.extensions.all) {
            if (!(ext.packageJSON && ext.packageJSON.contributes && ext.packageJSON.contributes.grammars)) {
                continue;
            }
            for (const grammar of ext.packageJSON.contributes.grammars) {
                if (grammar.language !== "latex") { continue; }
                return path.join(ext.extensionPath, grammar.path);
            }
        }
        return '';
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
