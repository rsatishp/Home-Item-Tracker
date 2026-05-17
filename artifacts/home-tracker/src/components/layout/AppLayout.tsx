import { Link, useLocation } from "wouter";
import { Home as HomeIcon, List, Settings } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background w-full max-w-md mx-auto shadow-xl relative">
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-card border-t border-border z-50 px-6 py-2 pb-safe">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex flex-col items-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors data-[active=true]:text-primary" data-active={location === "/"}>
            <HomeIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link href="/items" className="flex flex-col items-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors data-[active=true]:text-primary" data-active={location === "/items"}>
            <List className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Items</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors data-[active=true]:text-primary" data-active={location === "/settings"}>
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
