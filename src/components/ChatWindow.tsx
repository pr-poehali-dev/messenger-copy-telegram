import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import Icon from "@/components/ui/icon";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  disappears_at?: string;
  is_read: boolean;
  username: string;
  display_name: string;
  avatar_url?: string;
  reactions: Record<string, number>;
}

export default function ChatWindow() {
  const { user, activeChatId, activeChatUser, closeChat } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [disappearHours, setDisappearHours] = useState<number | null>(null);
  const [showDisappear, setShowDisappear] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const loadMessages = useCallback(async () => {
    if (!activeChatId) return;
    try {
      const msgs = await api.messages.list(activeChatId);
      setMessages(msgs);
    } catch (_) { /* silent */ }
  }, [activeChatId]);

  useEffect(() => {
    loadMessages();
    intervalRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(intervalRef.current);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !activeChatId) return;
    setSending(true);
    try {
      const msg = await api.messages.send({
        receiver_id: activeChatId,
        content: text.trim(),
        disappear_hours: disappearHours ?? undefined,
      });
      setMessages(prev => [...prev, { ...msg, username: user?.username || "", display_name: user?.display_name || "", reactions: {} }]);
      setText("");
      setDisappearHours(null);
      setShowDisappear(false);
    } catch (_) { /* silent */ } finally {
      setSending(false);
    }
  };

  const addReaction = async (msgId: number, emoji: string) => {
    try {
      await api.messages.react(msgId, emoji);
      setReactionTarget(null);
      loadMessages();
    } catch (_) { /* silent */ }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass">
        <button onClick={closeChat} className="text-muted-foreground hover:text-foreground transition-colors md:hidden">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <Avatar src={activeChatUser?.avatar_url} name={activeChatUser?.display_name} size={38} online={activeChatUser?.is_online} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{activeChatUser?.display_name || activeChatUser?.username}</p>
          <p className="text-xs text-muted-foreground">
            {activeChatUser?.is_online ? (
              <span className="text-emerald-400">онлайн</span>
            ) : "@" + activeChatUser?.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDisappear(!showDisappear)}
            className={`p-2 rounded-lg transition-colors ${showDisappear || disappearHours ? "text-purple-400" : "text-muted-foreground hover:text-foreground"}`}
            title="Исчезающие сообщения">
            <Icon name="Timer" size={18} />
          </button>
        </div>
      </div>

      {/* Disappear settings */}
      {showDisappear && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 animate-fade-in" style={{ background: "rgba(124,58,237,0.05)" }}>
          <Icon name="Timer" size={16} className="text-purple-400" />
          <span className="text-xs text-muted-foreground">Исчезнет через:</span>
          {[1, 24, 168].map(h => (
            <button key={h}
              onClick={() => setDisappearHours(disappearHours === h ? null : h)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${disappearHours === h ? "text-white" : "text-muted-foreground"}`}
              style={disappearHours === h ? { background: "linear-gradient(135deg, #7c3aed, #2563eb)" } : { background: "hsl(220 15% 16%)" }}>
              {h === 1 ? "1ч" : h === 24 ? "24ч" : "7д"}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.2))" }}>
              <Icon name="MessageCircle" size={28} className="text-purple-400" />
            </div>
            <p className="text-muted-foreground text-sm">Начните общение!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const hasReactions = Object.keys(msg.reactions).length > 0;

          return (
            <div key={msg.id} className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}>
              {!isOwn && <Avatar src={msg.avatar_url} name={msg.display_name} size={28} className="flex-shrink-0 mt-1" />}

              <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {msg.disappears_at && (
                  <div className="flex items-center gap-1 text-xs text-amber-400 px-2">
                    <Icon name="Timer" size={10} />
                    <span>исчезнет</span>
                  </div>
                )}

                <div
                  className={`relative px-4 py-2.5 text-sm leading-relaxed cursor-pointer ${isOwn ? "msg-bubble-own text-white" : "msg-bubble-other text-foreground"}`}
                  onClick={() => setReactionTarget(reactionTarget === msg.id ? null : msg.id)}>
                  {msg.content}
                  <span className={`text-xs ml-2 opacity-60 ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                    {formatTime(msg.created_at)}
                    {isOwn && <Icon name={msg.is_read ? "CheckCheck" : "Check"} size={12} className="inline ml-1" />}
                  </span>
                </div>

                {hasReactions && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {Object.entries(msg.reactions).map(([emoji, count]) => (
                      <span key={emoji} className="text-xs px-2 py-0.5 rounded-full cursor-pointer hover:scale-110 transition-transform"
                        style={{ background: "hsl(220 15% 18%)", border: "1px solid hsl(220 15% 25%)" }}
                        onClick={() => addReaction(msg.id, emoji)}>
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}

                {reactionTarget === msg.id && (
                  <div className="flex gap-1 px-2 py-1.5 rounded-2xl shadow-xl animate-scale-in"
                    style={{ background: "hsl(220 18% 12%)", border: "1px solid hsl(220 15% 22%)" }}>
                    {REACTIONS.map(r => (
                      <button key={r} className="text-lg hover:scale-125 transition-transform" onClick={() => addReaction(msg.id, r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-end gap-2 px-4 py-2 rounded-2xl" style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}>
            <textarea
              className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none resize-none max-h-32 min-h-[20px]"
              placeholder="Сообщение..."
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              style={{ lineHeight: "1.5" }}
            />
          </div>
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            <Icon name="Send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}