import { useState } from "react";
import { Bot, X, MessageSquare, Send, Loader2, BookOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const AIAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; response?: any }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userQuery = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!res.ok) throw new Error("Failed to fetch response");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response?.answer || "No answer provided.", response: data },
      ]);
    } catch (err) {
      toast.error("Failed to connect to AI Assistant.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[400px] max-h-[600px] bg-card card-shadow border border-border rounded-2xl flex flex-col overflow-hidden animate-fade-in shadow-2xl">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-semibold text-sm">UBI Knowledge Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[450px] space-y-4 bg-muted/30">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground mt-10">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Hi! I am your AI Knowledge Assistant.<br/>Ask me about policies, compliance, or historical complaints.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border text-foreground rounded-tl-none"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {msg.role === "assistant" && msg.response?.response && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        {msg.response.response.citations && msg.response.response.citations.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold flex items-center gap-1 text-foreground/80"><BookOpen className="h-3 w-3"/> Citations:</span>
                            <ul className="list-disc pl-4 mt-1">
                              {msg.response.response.citations.map((cit: string, cIdx: number) => (
                                <li key={cIdx}>{cit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {msg.response.response.suggested_actions && msg.response.response.suggested_actions.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-2">
                            <span className="font-semibold flex items-center gap-1 text-foreground/80"><AlertCircle className="h-3 w-3"/> Suggested Actions:</span>
                            <ul className="list-decimal pl-4 mt-1">
                              {msg.response.response.suggested_actions.map((act: string, aIdx: number) => (
                                <li key={aIdx}>{act}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {msg.response.response.draft_customer_reply && (
                          <div className="mt-2 bg-muted p-2 rounded text-xs italic text-muted-foreground border border-border/50">
                            "{msg.response.response.draft_customer_reply}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Searching policies...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-card border-t border-border flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a question..."
              className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !query.trim()}
              className="h-9 w-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
};
