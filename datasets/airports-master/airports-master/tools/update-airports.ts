import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiUrl = process.env.API_URL || "https://api.aerodb.net";
const apiKey = process.env.API_KEY;
const limit = 100;
const maxConcurrency = 5;
const sortParam = Buffer.from(
  JSON.stringify([{ name: "asc" }, { id: "asc" }])
).toString("base64");

if (!apiKey) {
  console.error("API_KEY is not set in environment variables.");
  process.exit(1);
}

type Airport = Record<string, unknown>;

type AirportResponse = {
  items: Airport[];
  count: number;
  totalCount: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildAirportsUrl(offset: number): string {
  const url = new URL(`${apiUrl.replace(/\/$/, "")}/airports`);
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("offset", offset.toString());
  url.searchParams.set("sort", sortParam);

  if (apiKey) {
    url.searchParams.set("apiKey", apiKey);
  }

  return url.toString();
}

async function fetchAirportPage(offset: number): Promise<AirportResponse> {
  const response = await fetch(buildAirportsUrl(offset));

  if (!response.ok) {
    throw new Error(
      `Failed to fetch airports (offset ${offset}): ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<AirportResponse>;
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function bumpPackageVersion(pkgPath: string): Promise<void> {
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { version?: string };

  const [major, minor, patch] = (pkg.version || "0.0.0").split(".").map(Number);
  if ([major, minor, patch].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid version in package.json: ${pkg.version}`);
  }

  const newVersion = `${major}.${minor}.${patch + 1}`;
  pkg.version = newVersion;

  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log(`package.json version bumped to ${newVersion}`);
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
}

function toCsv(airports: Airport[]): string {
  if (airports.length === 0) return "";

  const headers = Object.keys(airports[0]);
  const lines = [headers.join(",")];

  for (const airport of airports) {
    const row = headers.map((key) => csvValue(airport[key]));
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

function omitUpdatedAt(airports: Airport[]): Airport[] {
  return airports.map((airport) => {
    const { updatedAt, ...rest } = airport;
    return rest;
  });
}

async function fetchAllAirports(): Promise<Airport[]> {
  console.log(`Fetching airports in batches of ${limit} (max ${maxConcurrency} concurrent)...`);

  const firstPage = await fetchAirportPage(0);
  const totalPages = Math.ceil(firstPage.totalCount / limit);

  console.log(
    `Found ${firstPage.totalCount} airports across ${totalPages} pages.`
  );

  const pages: { offset: number; items: Airport[] }[] = [
    { offset: 0, items: firstPage.items },
  ];

  const offsets: number[] = [];
  for (let page = 1; page < totalPages; page++) {
    offsets.push(page * limit);
  }

  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const offset = offsets[nextIndex++];
      if (offset === undefined) return;

      const page = await fetchAirportPage(offset);
      pages.push({ offset, items: page.items });
      console.log(`Fetched ${page.count} airports at offset ${offset}.`);
    }
  };

  const workers = Array.from(
    { length: Math.min(maxConcurrency, offsets.length) },
    () => worker()
  );

  await Promise.all(workers);

  pages.sort((a, b) => a.offset - b.offset);
  const airports = pages.flatMap((page) => page.items);

  if (airports.length !== firstPage.totalCount) {
    console.warn(
      `Warning: expected ${firstPage.totalCount} airports but fetched ${airports.length}.`
    );
  }

  return airports;
}

async function updateAirports() {
  try {
    const airports = omitUpdatedAt(await fetchAllAirports());

    const jsonPath = path.resolve(__dirname, "..", "airports.json");
    const csvPath = path.resolve(__dirname, "..", "airports.csv");
    const pkgPath = path.resolve(__dirname, "..", "package.json");

    const newJson = JSON.stringify(airports, null, 2);
    const newCsv = toCsv(airports);

    const currentJson = await readFileIfExists(jsonPath);
    const currentCsv = await readFileIfExists(csvPath);

    const jsonChanged = currentJson !== newJson;
    const csvChanged = currentCsv !== newCsv;
    const hasChanges = jsonChanged || csvChanged;

    if (!hasChanges) {
      console.log("No data changes detected. Skipping file write and version bump.");
      return;
    }

    await fs.writeFile(jsonPath, newJson, "utf8");
    await fs.writeFile(csvPath, newCsv, "utf8");
    await bumpPackageVersion(pkgPath);

    console.log(`Updated ${jsonPath} and ${csvPath}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updateAirports();
