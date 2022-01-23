import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

import { Environment } from 'utils/environment_scanner';
import { Cache } from 'utils/editor_cache';
import { DEFAULT_SETTINGS, FormatterPluginSettings, FormatterSettingsTab } from 'settings/settings';


export default class QuickFormatterPlugin extends Plugin {
	settings: FormatterPluginSettings;

	async onload() {
		await this.loadSettings();

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new FormatterSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// this.registerDomEvent(document, 'keypress', (evt: KeyboardEvent) => {
		// 	const editor: Editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;
		// });

		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			const editor: Editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;
			console.log(evt.key);
			console.log(Environment.getCursorEnvironment(editor));
			switch (evt.key) {
				case ' ':
					this.handleSpace(evt, editor);
					break;
				case 'Backspace':
					this.handleBackspace(evt, editor);
					break;
				case '$':
					this.handleDollar(evt, editor);
					break;
			}
		})

		this.registerDomEvent(document, 'keyup', (evt: KeyboardEvent) => {
			const editor: Editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;
			Cache.cacheEditor(editor);
		});
		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	private handleSpace(evt: KeyboardEvent, editor: Editor): void {
		if (editor.getSelection() !== "") {
			return;
		}

		if (Environment.getCursorEnvironment(editor).isMathjax()) {
			console.log("Space!");
			let cursor = editor.getCursor();
			const currentLine = editor.getLine(cursor.line);

			this.settings.autoCompleteMathjaxEnvironment.forEach((item) => {
				const key = this.settings.autoCompleteMathjaxPrefix + item;
				const value = ["\\begin{" + item + "}", "\\end{" + item + "}"]
				if (
					currentLine.slice(0, cursor.ch).lastIndexOf(key) !== -1 &&
					currentLine.slice(0, cursor.ch).lastIndexOf(key) + key.length >= cursor.ch
				) {
					evt.preventDefault();

					editor.replaceRange(value[0],
						{ line: cursor.line, ch: cursor.ch - key.length },
						{ line: cursor.line, ch: cursor.ch });

					cursor = editor.getCursor();
					editor.replaceRange(value[1],
						{ line: cursor.line, ch: cursor.ch });
				}
			})
		}

	}
	private handleBackspace(evt: KeyboardEvent, editor: Editor): void {

		if (editor.getSelection() === "") {
			const cursor = editor.getCursor();
			const deletedChar = Cache.getDeletedCharacter(editor, cursor.line);
			// console.log("Deleted", deletedChar);
			// console.log(Environment.getCursorEnvironment(editor).isInlineMathjax());

			// The environments here are weird because this is only called after the character is deleted.
			// $|$ => |,
			// $$|$$ => $|$
			if (this.settings.autoCompleteDollar && 
				deletedChar === "$" &&
				(Environment.getCursorEnvironment(editor).isMarkdown() ||
					Environment.getCursorEnvironment(editor).isInlineMathjax()
				) &&
				editor.getRange(cursor, { line: cursor.line, ch: cursor.ch + 1 }) === "$") {
				editor.replaceRange("", cursor, { line: cursor.line, ch: cursor.ch + 1 });
			}
		}
	}

	private handleDollar(evt: KeyboardEvent, editor: Editor): void {
		const currentEnvironment = Environment.getCursorEnvironment(editor);
		if (currentEnvironment.isCode()) {
			return;
		}

		if (currentEnvironment.isMarkdown()) {
			// ... => ...$|$
			if (this.settings.autoCompleteDollar && editor.getSelection() == "") {
				editor.replaceRange("$", editor.getCursor());
				return;
			}
		}

		if (currentEnvironment.isInlineMathjax()) {
			const cursor = editor.getCursor();
			// $|$ => $$|$$
			if (this.settings.autoCompleteDollar && editor.getRange(
				{ line: cursor.line, ch: cursor.ch - 1 },
				{ line: cursor.line, ch: cursor.ch + 1 }
			) === "$$") {
				editor.replaceRange("$", editor.getCursor());
				return;
			}

			// $...|$ => $...$|
			if (this.settings.autoCompleteDollar && editor.getRange(
				{ line: cursor.line, ch: cursor.ch },
				{ line: cursor.line, ch: cursor.ch + 1 }
			) === "$") {
				evt.preventDefault();
				editor.setCursor(cursor.line, cursor.ch + 1);
			}
		}

		if (currentEnvironment.isMultilineMathjax()) {
			const cursor = editor.getCursor();
			// $$...|$$ => $$...$|$
			if (this.settings.autoCompleteDollar && editor.getRange(
				{ line: cursor.line, ch: cursor.ch },
				{ line: cursor.line, ch: cursor.ch + 2 }
			) === "$$") {
				evt.preventDefault();
				editor.setCursor(cursor.line, cursor.ch + 1);
				return;
			}

			// $$...$|$ => $$...$$|
			if (this.settings.autoCompleteDollar && editor.getRange(
				{ line: cursor.line, ch: cursor.ch - 1 },
				{ line: cursor.line, ch: cursor.ch + 1 }
			) === "$$") {
				evt.preventDefault();
				editor.setCursor(cursor.line, cursor.ch + 1);
				return;
			}
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {}
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }


