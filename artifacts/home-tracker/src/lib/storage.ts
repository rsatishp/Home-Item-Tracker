export interface Item {
  id: string;
  name: string;
  location: string;
  type: "perishable" | "consumable" | "non-perishable";
  tags: string[];
  notes: string;
  originalText: string;
  updatedAt: string;
}

const ITEMS_KEY = "home-tracker-items";
const GEMINI_KEY = "home-tracker-gemini-key";

const VALID_TYPES = new Set(["perishable", "consumable", "non-perishable"]);

function normalizeItem(raw: unknown): Item | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!r.id || !r.name || typeof r.id !== "string" || typeof r.name !== "string") return null;
  return {
    id: r.id,
    name: String(r.name),
    location: typeof r.location === "string" && r.location ? r.location : "unknown",
    type: VALID_TYPES.has(r.type as string)
      ? (r.type as Item["type"])
      : "non-perishable",
    tags: Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === "string") : [],
    notes: typeof r.notes === "string" ? r.notes : "",
    originalText: typeof r.originalText === "string" ? r.originalText : "",
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt
        ? r.updatedAt
        : new Date().toISOString(),
  };
}

export function getItems(): Item[] {
  try {
    const data = localStorage.getItem(ITEMS_KEY);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter((i): i is Item => i !== null);
  } catch (err) {
    console.error("Failed to parse items from local storage", err);
    return [];
  }
}

export function saveItem(item: Item): void {
  const items = getItems();
  const existingIndex = items.findIndex((i) => i.id === item.id);
  
  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.push(item);
  }
  
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export function deleteItem(id: string): void {
  const items = getItems();
  const filtered = items.filter((i) => i.id !== id);
  localStorage.setItem(ITEMS_KEY, JSON.stringify(filtered));
}

export function exportJSON(): void {
  const items = getItems();
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = "items.json";
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importJSON(file: File): Promise<Item[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (!Array.isArray(parsed)) {
          throw new Error("Invalid format: expected an array of items");
        }
        
        const normalized = parsed
          .map(normalizeItem)
          .filter((i): i is Item => i !== null);
        if (normalized.length === 0 && parsed.length > 0) {
          throw new Error("No valid items found in file");
        }
        localStorage.setItem(ITEMS_KEY, JSON.stringify(normalized));
        resolve(normalized);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function getGeminiKey(): string | null {
  return localStorage.getItem(GEMINI_KEY);
}

export function saveGeminiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY, key);
}
