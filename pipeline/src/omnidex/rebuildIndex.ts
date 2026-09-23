import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildOmnidexIndex } from "./build.js";
import type { OmnidexEventBundle } from "./cache.js";

const dataDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/omnidex");
const eventsDirectory = path.join(dataDirectory, "events");
const outputPath = path.join(dataDirectory, "index.json");
const eventFiles = (await readdir(eventsDirectory)).filter((file) => file.endsWith(".json"));
const bundles = await Promise.all(
  eventFiles.map(async (file) => JSON.parse(await readFile(path.join(eventsDirectory, file), "utf8")) as OmnidexEventBundle),
);
const { index } = await buildOmnidexIndex(bundles);
await writeFile(outputPath, JSON.stringify(index), "utf8");

console.log(
  `omnidex index: ${index.events.length} events; ${index.events.filter((event) => event.participantNames?.length).length} with participants; ${index.events.filter((event) => event.championNames?.length).length} with champions`,
);
