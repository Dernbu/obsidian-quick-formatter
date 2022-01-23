import { Editor, EditorPosition } from 'obsidian';

enum CodeType {
    NONE,
    CODE,
    ADMONITION
}

enum EnvType {
    MARKDOWN,
    INLINE_CODE,
    MULTILINE_CODE,
    INLINE_MATHJAX,
    MULTILINE_MATHJAX
}

export class Environment {

    public static readonly MARKDOWN = new Environment(EnvType.MARKDOWN, 0);
    public static readonly INLINE_CODE = new Environment(EnvType.INLINE_CODE, 0);
    public static readonly MULTILINE_CODE = (level: number,
        type: CodeType = CodeType.NONE) => new Environment(EnvType.MULTILINE_CODE, level, type);

    public static readonly INLINE_MATHJAX = new Environment(EnvType.INLINE_MATHJAX, 0);
    public static readonly MULITLINE_MATHJAX = new Environment(EnvType.MULTILINE_MATHJAX, 0);

    public static Symbols = class {
        public static readonly INLINE_CODE_START = /[`]{1}/;
        public static readonly INLINE_CODE_END = /[`]{1}/;

        public static readonly MULTILINE_CODE_START = /^[`]{3,}/
        public static readonly MULTILINE_CODE_END = (codeBlockLevel: number) => new RegExp("^[`]{" + (codeBlockLevel + 2) + ",}");

        public static readonly MULTILINE_MATHJAX_START = /[$]{2}/;
        public static readonly MULTILINE_MATHJAX_END = /[$]{2}/;

        public static readonly INLINE_MATHJAX_START = /[$]{1}/;
        public static readonly INLINE_MATHJAX_END = /[$]{1}/;

        public static readonly ALL_REGEX_START = /^[`]{3,}|[`]{1}|[$]{2}|[$]{1}/;

    }


    private constructor(
        public readonly env_type: EnvType,
        public readonly level: number,
        public readonly type: CodeType = CodeType.NONE) {
    }

    /**
     * 
     * @param line line to scan
     * Returns the code bloc level of the line.
     * Assumes the line is currently not in a code block.
     * IF the line is not a code block (or in-line), then return 0
     * ``` => 1
     * ```` => 2
     * ...
     */
    public static getCodeBlockLevel(line: string): number {
        const regexMatch = line.match(this.Symbols.MULTILINE_CODE_START)[0];
        if (regexMatch === "") {
            return 0
        } else {
            return regexMatch.length - 2;
        }
    }

    public isMarkdown(): boolean {
        return this.env_type === EnvType.MARKDOWN;
    }

    public isCode(): boolean {
        return this.env_type === EnvType.INLINE_CODE || this.env_type === EnvType.MULTILINE_CODE;
    }

    public isInlineCode(): boolean {
        return this.env_type === EnvType.INLINE_CODE;
    }

    public isMultilineCode(): boolean {
        return this.env_type === EnvType.MULTILINE_CODE;
    }

    public isMathjax(): boolean {
        return this.env_type === EnvType.INLINE_MATHJAX || this.env_type === EnvType.MULTILINE_MATHJAX;
    }

    public isInlineMathjax(): boolean {
        return this.env_type === EnvType.INLINE_MATHJAX;
    }

    public isMultilineMathjax(): boolean {
        return this.env_type === EnvType.MULTILINE_MATHJAX;
    }

    /**
     * Get the environments carrying over to the next line.
     */
    public toNextLine(): Environment {
        if (this.isMultilineCode() || this.isMultilineMathjax()) {
            return this;
        } else {
            return Environment.MARKDOWN;
        }
    }

    /**
     * 
     * @param env 
     * @returns true if the two environment objects are equal, false otherwise.
     */
    public equals(env: Environment) {
        return this.env_type === env.env_type &&
            this.type == env.type &&
            this.level == env.level;
    }


