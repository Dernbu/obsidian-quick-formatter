import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

import QuickFormatterPlugin from '../main';


export interface FormatterPluginSettings {
	autoCompleteDollar: boolean;
	autoCompleteMathjaxPrefix: string;
	autoCompleteMathjaxEnvironment: Array<string>;
}

export const DEFAULT_SETTINGS: FormatterPluginSettings = {
	autoCompleteDollar: true,
	autoCompleteMathjaxPrefix: "\\",
	autoCompleteMathjaxEnvironment: ["align", "align*", "alignat", "alignat*", "aligned", "alignedat",
		"array", "bmatrix", "Bmatrix", "bmatrix*", "Bmatrix*", "bsmallmatrix", "Bsmallmatrix", "bsmallmatrix*",
		"Bsmallmatrix*", "cases", "cases*", "CD", "crampedsubarray", "dcases", "dcases*", "drcases", "drcases*",
		"empheq", "eqnarray", "eqnarray*", "equation", "equation*", "flalign", "flalign*", "gather", "gather*",
		"gathered", "lgathered", "matrix", "matrix*", "multline", "multline*", "multlined", "numcases", "pmatrix",
		"pmatrix*", "prooftree", "psmallmatrix", "psmallmatrix*", "rcases", "rcases*", "rgathered", "smallmatrix",
		"smallmatrix*", "split", "spreadlines", "subarray", "subnumcases", "vmatrix", "Vmatrix", "vmatrix*", "Vmatrix*",
		"vsmallmatrix", "Vsmallmatrix", "vsmallmatrix*", "Vsmallmatrix*", "xalignat", "xalignat*", "xxalignat"]
}

export class FormatterSettingsTab extends PluginSettingTab {
	plugin: QuickFormatterPlugin;

	constructor(app: App, plugin: QuickFormatterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Quick Formatter Settings.' });
		containerEl.createEl('h3', { text: 'Auto-Pair Settings.' });

		new Setting(containerEl)
			.setName('Autocomplete $')
			.setDesc('Autocomplete, and auto-delete paired $ symbols for entering/exiting MathJax mode. This setting also allows you to escape a MathJax environment by pressing $.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoCompleteDollar)
				.onChange(async (value: boolean) => {
					this.plugin.settings.autoCompleteDollar = value;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl('h3', { text: 'Auto-Format Shortcuts'})
		containerEl.createEl('h3', { text: 'Autocomplete MathJax Environments' });

		new Setting(containerEl)
			.setName('Prefix for autocompleting MathJax environments')
			.setDesc('Prefix for autocompleting MathJax enviroments. MathJax environments are autocompleted by typing {prefix}{environment}, then pressing space.')
			.addText(text => text
				.setValue(this.plugin.settings.autoCompleteMathjaxPrefix)
				.onChange(async (value: string) => {
					this.plugin.settings.autoCompleteMathjaxPrefix = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Default MathJax Environments')
			.setDesc('Mathjax environments are autocompleted to \\begin{env}\\end{env}. To delete an environment, delete an environment name.')
			.addTextArea(text => text
				.setValue(this.plugin.settings.autoCompleteMathjaxEnvironment.join("; "))
				.onChange(async (value: string) => {
					this.plugin.settings.autoCompleteMathjaxEnvironment = value.split(/;[\w]{0,}/);
					await this.plugin.saveSettings();

				})
			);

	}
}