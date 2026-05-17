import { getGeminiKey, getItems, Item, saveItem, deleteItem } from "./storage";

export interface ExtractionResult {
  action: "add" | "remove";
  name: string;
  location?: string;
  type?: "perishable" | "consumable" | "non-perishable";
  tags?: string[];
  notes?: string;
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
        generationConfig: {
          temperature: 0.1, // Keep it deterministic
        }
      }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message || `API Error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Failed to parse response from Gemini");
  }

  return text;
}

export async function processItemStatement(userInput: string): Promise<{ result: ExtractionResult, item?: Item }> {
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
  
  // Clean up any markdown blocks if the model didn't listen
  responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  let result: ExtractionResult;
  try {
    result = JSON.parse(responseText);
  } catch (err) {
    throw new Error("Failed to parse structured data from Gemini response");
  }

  // App-side logic
  if (result.action === "add") {
    const existingIndex = existingItems.findIndex(i => i.name.toLowerCase() === result.name.toLowerCase());
    const timestamp = new Date().toISOString();
    
    let itemToSave: Item;
    if (existingIndex >= 0) {
      itemToSave = {
        ...existingItems[existingIndex],
        location: result.location || existingItems[existingIndex].location,
        type: result.type || existingItems[existingIndex].type,
        tags: result.tags?.length ? result.tags : existingItems[existingIndex].tags,
        notes: result.notes || existingItems[existingIndex].notes,
        originalText: userInput,
        updatedAt: timestamp,
      };
    } else {
      itemToSave = {
        id: crypto.randomUUID(),
        name: result.name,
        location: result.location || "unknown",
        type: result.type || "non-perishable",
        tags: result.tags || [],
        notes: result.notes || "",
        originalText: userInput,
        updatedAt: timestamp,
      };
    }
    
    saveItem(itemToSave);
    return { result, item: itemToSave };
  } else {
    // Remove action
    const match = existingItems.find(i => i.name.toLowerCase() === result.name.toLowerCase());
    if (match) {
      deleteItem(match.id);
      return { result, item: match };
    }
    return { result };
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
