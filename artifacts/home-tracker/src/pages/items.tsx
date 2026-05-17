import { useState, useEffect } from "react";
import { getItems, deleteItem, Item, saveItem } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, Edit2, Trash2, Box, Apple, Wrench } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type FilterType = "all" | "perishable" | "consumable" | "non-perishable";

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const { toast } = useToast();

  const loadItems = () => {
    setItems(getItems().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove ${name}?`)) {
      deleteItem(id);
      loadItems();
      toast({ description: `Removed ${name}` });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      saveItem({ ...editingItem, updatedAt: new Date().toISOString() });
      setEditingItem(null);
      loadItems();
      toast({ description: `Updated ${editingItem.name}` });
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.location.toLowerCase().includes(search.toLowerCase()) ||
                          item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === "all" || item.type === filter;
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'perishable': return <Apple className="w-3 h-3 mr-1" />;
      case 'consumable': return <Box className="w-3 h-3 mr-1" />;
      default: return <Wrench className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <div className="p-6 pt-12 flex flex-col min-h-full">
      <h1 className="text-3xl font-serif font-bold text-primary mb-6">Inventory</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        <Button 
          variant={filter === "all" ? "default" : "secondary"} 
          size="sm" 
          onClick={() => setFilter("all")}
          className="rounded-full shrink-0"
        >
          All ({items.length})
        </Button>
        <Button 
          variant={filter === "perishable" ? "default" : "secondary"} 
          size="sm" 
          onClick={() => setFilter("perishable")}
          className="rounded-full shrink-0"
        >
          Perishables ({items.filter(i => i.type === 'perishable').length})
        </Button>
        <Button 
          variant={filter === "consumable" ? "default" : "secondary"} 
          size="sm" 
          onClick={() => setFilter("consumable")}
          className="rounded-full shrink-0"
        >
          Consumables ({items.filter(i => i.type === 'consumable').length})
        </Button>
        <Button 
          variant={filter === "non-perishable" ? "default" : "secondary"} 
          size="sm" 
          onClick={() => setFilter("non-perishable")}
          className="rounded-full shrink-0"
        >
          Durable ({items.filter(i => i.type === 'non-perishable').length})
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder="Search items, locations, tags..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card rounded-xl"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {items.length === 0 ? "You haven't recorded any items yet." : "No items match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg capitalize">{item.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingItem(item)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id, item.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center text-muted-foreground text-sm mb-3">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  <span className="capitalize">{item.location}</span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="secondary" className="font-normal text-xs bg-secondary/80">
                    {getTypeIcon(item.type)}
                    {item.type}
                  </Badge>
                  {item.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="font-normal text-xs text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(item.updatedAt))} ago
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={editingItem?.name || ''} onChange={e => setEditingItem(prev => prev ? {...prev, name: e.target.value} : null)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={editingItem?.location || ''} onChange={e => setEditingItem(prev => prev ? {...prev, location: e.target.value} : null)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={editingItem?.type} onValueChange={(v: any) => setEditingItem(prev => prev ? {...prev, type: v} : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perishable">Perishable</SelectItem>
                    <SelectItem value="consumable">Consumable</SelectItem>
                    <SelectItem value="non-perishable">Non-perishable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
