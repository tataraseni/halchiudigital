import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Send, MessageSquare, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface ChatWidgetProps {
  channel: string;
  title: string;
  className?: string;
}

export function ChatWidget({ channel, title, className = "" }: ChatWidgetProps) {
  const { user } = useAuth();
  const { messages, isLoading, send, isSending } = useChat(channel);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isSending) {
      send(input);
      setInput("");
    }
  };

  if (!user) {
    return (
      <div className={`bg-card border border-border/60 rounded-xl p-4 text-center ${className}`}>
        <MessageCircle className="w-5 h-5 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">Autentifică-te pentru a participa la chat</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden ${className}`} style={{ height: "500px" }}>
      <div className="bg-primary/5 border-b border-border/40 px-4 py-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          {title}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Se încarc...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Niciun mesaj încă. Fii primul!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.userId === user.id ? "justify-end" : "justify-start"}`} data-testid={`chat-message-${msg.id}`}>
              <div
                className={`max-w-xs rounded-lg px-3 py-2 text-sm break-words ${
                  msg.userId === user.id
                    ? "bg-primary text-white"
                    : "bg-muted/50 text-foreground border border-border/40"
                }`}
              >
                {msg.userId !== user.id && <p className="text-xs font-semibold opacity-70 mb-0.5">{msg.userName}</p>}
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.userId === user.id ? "opacity-70" : "text-muted-foreground opacity-60"}`}>
                  {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ro }) : "acum"}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/40 p-3 flex gap-2">
        <input
          type="text"
          placeholder="Scrie un mesaj..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          disabled={isSending}
          data-testid="input-chat-message"
          className="flex-1 bg-muted/40 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/40 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          data-testid="button-send-chat"
          className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
