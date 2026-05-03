import { Link } from "wouter";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitContestModal } from "./submit-contest-modal";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full glass-panel">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-gradient-to-br from-primary to-accent p-2 rounded-xl shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform duration-300">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            Concursuri<span className="text-primary">.biz</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <SubmitContestModal trigger={
            <Button className="rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 hidden sm:flex" data-testid="button-add-contest-nav">
              Adaugă concurs
            </Button>
          } />
          <SubmitContestModal trigger={
            <Button size="icon" className="rounded-full shadow-md shadow-primary/20 flex sm:hidden" data-testid="button-add-contest-nav-mobile">
              <Gift className="w-4 h-4" />
            </Button>
          } />
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30 mt-auto hidden md:block">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <Link href="/" className="flex items-center gap-2 justify-center md:justify-start mb-2 opacity-80 hover:opacity-100 transition-opacity">
              <Gift className="w-5 h-5 text-primary" />
              <span className="font-display text-xl font-bold tracking-tight">Concursuri.biz</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              Directorul tău de concursuri, tombole și giveaway-uri online.
            </p>
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Confidențialitate</a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Termeni</a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 text-center">
          <p className="text-sm text-muted-foreground/60">
            © {new Date().getFullYear()} Concursuri.biz. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  );
}
