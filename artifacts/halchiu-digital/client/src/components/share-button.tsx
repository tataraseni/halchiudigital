import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";

interface Props {
  title: string;
  text?: string;
  url?: string;
  size?: "sm" | "default";
}

export function ShareButton({ title, text, url, size = "sm" }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? window.location.href;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url: shareUrl });
      } catch (_) {}
      return;
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${title}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <Button
      size={size}
      variant="ghost"
      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground rounded-full"
      onClick={handleShare}
      data-testid="button-share"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
      {copied ? "Copiat!" : "Distribuie"}
    </Button>
  );
}
