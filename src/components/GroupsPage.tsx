import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import Icon from "@/components/ui/icon";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface Group {
  id: number;
  name: string;
  description?: string;
  avatar_url?: string;
  creator: string;
  creator_name: string;
  member_count: number;
  last_message?: string;
  last_time?: string;
  role: string;
}

interface GroupMsg {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  disappears_at?: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  reactions: Record<string, number>;
}

export default function GroupsPage() {
  const { user, activeGroupId, openGroup, closeGroup, activeGroupName } = useStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<GroupMsg[]>([]);
  const [text, setText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const [disappearHours, setDisappearHours] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try { setGroups(await api.groups.list()); } catch (_) { /* silent */ }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!activeGroupId) return;
    try { setMessages(await api.groups.messages(activeGroupId)); } catch (_) { /* silent */ }
  }, [activeGroupId]);

  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 3000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !activeGroupId) return;
    try {
      await api.groups.send(activeGroupId, text.trim(), disappearHours ?? undefined);
      setText(""); setDisappearHours(null);
      loadMessages();
    } catch (_) { /* silent */ }
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    try {
      await api.groups.create({ name: newName, description: newDesc });
      setNewName(""); setNewDesc(""); setShowCreate(false);
      setGroups(await api.groups.list());
    } catch (_) { /* silent */ }
  };

  const addReaction = async (msgId: number, emoji: string) => {
    if (!activeGroupId) return;
    try {
      await api.groups.react(activeGroupId, msgId, emoji);
      setReactionTarget(null); loadMessages();
    } catch (_) { /* silent */ }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });

  if (activeGroupId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass">
          <button onClick={closeGroup} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <Avatar name={activeGroupName} size={36} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{activeGroupName}</p>
            <p className="text-xs text-muted-foreground">группа</p>
          </div>
          <button onClick={() => setDisappearHours(d => d ? null : 24)}
            className={`p-2 rounded-lg transition-colors ${disappearHours ? "text-purple-400" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon name="Timer" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.map(msg => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}>
                {!isOwn && <Avatar src={msg.avatar_url} name={msg.display_name} size={28} className="mt-1" />}
                <div className={`max-w-[70%] flex flex-col gap-1 ${isOwn ? "items-end" : ""}`}>
                  {!isOwn && <span className="text-xs font-medium px-1" style={{ color: "#7c3aed" }}>{msg.display_name}</span>}
                  <div
                    className={`px-4 py-2.5 text-sm cursor-pointer ${isOwn ? "msg-bubble-own text-white" : "msg-bubble-other text-foreground"}`}
                    onClick={() => setReactionTarget(reactionTarget === msg.id ? null : msg.id)}>
                    {msg.content}
                    <span className="text-xs ml-2 opacity-60">{formatTime(msg.created_at)}</span>
                  </div>
                  {Object.keys(msg.reactions).length > 0 && (
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
                        <button key={r} className="text-lg hover:scale-125 transition-transform" onClick={() => addReaction(msg.id, r)}>{r}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2 px-4 py-2 rounded-2xl" style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}>
              <textarea className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none resize-none max-h-32"
                placeholder="Сообщение в группу..." rows={1} value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            </div>
            <button onClick={send} disabled={!text.trim()}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
              <Icon name="Send" size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-bold text-base">Группы</h2>
        <button onClick={() => setShowCreate(true)}
          className="p-2 rounded-xl text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
          <Icon name="Plus" size={18} />
        </button>
      </div>

      {showCreate && (
        <div className="px-4 py-3 border-b border-border space-y-2 animate-fade-in" style={{ background: "rgba(124,58,237,0.05)" }}>
          <input className="w-full px-3 py-2 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none"
            style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
            placeholder="Название группы" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="w-full px-3 py-2 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none"
            style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
            placeholder="Описание (необязательно)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={createGroup} disabled={!newName.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>Создать</button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "hsl(220 15% 14%)" }}>Отмена</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Icon name="Users" size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Нет групп</p>
          </div>
        )}
        {groups.map(g => (
          <button key={g.id} onClick={() => openGroup(g.id, g.name)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left">
            <Avatar name={g.name} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm truncate">{g.name}</p>
                <span className="text-xs text-muted-foreground">{g.last_time ? new Date(g.last_time).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Users" size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{g.member_count}</span>
                <span className="text-xs text-muted-foreground truncate">{g.last_message || g.description || ""}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
