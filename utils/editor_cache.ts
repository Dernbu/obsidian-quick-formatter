import { Editor } from "obsidian";

export class Cache {
    static saved_editor: string[] = [];

    public static cacheEditor(editor: Editor): void {
        for (let i = 0; i < editor.lineCount(); i++) {
            this.saved_editor[i] = editor.getLine(i);
        }
    }

    public static getCachedLine(line: number): string {
        return this.saved_editor[line];
    }

    /**
         * Get a deleted character by comparing cache and new. Assumes only one char is deleted.
         * @param cachedLine 
         * @param newLine 
         */
    public static getDeletedCharacter(editor: Editor, lineNo: number): string {
        const cachedLine = this.getCachedLine(lineNo);
        const newLine = editor.getLine(lineNo);

        for (let i = 0; i < newLine.length; i++) {
            if (cachedLine[i] !== newLine[i]) {
                return cachedLine[i];
            }
        }
        return cachedLine[cachedLine.length - 1];
    }
}