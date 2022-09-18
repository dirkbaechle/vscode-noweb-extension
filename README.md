# Noweb Literate Programming Extension for Visual Studio Code

This is an extension for Visual Studio Code, supporting
[Literate Programming](http://www.literateprogramming.com) using
the [Noweb](https://www.cs.tufts.edu/~nr/noweb/) tool written by Norman Ramsey.

Its main goal is to provide a somewhat decent syntax highlighting for *Noweb* files.

*Note: This is a work in progress and has been tested with Noweb versions 2.x only.*

## Features

- Basic syntax highlighting for *Noweb* keywords. The LaTeX sections are delegated to the
  internal TeX highlighting grammars of VS Code.
- Detects and colorizes undefined *Noweb* keywords.
- Basic folding support.
- Auto-completion for `<<>>` brackets.

## Known Issues

- *Noweb* common file extensions, `.nw` and `.noweb`, may conflict with other tools.
- The used token types, and therefore the items' colors, have been tested with the "Dark+"
  theme only. Token colors may clash or be undistinguishable when using a different theme.

## Used token types

In the '`Token`' column of the following table, the first string denotes the actual type
while the optional `[]` brackets contain the modifier(s).

| Regex | Token | Meaning |
|-------|-------|---------|
| `/^@\s*$/` | function[declaration] | The start of a new *Noweb* chunk |
| `/^<<(.*)>>=\s*$/` | variable | Definition of a keyword |
| `/^<<(.*)>>+=\s*$/` | variable | Addition to a keyword |
| `/^<<(.*)>>\s*$/` | keyword | Reference to a defined keyword |
| " | comment | Reference to an undefined keyword |
| `.*` | string | All other text in a code section, meaning the 'code' itself |

## Screenshots

The following images were taken while working on one of my own projects: 
["*Re-programming the PIC for a DDS-VFO in Assembler*"](https://github.com/dirkbaechle/hw9-dds-vfo) (in German).

### Basic view

The basic parsing and the highlighting orients itself around *Noweb*'s notion of a "chunk". A new
chunk starts with a single `@` in the first column of a line.

Chunks are then further subdivided into a "*text*" section and a "*code*" section. In the *text*
section, one uses LaTeX to document thoughts and ideas around the program. In the *code* section,
the actual sources are "*woven*" together by defining and referencing snippets of code, which each
are identified by a string (as a form of ID).

![Basic view](images/basicview.png)

### LaTeX highlighting

The internal highlighting of VS Code is doing all the heavy work for parsing the
plethora of LaTeX commands and environments.

![LaTeX highlighting](images/latex.png)

### Code sections

Within code sections, no further special highlighting is done. By design, *Noweb* supports any
programming language, so we don't really know what kind of syntactic and semantic analysis
we'd have to apply.

![Code sections](images/codesections.png)

### Undefined keywords

Here, the string '`flags for hw9 mode`' has an additional `s` at the end of the word `flag`.
So, the keyword is marked as being "*undefined*" by displaying it in a different color (green).
When correcting the string to '`flag for hw9 mode`', the color of the keyword reference should
switch back to normal (purple).

![Undefined keywords](images/undefined.png)

### Folding

Single *Noweb* chunks can be folded and unfolded.

![Folding chunks](images/folding.png)
