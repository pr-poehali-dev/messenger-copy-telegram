import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import Icon from "@/components/ui/icon";

interface UserResult {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_online: boolean;
}

export default function ContactsPage({ onOpenChat }: { onOpenChat: (id: number, user: UserResult) => void }) {
  const { setActiveTab } = useStore();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.messages.searchUsers(search);
        setResults(res);
      } catch (_) { /* silent */ } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-bold text-base mb-3">Контакты</h2>
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none"
            style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}
            placeholder="Найти пользователя..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {loading && <Icon name="Loader" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!search && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center px-4">
            <Icon name="UserSearch" size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Введите имя или никнейм<br />для поиска</p>
          </div>
        )}

        {results.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all">
            <Avatar src={u.avatar_url} name={u.display_name} size={44} online={u.is_online} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{u.display_name}</p>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
            </div>
            <button
              onClick={() => { onOpenChat(u.id, u); setActiveTab("chats"); }}
              className="p-2 rounded-xl text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
              <Icon name="MessageCircle" size={16} />
            </button>
          </div>
        ))}

        {search && results.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">Пользователи не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
