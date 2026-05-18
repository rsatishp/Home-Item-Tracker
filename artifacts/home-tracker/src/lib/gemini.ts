import { getGeminiKey, getItems, Item, saveItem, deleteItem } from "./storage";

export interface ExtractionResult {
  action: "add" | "remove";
  name: string;
  location: string;
  type: "perishable" | "consumable" | "non-perishable";
  tags: string[];
  notes: string;
}

export interface ApplyResult {
  action: "added" | "updated" | "removed" | "not-found";
  item?: Item;
}

export async function generateContent(prompt: string): Promise<string> {
  const key = getGeminiKey();
  if (!key) {
    throw new Error("Gemini API key is not set");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `API Error: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Failed to parse response from Gemini");
  return text;
}

/**
 * Pure extraction step — calls Gemini and returns parsed result.
 * Does NOT mutate storage. Call applyExtraction() to commit.
 */
export async function extractItemInfo(userInput: string): Promise<ExtractionResult> {
  const existingItems = getItems();

  const prompt = `You are a home item tracker. The user has entered a natural language statement
about a household item. Extract structured information and return ONLY valid JSON
in this exact format — no explanation, no markdown, just JSON:

{
  "action": "add" | "remove",
  "name": "<canonical item name, lowercase>",
  "location": "<where the item is stored>",
  "type": "perishable" | "consumable" | "non-perishable",
  "tags": ["<tag1>", "<tag2>"],
  "notes": "<any useful extra context, or empty string>"
}

Rules:

1. action: Use "remove" if the user indicates they have run out of, used up,
   consumed, no longer have, or finished the item. Use "add" for everything else.

2. name: Use a clean, lowercase canonical name (e.g. "roasted rava", "olive oil",
   "passport"). Be consistent — use the same name a future remove statement
   would naturally use.

3. location: Use the location the user stated. If no location is given for a
   food or grocery item, infer it:
   - Needs refrigeration (dairy, eggs, fresh meat, fresh fish, fresh produce,
     opened condiments, cooked leftovers) → "refrigerator"
   - Frozen items → "freezer"
   - Dry goods, grains, flours, canned goods, spices, oils, snacks → "pantry"
   For non-perishable or consumable items with no stated location → "unknown"

4. type: Classify into one of three categories:
   - "perishable" — food and beverages (groceries, fresh produce, dairy, etc.)
   - "consumable" — non-food items that get used up over time (lubricants, glue,
     batteries, cleaning supplies, toiletries, stationery, tape, paint, etc.)
   - "non-perishable" — durable items that do not get used up (documents, keys,
     electronics, tools, clothing, furniture accessories, etc.)

5. tags: Include 1-3 short descriptive tags, e.g. ["grocery", "dairy"],
   ["dry goods"], ["document", "important"].

Examples:
- "I have roasted rava in the pantry"
  → action: add, name: roasted rava, location: pantry, type: perishable
- "we have run out of roasted rava"
  → action: remove, name: roasted rava, type: perishable
- "I bought some milk"
  → action: add, name: milk, location: refrigerator, type: perishable
- "I put my passport in the blue folder in the study"
  → action: add, name: passport, location: blue folder in the study, type: non-perishable
- "I've used the last of the olive oil"
  → action: remove, name: olive oil, type: perishable
- "There is a tube of super glue in the junk drawer"
  → action: add, name: super glue, location: junk drawer, type: consumable
- "We've run out of WD-40"
  → action: remove, name: wd-40, type: consumable

User input: "${userInput.replace(/"/g, '\\"')}"
Current items in storage (for context): ${JSON.stringify(existingItems)}`;

  let responseText = await generateContent(prompt);
  responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

  let result: ExtractionResult;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error("Failed to parse structured data from Gemini response");
  }

  return {
    action: result.action,
    name: result.name || "",
    location: result.location || "unknown",
    type: result.type || "non-perishable",
    tags: Array.isArray(result.tags) ? result.tags : [],
    notes: result.notes || "",
  };
}

/**
 * Compute a fuzzy similarity score between two strings (0–1).
 * Uses token overlap (Jaccard similarity) with a substring bonus.
 */
function fuzzyScore(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  const na = norm(a);
  const nb = norm(b);

  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const tokensA = new Set(na.split(/\s+/).filter(Boolean));
  const tokensB = new Set(nb.split(/\s+/).filter(Boolean));
  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Find the best-matching item by fuzzy name search.
 * Returns the item if score >= threshold, otherwise null.
 */
function findBestMatch(name: string, items: Item[], threshold = 0.5): Item | null {
  let bestScore = 0;
  let bestItem: Item | null = null;

  for (const item of items) {
    const score = fuzzyScore(name, item.name);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore >= threshold ? bestItem : null;
}

/**
 * Commit an extraction result to storage.
 * Call this AFTER the user confirms the parsed result in the UI.
 */
export function applyExtraction(result: ExtractionResult, userInput: string): ApplyResult {
  const existingItems = getItems();
  const timestamp = new Date().toISOString();

  if (result.action === "add") {
    // Exact case-insensitive match for add/update to avoid false overwrites
    const existing = existingItems.find(
      (i) => i.name.toLowerCase() === result.name.toLowerCase()
    ) ?? null;
    const isUpdate = !!existing;

    const itemToSave: Item = existing
      ? {
          ...existing,
          location: result.location || existing.location,
          type: result.type || existing.type,
          tags: result.tags.length ? result.tags : existing.tags,
          notes: result.notes || existing.notes,
          originalText: userInput,
          updatedAt: timestamp,
        }
      : {
          id: crypto.randomUUID(),
          name: result.name,
          location: result.location || "unknown",
          type: result.type || "non-perishable",
          tags: result.tags,
          notes: result.notes,
          originalText: userInput,
          updatedAt: timestamp,
        };

    saveItem(itemToSave);
    return { action: isUpdate ? "updated" : "added", item: itemToSave };
  } else {
    const match = findBestMatch(result.name, existingItems, 0.5);
    if (match) {
      deleteItem(match.id);
      return { action: "removed", item: match };
    }
    return { action: "not-found" };
  }
}

export async function askQuestion(userQuery: string): Promise<string> {
  const existingItems = getItems();

  const prompt = `You are a home item tracker assistant. The user wants to find something.
Answer their question using only the items listed below. Be concise and specific.

If the item is found, state its location clearly.

If the item is NOT in the list:
- If it is a perishable (food, grocery, beverage), say it has likely been used
  up or run out, since perishables are removed from the list when finished.
- If it is a consumable (lubricant, glue, cleaning supply, toiletry, battery,
  stationery, or any non-food item that gets used up), say it may have run out
  or been used up, since consumables are removed from the list when finished.
- If it is a non-perishable (document, key, device, clothing, tool), say its
  location has not been recorded yet.
- If you are unsure of the type, use your general knowledge to make a reasonable
  guess (e.g. "milk" is perishable, "wd-40" is consumable, "passport" is
  non-perishable).

Items: ${JSON.stringify(existingItems)}

Question: "${userQuery.replace(/"/g, '\\"')}"`;

  return generateContent(prompt);
}
