import { useState, useEffect } from "react";
import { Link } from "wouter";
import { getGeminiKey } from "@/lib/storage";
import { extractItemInfo, applyExtraction, askQuestion, ExtractionResult, ApplyResult } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, AlertCircle, RefreshCw, CheckCircle2, Trash2, X, MapPin } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TYPE_LABELS: Record<string, string> = {
  perishable: "Perishable",
  consumable: "Consumable",
  "non-perishable": "Durable",
};

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Record flow state
  const [recordInput, setRecordInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [pendingExtraction, setPendingExtraction] = useState<ExtractionResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  // Ask flow state
  const [askInput, setAskInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askResponse, setAskResponse] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setApiKey(getGeminiKey());
  }, []);

  // Step 1: Call Gemini to extract, show confirmation preview
  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordInput.trim() || !apiKey) return;

    setIsExtracting(true);
    setApplyResult(null);
    setPendingExtraction(null);
    try {
      const result = await extractItemInfo(recordInput);
      setPendingExtraction(result);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process input",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 2: User confirms — commit to storage
  const handleConfirm = () => {
    if (!pendingExtraction) return;
    const result = applyExtraction(pendingExtraction, recordInput);
    setApplyResult(result);
    setPendingExtraction(null);
    setRecordInput("");
  };

  // Step 2 (cancel): discard without saving
  const handleCancel = () => {
    setPendingExtraction(null);
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
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to query items",
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
        <Button asChild className="w-full" data-testid="button-go-to-settings">
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 pt-12 flex flex-col min-h-full">
      <h1 className="text-3xl font-serif font-bold text-primary mb-8">Home</h1>

      {/* Record section */}
      <section className="mb-12">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Record something
        </h2>
        <form onSubmit={handleRecordSubmit} className="relative">
          <Input
            value={recordInput}
            onChange={(e) => setRecordInput(e.target.value)}
            placeholder="e.g. I put the batteries in the hall closet"
            className="pr-12 py-6 text-base bg-card border-border shadow-sm rounded-xl"
            disabled={isExtracting || !!pendingExtraction}
            data-testid="input-record"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 top-2 bottom-2 h-auto"
            disabled={isExtracting || !recordInput.trim() || !!pendingExtraction}
            data-testid="button-record"
          >
            {isExtracting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Extracting skeleton */}
        {isExtracting && (
          <div className="mt-4 p-4 rounded-xl border border-border bg-card/50">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {/* Confirmation preview — shown before storage is touched */}
        {pendingExtraction && !isExtracting && (
          <Card
            className="mt-4 border-primary/30 bg-primary/5 shadow-none animate-in fade-in slide-in-from-top-2"
            data-testid="card-confirm-preview"
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Confirm before saving
              </p>
              <div className="flex items-start gap-2 mb-3">
                <Badge
                  variant="secondary"
                  className="shrink-0 capitalize"
                  data-testid="badge-action"
                >
                  {pendingExtraction.action === "add" ? "Add / Update" : "Remove"}
                </Badge>
                <span className="font-semibold text-foreground" data-testid="text-item-name">
                  {pendingExtraction.name}
                </span>
              </div>
              {pendingExtraction.action === "add" && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span data-testid="text-item-location">{pendingExtraction.location}</span>
                  <span className="mx-1">·</span>
                  <span data-testid="text-item-type">
                    {TYPE_LABELS[pendingExtraction.type] ?? pendingExtraction.type}
                  </span>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  className="flex-1"
                  data-testid="button-confirm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  data-testid="button-cancel"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post-save result */}
        {applyResult && !pendingExtraction && (
          <Card
            className="mt-4 border-primary/20 bg-primary/5 shadow-none animate-in fade-in slide-in-from-top-2"
            data-testid="card-apply-result"
          >
            <CardContent className="p-4 flex items-start gap-3">
              {applyResult.action === "removed" ? (
                <Trash2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-foreground" data-testid="text-result-action">
                  {applyResult.action === "added" && "Recorded"}
                  {applyResult.action === "updated" && "Updated"}
                  {applyResult.action === "removed" && "Removed"}
                  {applyResult.action === "not-found" && "Not found"}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-result-detail">
                  {applyResult.action === "added" && applyResult.item &&
                    `Stored "${applyResult.item.name}" in ${applyResult.item.location}`}
                  {applyResult.action === "updated" && applyResult.item &&
                    `Updated "${applyResult.item.name}" — now in ${applyResult.item.location}`}
                  {applyResult.action === "removed" && applyResult.item &&
                    `Removed "${applyResult.item.name}" from tracker`}
                  {applyResult.action === "not-found" &&
                    "No matching item found in your tracker"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Ask section */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Find something
        </h2>
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
            {isAsking ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
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
          <Card
            className="border-secondary bg-secondary/50 shadow-none animate-in fade-in slide-in-from-top-2"
            data-testid="card-ask-response"
          >
            <CardContent className="p-5">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-ask-answer">
                {askResponse}
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
