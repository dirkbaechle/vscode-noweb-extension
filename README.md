# Noweb Extension for Visual Studio Code

This is an extension for Visual Studio Code, supporting [Literate Programming](http://www.literateprogramming.com) using
the [Noweb](https://www.cs.tufts.edu/~nr/noweb/) tool written by Norman Ramsey.

Its main goal is to provide a somewhat decent syntax highlighting for Noweb files.

*Note: This is a work in progress and has been tested with Noweb versions 2.x only.*

## Features

- Basic syntax highlighting.
- Detects and colorizes undefined keywords.

## Known Issues

- Noweb common file extensions, `.nw` and `.noweb`, may conflict with other tools.
- The used token types, and therefore the items' colors, have been tested with the "Dark +" theme only. Token colors may clash or be undistinguishable when using a different theme.

## Used token types

| Regex | Token | Meaning |
|-------|-------|---------|
| `/^@\s*$/` | function[declaration] | The start of a new Noweb chunk |
| `/^<<(.*)>>=\s*$/` | variable | Definition of a keyword |
| `/^<<(.*)>>\s*$/` | keyword | Reference to a defined keyword |
| " | comment | Reference to an undefined keyword |
| `.*` | string | All other text in a code section |

