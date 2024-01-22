import helper from "../helper.js";
import getTorrentInfo from "./utils/getTorrentInfo.js";
import processXML from "./utils/processXML.js";

async function getItemsFromUrl(url) {
	const res = await fetch(url);

	const items = await processXML(await res.text());

	return items;
}

export default async function jackettSearch(debridApi, jackettHost, jackettApiKey, addonType, searchQuery) {
	try {
		const { episode, name, season, type } = searchQuery;
		const isSeries = type === "series";
		const torrentAddon = addonType === "torrent";

		console.log("Searching on Jackett...");
		console.log(`Will return ${!torrentAddon ? "Debrid link" : "Torrents"}.`);

		let searchUrl = `${jackettHost}/api/v2.0/indexers/all/results/torznab/api?apikey=${jackettApiKey}&cat=${
			isSeries ? 5000 : 2000
		}&q=${encodeURIComponent(name)}${isSeries ? `+S${season}E${episode}` : ""}`;

		const results = [];

		let items = await getItemsFromUrl(searchUrl);
		for (const [index, item] of items.entries()) {
			if (torrentAddon && index >= 5) {
				break;
			}

			console.log("Getting torrent info...");
			const torrentInfo = await getTorrentInfo(item.link);
			console.log(`Torrent info: ${item.title}`);

			if (!torrentAddon) {
				console.log("Getting RD link...");

				const downloadLink = await helper.getMovieRDLink(torrentInfo.magnetLink, debridApi);
				results.push({
					name: "Jackett Debrid",
					title: `${item.title}\r\n📁${helper.toHomanReadable(item.size)}`,
					url: downloadLink,
				});

				break;
			}

			torrentInfo.seeders = item.seeders;
			torrentInfo.title = `${item.title}\r\n👤${item.seeders} 📁${helper.toHomanReadable(item.size)}`;
			if (!isSeries) {
				delete torrentInfo.fileIdx;
			}

			results.push(torrentInfo);
			console.log(`Added torrent to results: ${item.title}`);
		}

		// Try again without episode
		if (isSeries && results.length === 0) {
			if (torrentAddon) {
				console.log("No results found with season/episode. Trying without...");
				console.log("Searching on Jackett...");
			}

			searchUrl = `${jackettHost}/api/v2.0/indexers/all/results/torznab/api?apikey=${jackettApiKey}&cat=5000&q=${encodeURIComponent(
				searchQuery.name,
			)}+S${searchQuery.season}`;

			items = await getItemsFromUrl(searchUrl);
			for (const item of items) {
				const torrentInfo = await getTorrentInfo(item.link);

				if (!torrentAddon) {
					const url = await helper.getMovieRDLink(
						torrentInfo.magnetLink,
						debridApi,
						`S${searchQuery.season}E${searchQuery.episode}`,
					);

					results.push({
						name: "Jackett Debrid",
						title: `${item.title}\r\n📁${helper.toHomanReadable(item.size)}`,
						url,
					});

					break;
				}

				console.log("Getting torrent info...");
				console.log(`Torrent info: ${item.title}`);

				torrentInfo.seeders = item.seeders;
				torrentInfo.title = `${item.title}\r\n👤${item.seeders} 📁${helper.toHomanReadable(item.size)}`;

				console.log("Determining episode file...");
				torrentInfo.fileIdx = parseInt(
					helper.selectBiggestFileSeasonTorrent(
						torrentInfo.files,
						`S${searchQuery.season}E${searchQuery.episode}`,
					),
					10,
				);
				console.log("Episode file determined.");

				results.push(torrentInfo);
				console.log(`Added torrent to results: ${item.title}`);
			}
		}

		if (results.length === 0) {
			console.log("No results found.");

			results.push({ name: "Jackett", title: "No results found", url: "#" });
		}

		return results;
	} catch (e) {
		console.error(e);

		return [{ name: "Jackett", title: "No results found", url: "#" }];
	}
}
