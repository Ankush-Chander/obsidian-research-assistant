# Research Assistant

Research Assistant is an Obsidian plugin that helps you search/link and work on scholarly articles more effectively.

### Usage

This plugin has two commands:

1. X
2. Y

### Demo
Enter demo here
[//]: # (![Research Assistant demo]&#40;demo/research_assistant.gif&#41;)

### How it works

Plugins uses [OpenAlex](https://docs.openalex.org/) api to search for research papers.


### Installation

#### From github

1. Go to the [Releases](https://github.com/Ankush-Chander/obsidian-research-assistant/releases) page.
2. Download the latest obsidian-research-assistant-${version}.zip.
3. Extract its contents.
4. Move the contents into /your-vault/.obsidian/plugins/research-assistant-linker/.
5. Enable the plugin in Obsidian:
	- Open Obsidian, go to Settings > Community Plugins.
	- Make sure Restricted mode is off.
	- Search installed plugins for research-assistant.
	- Click Enable.

#### From within Obsidian

You can install this plugin within Obsidian by doing the following:

1. Open Settings > Community plugins.
2. Make sure Restricted mode is off.
3. Click Browse.
4. Search for Research Assistant.
5. Click Install.
6. Once installed, click Enable.

[//]: # (### Changelog)

### For development

#### Compilation

1. Clone this repo inside path/to/your/dev/vault/.obsidian/plugins.
2. npm i or yarn to install dependencies
3. npm run build to compile, or npm run dev to start compilation in watch mode.



### Roadmap

- [x] First release
- [ ] Add paper search

### FAQs

1. **Why is email(optional) asked in settings?**  
   We use OpenAlex API for fetching metadata. Their API is rate limited. If you add your email in the request, your
   requests goes
   into [polite pool](https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication#the-polite-pool) which
   has much faster and more consistent response times.

### Recommendations

### Acknowledgement

1. Thanks to [OpenAlex](https://openalex.org/) team for providing free for use API over scholarly works.
2. Thanks to [Obsidian](htts://obsidian.md]) team for upholding malleability in the product that allows people to add
   and share new features without hassle.
