import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import Icon from "@/components/ui/icon";

interface Chat {
  partner_id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_online: boolean;
  last_message?: string;
  last_time?: string;
  unread: number;
}

interface SearchUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_online: boolean;
}

export default function ChatsPage({ onOpenChat }: { onOpenChat: (id: number, user: SearchUser) => void }) {
  const { activeChatId } = useStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.messages.chats();
        setChats(data);
      } catch (_) { /* silent */ }
    };
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.messages.searchUsers(search);
        setSearchResults(res);
      } catch (_) { /* silent */ } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ru", { day: "2-digit", month: "short" });
  };

  const showSearch = search.trim().length > 0;
  const list = showSearch ? searchResults : chats;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
            style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}
            placeholder="Поиск или новый чат..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {searching && <Icon name="Loader" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Icon name="MessageSquare" size={32} className="mb-2 opacity-30" />
            <p className="text-sm">{showSearch ? "Не найдено" : "Нет диалогов"}</p>
          </div>
        )}

        {showSearch
          ? searchResults.map(u => (
            <button key={u.id} onClick={() => { onOpenChat(u.id, u); setSearch(""); }}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5 text-left">
              <Avatar src={u.avatar_url} name={u.display_name} size={44} online={u.is_online} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <Icon name="MessageCircle" size={16} className="text-muted-foreground" />
            </button>
          ))
          : chats.map(c => (
            <button key={c.partner_id} onClick={() => onOpenChat(c.partner_id, { id: c.partner_id, username: c.username, display_name: c.display_name, avatar_url: c.avatar_url, is_online: c.is_online })}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${activeChatId === c.partner_id ? "bg-white/5" : "hover:bg-white/5"}`}>
              <Avatar src={c.avatar_url} name={c.display_name} size={44} online={c.is_online} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm truncate">{c.display_name}</p>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{formatTime(c.last_time)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">{c.last_message || "..."}</p>
                  {c.unread > 0 && (
                    <span className="ml-2 text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", fontSize: "10px" }}>
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
