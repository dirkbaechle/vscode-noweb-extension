// This file contains some of Noweb's parsing routines, as taken
// from v2.12 and rewritten in Typescript.
// This is the attempt to be as close as possible to the original
// while parsing Noweb syntax...

const modStart = '<<';
const modStartLength = modStart.length;
const modEnd = '>>';
const modEndLength = modEnd.length;
const modStartEscaped = '@<<';
const modEndEscaped = '@>>';

export interface IResult {
    found: boolean,
    start: number,
    name: string
}

export function findEscaped(input: string, search: string, 
                            escape: string = '\0', start: number = 0): IResult {
    const inputLength = input.length;
    let idx: number = start;
    const firstChar: string = search[0];
    const firstEscapeChar: string = escape[0];
    const escapeLength: number = escape.length;

    do {
        while (idx < inputLength && 
               input.charAt(idx) !== firstChar &&
               input.charAt(idx) !== firstEscapeChar) {
            idx++;
        }
        if (idx >= inputLength) {
            return {found: false, start: -1, name: ''};
        }
        // Find the escape sequence first
        if (firstEscapeChar !== '\0' &&
            input.indexOf(escape, idx) === idx) {
            // Whole escape sequence could be matched
            idx += escapeLength;
            continue;
        }
        // Find the actual search sequence
        if (input.indexOf(search, idx) === idx) {
            return {found: true, start: idx + search.length, name: ''};
        }

        idx++;
    } while (idx < inputLength);

    return {found: false, start: -1, name: ''};
}

export function moduleStart(str: string, idx: number = 0): IResult {
    return findEscaped(str, modStart, modStartEscaped, idx);
}

export function moduleEnd(str: string, idx: number = 0): IResult {
    return findEscaped(str, modEnd, modEndEscaped, idx);
}

export function startsCode(line: string): boolean {
    let result: IResult;
    result = moduleStart(line);
    if (!result.found || result.start !== 2) {
        return false;
    }
    result = moduleEnd(line, 2);
    if (!result.found || line.charAt(result.start) !== '=') {
        return false;
    }
    // Rest of the line should be whitespace only
    return (line.substring(result.start+1).trim() === '');
}

export function getModuleName(line: string, idx: number = 0): IResult {
    let result: IResult;
    let startIndex = 0;
    result = moduleStart(line, idx);
    if (!result.found) {
        return {found: false, start: -1, name: ''};
    }
    startIndex = result.start;
    result = moduleEnd(line, startIndex);
    if (!result.found) {
        return {found: false, start: -1, name: ''};
    }
    return {found: true, start: startIndex, name: line.substring(startIndex, result.start-2)};
}

export function matchLength(match: IResult): number {
    if (match.found) {
        return match.name.length + modStartLength + modEndLength;
    }
    return 0;
}

export function correctStartIndex(start: number): number {
    if (start > modStartLength) {
        return start - modStartLength;
    }
    return 0;
}