    public static getCursorEnvironment(editor: Editor): Environment {
        const cursor: EditorPosition = editor.getCursor();

        let prevEnv = Environment.MARKDOWN;
        let recalculate = false;
        // Get previous environments
        for (let lineNo = 0; lineNo < cursor.line; lineNo++) {

            // first line
            if (recalculate || get_line_cache(lineNo, editor.getLine(lineNo)) === null) {
                // prevEnv = Environment.MARKDOWN;
                prevEnv = parseSingleLineEnvironment(editor.getLine(lineNo), prevEnv).toNextLine();
                cache_line(lineNo, editor.getLine(lineNo), prevEnv);
                recalculate = true;
            }

            prevEnv = get_line_cache(lineNo, editor.getLine(lineNo)).toNextLine();
            // console.log(lineNo, prevEnv);    
        }
        recalculate = false;
        
        // console.log("Line: ", editor.getLine(cursor.line).slice(0, cursor.ch));
        return parseSingleLineEnvironment(editor.getLine(cursor.line).slice(0, cursor.ch), prevEnv);
    }
}
// Memoisation of line environments
// const INIT_ENVIRONMENT = Environment.MARKDOWN;

const lineCache = new Array<string>();
const lineEnvironment = new Array<Environment>();

function cache_line(lineNo: number, line: string, line_env: Environment): void {
    lineCache[lineNo] = lineNo + line;
    lineEnvironment[lineNo] = line_env;
}

function get_line_cache(lineNo: number, line: string): Environment {
    if (lineCache[lineNo] === lineNo + line) {
        return lineEnvironment[lineNo];
    } else {
        return null;
    }
}

/**
 * Get the environment at the end of a given line.
 * @param line 
 * @param currentEnvironment 
 * @returns an Environment object.
 */
function parseSingleLineEnvironment(
    line: string,
    currentEnvironment: Environment
): Environment {
    // console.log("Parsing line: " + line);
    if (line.contains("\n")) {
        throw new Error("Single line environment cannot contain newline, got: " + line);
    }

    if (currentEnvironment.isMarkdown()) {
        // console.log("Markdown", line);
        // In multi-line code environment (/[`]{3.}/)
        const symbol_start: string = line.match(Environment.Symbols.ALL_REGEX_START)?.[0];
        const symbol_start_pos: number = line.search(Environment.Symbols.ALL_REGEX_START);
        // console.log(symbol_start);
        // No environment change
        if (symbol_start_pos === -1) {
            return Environment.MARKDOWN;

            // Multiline code
        } else if (symbol_start.startsWith("```")) {
            const code_block_level = Environment.getCodeBlockLevel(line);

            return parseSingleLineEnvironment(
                line.slice(symbol_start_pos + code_block_level + 3),
                Environment.MULTILINE_CODE(code_block_level)
            );
        } else if (symbol_start === "`") {
            return parseSingleLineEnvironment(
                line.slice(symbol_start_pos + 1),
                Environment.INLINE_CODE
            );
        } else if (symbol_start === "$$") {
            return parseSingleLineEnvironment(
                line.slice(symbol_start_pos + 2),
                Environment.MULITLINE_MATHJAX
            );
        } else if (symbol_start === "$") {
            return parseSingleLineEnvironment(
                line.slice(symbol_start_pos + 1),
                Environment.INLINE_MATHJAX
            );
        }

    } else if (currentEnvironment.isMultilineCode()) {
        const end_pos = line.search(Environment.Symbols.MULTILINE_CODE_END(currentEnvironment.level));
        // console.log(Environment.Symbols.MULTILINE_CODE_END(currentEnvironment.level));
        if (end_pos !== -1) {
            return parseSingleLineEnvironment(
                line.slice(end_pos + 2 + currentEnvironment.level),
                Environment.MARKDOWN
            );
        }

    } else if (currentEnvironment.isInlineCode()) {
        const end_pos = line.search(Environment.Symbols.INLINE_CODE_END);
        if (end_pos !== -1) {
            return parseSingleLineEnvironment(
                line.slice(end_pos + 1),
                Environment.MARKDOWN
            );
        }

    } else if (currentEnvironment.isMultilineMathjax()) {
        console.log(line);
        console.log(line.search(Environment.Symbols.MULTILINE_MATHJAX_END));
        const end_pos = line.search(Environment.Symbols.MULTILINE_MATHJAX_END);
        console.log(line.slice(end_pos + 2));
        if (end_pos !== -1) {
            return parseSingleLineEnvironment(
                line.slice(end_pos + 2),
                Environment.MARKDOWN
            );
        }
    } else if (currentEnvironment.isInlineMathjax()) {
        const end_pos = line.search(Environment.Symbols.INLINE_MATHJAX_END);
        if (end_pos !== -1) {
            return parseSingleLineEnvironment(
                line.slice(end_pos + 1),
                Environment.MARKDOWN
            );
        }

    }

    return currentEnvironment;
}



