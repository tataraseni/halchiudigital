import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@shared/schema";

export function useChat(channel: string) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/chat", channel],
    refetchInterval: 2000, // Poll every 2 seconds for new messages
    refetchOnWindowFocus: true,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", channel] });
    },
  });

  return { messages: messages as ChatMessage[], isLoading, send: sendMutation.mutate, isSending: sendMutation.isPending };
}
