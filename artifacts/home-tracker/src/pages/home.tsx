import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { getGeminiKey, getItems, Item } from "@/lib/storage";
import { processItemStatement, askQuestion, ExtractionResult } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, AlertCircle, RefreshCw, CheckCircle2, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [recordInput, setRecordInput] = useState("");
  const [askInput, setAskInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: 'add'|'remove'|'update', item: Item | { name: string } } | null>(null);
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setApiKey(getGeminiKey());
  }, []);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordInput.trim() || !apiKey) return;

    setIsRecording(true);
    setLastResult(null);
    try {
      const { result, item } = await processItemStatement(recordInput);
      setRecordInput("");
      
      if (result.action === "add" && item) {
        setLastResult({ type: 'add', item });
        toast({
          title: "Recorded",
          description: `Added ${item.name} to ${item.location}`,
        });
      } else if (result.action === "remove") {
        setLastResult({ type: 'remove', item: item || { name: result.name } });
        toast({
          title: "Removed",
          description: `Removed ${result.name}`,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to process input",
      });
    } finally {
      setIsRecording(false);
    }
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim() || !apiKey) return;

    setIsAsking(true);
    setAskResponse(null);
    try {
      const response = await askQuestion(askInput);
      setAskResponse(response);
      setAskInput("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to query items",
      });
    } finally {
      setIsAsking(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="p-6 pt-12 flex flex-col h-full">
        <h1 className="text-3xl font-serif font-bold text-primary mb-2">Home Tracker</h1>
        <p className="text-muted-foreground mb-8">A quiet place for your household things.</p>
        
        <Alert className="mb-6 border-primary/20 bg-primary/5 text-primary">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Welcome</AlertTitle>
          <AlertDescription>
            To get started, you need to add your Gemini API key. This keeps your data private and on your device.
          </AlertDescription>
        </Alert>
        
        <Button asChild className="w-full">
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 pt-12 flex flex-col min-h-full">
      <h1 className="text-3xl font-serif font-bold text-primary mb-8">Home</h1>

      <section className="mb-12">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Record something</h2>
        <form onSubmit={handleRecordSubmit} className="relative">
          <Input
            value={recordInput}
            onChange={(e) => setRecordInput(e.target.value)}
            placeholder="e.g. I put the batteries in the hall closet"
            className="pr-12 py-6 text-base bg-card border-border shadow-sm rounded-xl"
            disabled={isRecording}
            data-testid="input-record"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-2 top-2 bottom-2 h-auto"
            disabled={isRecording || !recordInput.trim()}
            data-testid="button-record"
          >
            {isRecording ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {isRecording && (
          <div className="mt-4 p-4 rounded-xl border border-border bg-card/50">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {lastResult && !isRecording && (
          <Card className="mt-4 border-primary/20 bg-primary/5 shadow-none animate-in fade-in slide-in-from-top-2">
            <CardContent className="p-4 flex items-start gap-3">
              {lastResult.type === 'add' ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              ) : (
                <Trash2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {lastResult.type === 'add' ? 'Recorded' : 'Removed'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lastResult.type === 'add' && 'location' in lastResult.item
                    ? `Stored "${lastResult.item.name}" in ${lastResult.item.location}`
                    : `Removed "${lastResult.item.name}" from tracker`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Find something</h2>
        <form onSubmit={handleAskSubmit} className="relative mb-4">
          <Input
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            placeholder="e.g. Where did I put the batteries?"
            className="pr-12 py-6 text-base bg-card border-border shadow-sm rounded-xl"
            disabled={isAsking}
            data-testid="input-ask"
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="secondary"
            className="absolute right-2 top-2 bottom-2 h-auto"
            disabled={isAsking || !askInput.trim()}
            data-testid="button-ask"
          >
            {isAsking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {isAsking && (
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}

        {askResponse && !isAsking && (
          <Card className="border-secondary bg-secondary/50 shadow-none animate-in fade-in slide-in-from-top-2">
            <CardContent className="p-5">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{askResponse}</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
