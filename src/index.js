import cors from "cors";
import express from "express";
import http from "http";
import { updateApp } from "./helpers/updateApp";
import routes from "./routes";

(async () => {
	await updateApp();

	setInterval(async () => {
		try {
			await updateApp();
		} catch (error) {
			console.error("Une erreur s'est produite :", error);
		}
	}, 60000);
})();

const app = express();
const port = process.env.PORT || 3000;
export const subpath = process.env.SUBPATH || "";

const server = http.createServer(app);
const serverTimeout = 120000;
server.timeout = serverTimeout;

app.use(cors());

app.use(subpath, routes);

server.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}${subpath || ""}`);
});
