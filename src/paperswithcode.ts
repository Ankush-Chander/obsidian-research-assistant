import {requestUrl} from "obsidian";

export interface PcPaper {
	id: string;
	title: string;
	abstract: string;
	authors: string;
	published: string;
	conference: string;
	conference_url_abs: string;
	conference_url_pdf: string;
	proceeding: string;
}

export interface PcDataset {
	id: string;
	name: string;
	full_name: string;
	url: string;
}

export interface PcMethod {
	id: string;
	name: string;
	full_name: string;
	description: string;
	paper: string;
}

export class PapersWithCode {
	base_url = "https://paperswithcode.com/api/v1"

	async getPaperByTitle(title: string) {
		const url = this.base_url + "/papers?title=" + encodeURIComponent(title)
		const response = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		const res = await response.json
		if (res.results.length == 0) {
			return null
		}
		return res.results[0]
	}

	async getDatasetsByPaperId(id: string) {
		const url = this.base_url + "/papers/" + id + "/datasets"
		const response = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		const res = await response.json
		return res.results
	}

	async getMethodsByPaperId(id: string) {
		const url = this.base_url + "/papers/" + id + "/methods"
		const response = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		const res = await response.json
		return res.results
	}

}
