import {
	App,
	MarkdownView,
	SuggestModal,
	Plugin,
	PluginSettingTab,
	Setting,
	Debouncer, TFile
} from 'obsidian';

// Remember to rename these classes and interfaces!
import {FileSuggestionComponent} from "obsidian-file-suggestion-component";

import {OpenAlex, ResearchPaper} from './src/openalex'

import {PcDataset, PcMethod, PapersWithCode} from './src/paperswithcode';

interface MetadataPreferences {
	ids: boolean;
	keywords: boolean;
	abstract: boolean;
	authors: boolean;
	methods: boolean;
	datasets: boolean;

	[key: string]: boolean;
}

interface ResearchAssistantPluginSettings {
	mySetting: string;
	polite_email: string
	paper_folder: string
	overwrite_flag: boolean
	metadata_preferences: MetadataPreferences

}

const DEFAULT_SETTINGS: ResearchAssistantPluginSettings = {
	mySetting: 'default',
	polite_email: "",
	paper_folder: "ResearchAssistant/papers",
	overwrite_flag: false,
	metadata_preferences: {
		ids: true,
		keywords: true,
		abstract: true,
		authors: true,
		methods: true,
		datasets: true
	}
}

export class ResearchPaperSuggestionModal extends SuggestModal<object> {
	// Returns all available suggestions.
	results: object[];
	onSubmit: (result: object) => void;
	debouncedUserAction: Debouncer<[url: any], Promise<any>>;
	private debouncedGetSuggestions: any;

	debounce(func: { (query: string): Promise<any>; apply?: any; }, wait: number | undefined) {
		let timeout: string | number | NodeJS.Timeout | undefined;
		return function (...args: any) {
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			const context = this;
			clearTimeout(timeout);
			return new Promise((resolve) => {
				timeout = setTimeout(() => resolve(func.apply(context, args)), wait);
			});
		};
	}

	constructor(app: App, onSubmit: (result: object) => void) {
		super(app);
		this.onSubmit = onSubmit;
		// this.getSuggestions = debounce(this.getSuggestions, 500, false).run
		this.debouncedGetSuggestions = this.debounce(this.getSuggestionsImpl, 500);
	}

	onOpen() {
		// console.log("inside onOpen");
		super.onOpen();
	}

	async getSuggestions(query: string) {
		if (query.length === 0) {
			return [];
		}
		const results = this.debouncedGetSuggestions(query)
		return results

	}

	async getSuggestionsImpl(query: string) {
		const url = "https://api.openalex.org/autocomplete/works?q=" + query
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const res = await response.json();
		return res.results

	}

	// Renders each suggestion item.
	renderSuggestion(paper: ResearchPaper, el: HTMLElement) {
		el.createEl("div", {text: paper.display_name});
		el.createEl("small", {text: paper.hint ? paper.hint : ""});
		el.createEl("small", {text: paper.cited_by_count ? " | citations: " + paper.cited_by_count : ""});
	}


	onChooseSuggestion(paper: ResearchPaper, evt: MouseEvent | KeyboardEvent) {
		this.onSubmit(paper);
	}


}


export default class ResearchAssistantPlugin extends Plugin {
	settings: ResearchAssistantPluginSettings;


	async createPaperNoteById(id: string) {
		// console.log("create paper note here: " + id)
		const oa: OpenAlex = new OpenAlex(this.settings.polite_email)
		const paper = await oa.oaGetPaperById(id)
		// get paperswithcode data
		const pc: PapersWithCode = new PapersWithCode()
		const pc_paper = await pc.getPaperByTitle(paper.display_name)
		if (pc_paper) {
			paper.ids.paperswithcode = pc_paper.id
			paper.pdf_url = pc_paper.conference_url_pdf ? pc_paper.conference_url_pdf : pc_paper.url_pdf
			paper.methods = await pc.getMethodsByPaperId(pc_paper.id)
			paper.datasets = await pc.getDatasetsByPaperId(pc_paper.id)
		}
		// console.log(paper)
		// create paper note
		// clean paper_name for valid filename
		const paper_name = paper.display_name.replace(/[^a-zA-Z0-9]/g, "_")
		const path = this.settings.paper_folder + "/" + paper_name + ".md"
		// eslint-disable-next-line
		let paper_file = this.app.vault.getFileByPath(path)
		if (paper_file) {
			// console.log(this.settings.metadata_preferences)
			this.updateFrontMatter(paper_file, paper, () => {
				if (this.settings.metadata_preferences.abstract) {
					this.app.vault.append(<TFile>paper_file, paper.abstract)

				}

				if (this.settings.metadata_preferences.datasets && paper.datasets) {
					const dataset_base_url = "https://paperswithcode.com/dataset"
					const datasets_strings = paper.datasets.map((dataset: PcDataset) => {
						const dataset_name = dataset.full_name ? dataset.full_name : dataset.name
						return "[" + dataset_name + "](" + dataset_base_url + "/" + dataset.id + ") "
					})
					this.app.vault.append(<TFile>paper_file, "\n\n**Datasets:** " + datasets_strings.join(", "))
				}

				if (this.settings.metadata_preferences.methods && paper.methods) {
					const method_base_url = "https://paperswithcode.com/dataset"
					const method_strings = paper.methods.map((method: PcMethod) => {
						const method_name = method.full_name ? method.full_name : method.name
						return "[" + method_name + "](" + method_base_url + "/" + method.id + ") "
					})
					this.app.vault.append(<TFile>paper_file, "\n\n**Methods:** " + method_strings.join(", "))
				}

				this.app.workspace.getLeaf('tab').openFile(<TFile>paper_file)
			})
		} else {
			// @ts-ignore
			const new_file = await this.app.vault.create(this.settings.paper_folder + "/" + paper_name + ".md", "")
			if (!new_file) {
				console.error("failed to create file")
				return
			}
			this.updateFrontMatter(new_file, paper, () => {
				this.app.vault.append(<TFile>new_file, paper.abstract)
				this.app.workspace.getLeaf('tab').openFile(new_file)

			})
		}

		// {} = paper
	}

