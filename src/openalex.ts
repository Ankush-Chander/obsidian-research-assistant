import * as _ from 'lodash';
import {requestUrl} from "obsidian";

interface Ids {
	"openalex": string
	"doi": string
	"mag": string
}

interface Author {
	id: string
	display_name: string
	orcid: string
}

export interface ResearchPaper {
	id: string;
	display_name: string;
	hint: string;
	ids: Ids
	authors: Author[]
	abstract_inverted_index?: object
	abstract: string
	authorships?: object[]
	// more to be added
}


export class OpenAlex {
	base_url = "https://api.openalex.org"
	private polite_email: string;

	constructor(polite_email: string) {
		this.polite_email = polite_email

	}

	convertInvertedIndexToText(invertedIndex: object) {
    // Find the maximum index to determine the length of the text array
    let maxIndex = 0;
    for (const positions of Object.values(invertedIndex)) {
        maxIndex = Math.max(maxIndex, ...positions);
    }

    // Create an array to hold the words at their respective positions
    const textArray = new Array(maxIndex + 1);

    // Populate the array with words at their positions
    for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
            textArray[pos] = word;
        }
    }

    // Join the array into a string with spaces and return
    return textArray.join(' ');
}


	formatResearchPaper(paper_response: ResearchPaper) {
		// console.log(paper_response)

		const result = _.pick(paper_response, ['id', 'display_name', 'ids', 'authors','authorships', 'abstract_inverted_index', 'abstract']);
		// console.log(result)
		result.abstract = this.convertInvertedIndexToText(result.abstract_inverted_index? result.abstract_inverted_index : {})
		result.authors = result.authorships ? result.authorships.map((author:object) => {
			// @ts-ignore
			return author["author"];
		}): []
		delete result.abstract_inverted_index
		delete result.authorships
		// console.log(result)
		return result
		// {} = paper
	}

	async oaGetPaperById(id: string) {
		let url = this.base_url + "/works/" + id
		if (this.polite_email) {
			url += "?mailto=" + this.polite_email
		}
		const response = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		let result = await response.json
		result = this.formatResearchPaper(result)
		return result
	}
}
