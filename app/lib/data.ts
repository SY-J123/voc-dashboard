import fs from "node:fs/promises";
import path from "node:path";

import { generateMockReviews } from "./mock";
import type { ClassifiedReview } from "./types";

const DATA_PATH = path.join(
  process.cwd(),
  "..",
  "data",
  "classified_reviews.json",
);

const USE_MOCK = process.env.VOC_USE_MOCK !== "0";

export async function loadClassifiedReviews(): Promise<ClassifiedReview[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as ClassifiedReview[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return USE_MOCK ? generateMockReviews() : [];
    }
    throw err;
  }
}