	async onload() {
		await this.loadSettings();
		this.addCommand({
			id: 'search-paper',
			name: 'Search paper',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						const modal: ResearchPaperSuggestionModal = new ResearchPaperSuggestionModal(this.app, async (result) => {
							// console.log(result)
							// @ts-ignore
							const id = result.id.split("/").last()
							await this.createPaperNoteById(id)
						});
						modal.open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ResearchAssistantSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	prepare_front_matter(paper: object) {
		const entity_props = {}
		const properties_of_interest = ["id", "display_name", "pdf_url", "publication_year", "keywords", "ids", "authors"]
		for (const [key, value] of Object.entries(paper)) {
			if (!properties_of_interest.includes(key)) {
				continue
			}
			if (typeof value == "string") {
				// @ts-ignore
				entity_props[key] = value
				// property_string += key + ": " + value + "\n"
			} else if (Array.isArray(value)) {
				// @ts-ignore
				if (key == "authors") {
					// @ts-ignore
					entity_props["author_ids"] = value.map((item) => {
						// @ts-ignore
						return item.hasOwnProperty("id") ? item["id"] : ""
					})

					// @ts-ignore
					entity_props["author_names"] = value.map((item) => {
						// @ts-ignore
						return item.hasOwnProperty("display_name") ? item["display_name"] : ""
					})
				} else if (key == "keywords") {
					// @ts-ignore
					entity_props["keywords"] = value.map((item) => {
						// @ts-ignore
						return item.hasOwnProperty("display_name") ? item["display_name"] : item
					})
				}
			} else if (value && typeof (value) == "object") {
				for (const [key2, value2] of Object.entries(value)) {
					// @ts-ignore
					entity_props[key2] = value2 //property_string += key2 + ": " + value2 + "\n"
				}
			}
		}
		return entity_props
	}

	async updateFrontMatter(file: TFile, paper: object, callback: () => void) {
		const overwrite_flag = true //this.settings.overwriteFlag
		for (const [key] of Object.entries(paper)) {
			if (this.settings.metadata_preferences.hasOwnProperty(key) && !this.settings.metadata_preferences[key]) {
				// @ts-ignore
				delete paper[key]
			}
		}

		const entity_props = this.prepare_front_matter(paper)

		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			// set property if it doesn't exist or if overwrite flag is set
			// console.log(frontmatter)
			for (const [key, value] of Object.entries(entity_props)) {
				if (!frontmatter.hasOwnProperty(key) || overwrite_flag) {
					frontmatter[key] = value
				}
			}
			callback()
		})
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}
//
// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}
//
// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }
//
class ResearchAssistantSettingTab extends PluginSettingTab {
	plugin: ResearchAssistantPlugin;

	constructor(app: App, plugin: ResearchAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Polite email")
			.setDesc("Adding email to openalex API requests(for faster and more consistent response times)")
			.addText((text) =>
				text
					.setPlaceholder("Enter email here")
					.setValue(this.plugin.settings.polite_email)
					.onChange(async (value) => {
						this.plugin.settings.polite_email = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName("Overwrite existing properties")
			.setDesc("If checked, existing properties will be overwritten")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.overwrite_flag)
					.onChange(async (value) => {
						this.plugin.settings.overwrite_flag = value;
						await this.plugin.saveSettings();
					}));

		containerEl.createEl("h2", {text: "Research paper notes"});

		const saveLoc = new Setting(containerEl)
			.setName('Papers folder')
			.setDesc('Folder to store paper notes');

		new FileSuggestionComponent(saveLoc.controlEl, this.app)
			.setValue(this.plugin.settings.paper_folder)
			.setPlaceholder(DEFAULT_SETTINGS.paper_folder)
			.setFilter("folder")
			.setLimit(10)
			.onSelect(async (val: TFile) => {
				this.plugin.settings.paper_folder = val.path;
				await this.plugin.saveSettings();
			});
		// add toggle
		containerEl.createEl("h3", {text: "Metadata preferences"});
		// add checkbox
		new Setting(containerEl)
			.setName("Ids")
			.setDesc("If checked, ids(mag, openalex,doi) will be added to metadata")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.metadata_preferences.ids)
					.onChange(async (value) => {
						this.plugin.settings.metadata_preferences.ids = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName("Authors")
			.setDesc("If checked, authors info will be added to metadata")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.metadata_preferences.authors)
					.onChange(async (value) => {
						this.plugin.settings.metadata_preferences.authors = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName("Abstract")
			.setDesc("If checked, abstract will be added to the note")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.metadata_preferences.abstract)
					.onChange(async (value) => {
						this.plugin.settings.metadata_preferences.abstract = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName("Keywords")
			.setDesc("If checked, keywords will be added to metadata")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.metadata_preferences.keywords)
					.onChange(async (value) => {
						this.plugin.settings.metadata_preferences.keywords = value;
						await this.plugin.saveSettings();
					}));
		// add checkbox
		new Setting(containerEl)
			.setName("Datasets")
			.setDesc("If checked, datasets will be added to the note")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.metadata_preferences.datasets)
					.onChange(async (value) => {
						this.plugin.settings.metadata_preferences.datasets = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName("Methods")
			.setDesc("If checked, methods will be added to the note")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.metadata_preferences.methods)
					.onChange(async (value) => {
						this.plugin.settings.metadata_preferences.methods = value;
						await this.plugin.saveSettings();
					}));
	}
}
