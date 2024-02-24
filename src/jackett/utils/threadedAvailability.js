import PQueue from "p-queue";
import { getAvailabilityAD } from "../../helpers/getAvailabilityAD";
import { getAvailabilityPM } from "../../helpers/getAvailabilityPM";
import { getAvailabilityRD } from "../../helpers/getAvailabilityRD";
import getTorrentInfo from "./getTorrentInfo.js";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function threadedAvailability(itemList, debridApi, addonType, maxResults, maxThread) {
	if (maxThread > 1) {
		const queue = new PQueue({ concurrency: parseInt(maxThread) }); // Limite le nombre de workers à 5
		if (itemList.length !== 0) {
			const items = itemList.slice(0, parseInt(maxResults));
			const filteredItems = await Promise.all(
				items.map(async elem => {
					return await queue.add(async () => {
						let torrentInfo;
						console.log("Fetching torrent info for " + elem.title);
						torrentInfo = await getTorrentInfo(elem.link);
						if (torrentInfo === undefined) {
							console.log("Error fetching torrent info for " + elem.title);
							console.log("Retrying...");
							let tries = 0;
							while (true) {
								if (tries > 5) {
									console.log("Failed to fetch torrent info for " + elem.title);
									break;
								}
								await wait(5000);
								console.log("Retrying...");
								try {
									torrentInfo = await getTorrentInfo(elem.link);
								} catch (error) {
									torrentInfo = undefined;
								}
								if (torrentInfo !== undefined) {
									console.log("Success");
									break;
								}
								tries += 1;
							}
						}
						if (torrentInfo !== undefined) {
							const { infoHash, magnetLink } = torrentInfo;
							let availability;
							if (addonType === "alldebrid") {
								availability = await getAvailabilityAD(magnetLink, debridApi);
							} else if (addonType === "premiumize") {
								availability = await getAvailabilityPM(magnetLink, debridApi);
							} else if (addonType === "realdebrid") {
								availability = await getAvailabilityRD(infoHash, debridApi);
							}
							elem.torrentInfo = torrentInfo;
							elem.magnetLink = magnetLink;
							return { ...elem, availability }; // Ajoute l'availability à l'élément
						}
						return undefined;
					});
				}),
			);
			// Filtre les éléments en fonction de l'availability
			const finalFilteredItems = filteredItems.filter(elem => elem !== undefined);

			return finalFilteredItems;
		}

		return [];
	} else {
		if (itemList.length !== 0) {
			const items = itemList.slice(0, parseInt(maxResults));
			const filteredItems = await Promise.all(
				items.map(async elem => {
					let torrentInfo;
					console.log("Fetching torrent info for " + elem.title);
					torrentInfo = await getTorrentInfo(elem.link);
					if (torrentInfo === undefined) {
						console.log("Error fetching torrent info for " + elem.title);
						console.log("Retrying...");
						let tries = 0;
						while (true) {
							if (tries > 5) {
								console.log("Failed to fetch torrent info for " + elem.title);
								break;
							}
							await wait(5000);
							console.log("Retrying...");
							try {
								torrentInfo = await getTorrentInfo(elem.link);
							} catch (error) {
								torrentInfo = undefined;
							}
							if (torrentInfo !== undefined) {
								console.log("Success");
								break;
							}
							tries += 1;
						}
					}
					if (torrentInfo !== undefined) {
						const { infoHash, magnetLink } = torrentInfo;
						let availability;
						if (addonType === "alldebrid") {
							availability = await getAvailabilityAD(magnetLink, debridApi);
						} else if (addonType === "premiumize") {
							availability = await getAvailabilityPM(magnetLink, debridApi);
						} else if (addonType === "realdebrid") {
							availability = await getAvailabilityRD(infoHash, debridApi);
						}
						elem.torrentInfo = torrentInfo;
						elem.magnetLink = magnetLink;
						return { ...elem, availability }; // Ajoute l'availability à l'élément
					}
					return undefined;
				}),
			);
			// Filtre les éléments en fonction de l'availability
			const finalFilteredItems = filteredItems.filter(elem => elem !== undefined);

			return finalFilteredItems;
		}

		return [];
	}
}
