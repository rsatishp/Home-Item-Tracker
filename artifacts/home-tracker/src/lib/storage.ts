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

export function getItems(): Item[] {
  try {
    const data = localStorage.getItem(ITEMS_KEY);
    return data ? JSON.parse(data) : [];
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
        
        // Basic validation
        const validItems = parsed.filter(i => i && typeof i === 'object' && i.id && i.name && i.type);
        localStorage.setItem(ITEMS_KEY, JSON.stringify(validItems));
        resolve(validItems);
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
