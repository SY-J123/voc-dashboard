import fs from "node:fs/promises";
import path from "node:path";

import type { ClassifiedReview } from "./types";

const DATA_PATH = path.join(
  process.cwd(),
  "..",
  "data",
  "classified_reviews.json",
);

export async function loadClassifiedReviews(): Promise<ClassifiedReview[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as ClassifiedReview[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}
