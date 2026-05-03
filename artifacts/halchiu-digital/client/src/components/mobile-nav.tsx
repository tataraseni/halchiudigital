import { Home, PlusCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { SubmitContestModal } from "./submit-contest-modal";
import { Button } from "@/components/ui/button";

export function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="glass-panel rounded-full h-16 flex items-center justify-around shadow-lg px-2">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 p-2 rounded-full transition-colors no-underline ${location === '/' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          data-testid="link-home"
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Acasă</span>
        </Link>

        <SubmitContestModal trigger={
          <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-full text-muted-foreground" data-testid="button-add-contest-mobile">
            <PlusCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium">Adaugă</span>
          </Button>
        } />
      </div>
    </div>
  );
}
