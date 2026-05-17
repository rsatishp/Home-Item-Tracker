import { useState, useEffect, useRef } from "react";
import { getGeminiKey, saveGeminiKey, getItems, exportJSON, importJSON } from "@/lib/storage";
import { generateContent } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setApiKey(getGeminiKey() || "");
    setItemCount(getItems().length);
  }, []);

  const handleSaveKey = () => {
    saveGeminiKey(apiKey);
    toast({ description: "API key saved" });
    setTestSuccess(null);
  };

  const handleTestKey = async () => {
    if (!apiKey) {
      toast({ variant: "destructive", description: "Please enter an API key first" });
      return;
    }
    
    saveGeminiKey(apiKey);
    setIsTesting(true);
    setTestSuccess(null);
    
    try {
      await generateContent("Reply with exactly the word 'SUCCESS' and nothing else.");
      setTestSuccess(true);
      toast({ description: "API key is working!" });
    } catch (err: any) {
      setTestSuccess(false);
      toast({ 
        variant: "destructive", 
        title: "Connection Failed",
        description: err.message || "Failed to verify API key" 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleExport = () => {
    exportJSON();
    toast({ description: "Data exported successfully" });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const items = await importJSON(file);
      setItemCount(items.length);
      toast({ description: `Successfully imported ${items.length} items` });
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Import Failed",
        description: err.message || "Invalid file format" 
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 pt-12 flex flex-col min-h-full">
      <h1 className="text-3xl font-serif font-bold text-primary mb-8">Settings</h1>

      <Card className="mb-8 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="w-5 h-5 text-primary" />
            Gemini API Key
          </CardTitle>
          <CardDescription>
            Your key is stored locally on your device. Get a free key from Google AI Studio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input 
              id="apiKey"
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="font-mono bg-background"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveKey} variant="default" className="flex-1">
              Save Key
            </Button>
            <Button onClick={handleTestKey} variant="secondary" disabled={isTesting || !apiKey}>
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {testSuccess === true && !isTesting ? <CheckCircle2 className="w-4 h-4 text-primary mr-2" /> : null}
              Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Data Management</CardTitle>
          <CardDescription>
            You have {itemCount} items recorded. Data lives only in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExport} variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" />
            Backup to JSON
          </Button>
          
          <div>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
              id="import-file"
            />
            <Button 
              variant="outline" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Restore from JSON (Overwrites current)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
