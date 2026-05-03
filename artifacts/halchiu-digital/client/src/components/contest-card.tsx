import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import { Clock, Trophy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FrontendContest } from "@/hooks/use-contests";

interface ContestCardProps {
  contest: FrontendContest;
}

export function ContestCard({ contest }: ContestCardProps) {
  const isExpired = new Date(contest.endDate) < new Date();

  return (
    <Card className="flex flex-col overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1.5 border-border/50 bg-card" data-testid={`card-contest-${contest.id}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={contest.imageUrl || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80"}
          alt={contest.title}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 left-4">
          <Badge className="bg-background/95 text-foreground hover:bg-background border-none font-semibold shadow-sm backdrop-blur-sm px-3 py-1" data-testid={`badge-category-${contest.id}`}>
            {contest.category}
          </Badge>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-display text-xl font-bold line-clamp-2 mb-3 leading-tight group-hover:text-primary transition-colors" data-testid={`text-title-${contest.id}`}>
          {contest.title}
        </h3>

        <div className="flex items-center gap-2 mb-4 bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/10">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold text-sm tracking-wide" data-testid={`text-prize-${contest.id}`}>
            {contest.prize}
          </span>
        </div>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
          {contest.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
          <div className={`flex items-center text-sm font-medium ${isExpired ? 'text-destructive' : 'text-orange-500'} bg-background px-2 py-1 rounded-md`} data-testid={`text-end-date-${contest.id}`}>
            <Clock className="w-4 h-4 mr-1.5" />
            {isExpired
              ? "Expirat"
              : formatDistanceToNow(new Date(contest.endDate), { addSuffix: true, locale: ro })}
          </div>

          <a
            href={contest.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              isExpired
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'text-primary-foreground bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95'
            }`}
            onClick={(e) => isExpired && e.preventDefault()}
            data-testid={`link-enter-${contest.id}`}
          >
            {isExpired ? "Închis" : "Participă"}
            {!isExpired && <ExternalLink className="w-4 h-4 ml-1.5" />}
          </a>
        </div>
      </div>
    </Card>
  );
}
