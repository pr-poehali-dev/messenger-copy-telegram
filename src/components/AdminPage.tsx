import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import Icon from "@/components/ui/icon";

type AdminTab = "users" | "groups" | "channels";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  is_blocked: boolean;
  block_reason?: string;
  block_until?: string;
  created_at: string;
  password_hash: string;
}

interface AdminGroup {
  id: number;
  name: string;
  description?: string;
  avatar_url?: string;
  creator_username: string;
  creator_name: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

interface AdminChannel {
  id: number;
  name: string;
  description?: string;
  avatar_url?: string;
  creator_username: string;
  creator_name: string;
  sub_count: number;
  is_active: boolean;
  created_at: string;
}

interface AdminMsg {
  id: number;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [search, setSearch] = useState("");
  const [blockTarget, setBlockTarget] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockHours, setBlockHours] = useState("");
  const [messagesTarget, setMessagesTarget] = useState<{ id: number; name: string; type: "group" | "channel" } | null>(null);
  const [messages, setMessages] = useState<AdminMsg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.admin.stats().then(setStats).catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (tab === "users") setUsers(await api.admin.users(search || undefined));
        if (tab === "groups") setGroups(await api.admin.groups(search || undefined));
        if (tab === "channels") setChannels(await api.admin.channels(search || undefined));
      } catch (_) { /* silent */ } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [tab, search]);

  const blockUser = async (id: number) => {
    try {
      await api.admin.blockUser(id, blockReason, blockHours ? parseFloat(blockHours) : undefined);
      setBlockTarget(null); setBlockReason(""); setBlockHours("");
      setUsers(await api.admin.users());
    } catch (_) { /* silent */ }
  };

  const unblockUser = async (id: number) => {
    try {
      await api.admin.unblockUser(id);
      setUsers(await api.admin.users());
    } catch (_) { /* silent */ }
  };

  const loadMessages = async (id: number, name: string, type: "group" | "channel") => {
    setMessagesTarget({ id, name, type });
    try {
      const msgs = type === "group" ? await api.admin.groupMessages(id) : await api.admin.channelMessages(id);
      setMessages(msgs);
    } catch (_) { /* silent */ }
  };

  const deactivate = async (id: number, type: "group" | "channel") => {
    try {
      if (type === "group") await api.admin.deactivateGroup(id);
      else await api.admin.deactivateChannel(id);
      if (type === "group") setGroups(await api.admin.groups());
      else setChannels(await api.admin.channels());
    } catch (_) { /* silent */ }
  };

  if (messagesTarget) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={() => setMessagesTarget(null)} className="text-muted-foreground hover:text-foreground">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div>
            <p className="font-semibold text-sm">{messagesTarget.name}</p>
            <p className="text-xs text-muted-foreground">сообщения</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.map(m => (
            <div key={m.id} className="rounded-xl p-3" style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-purple-400">{m.display_name} (@{m.username})</span>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("ru")}</span>
              </div>
              <p className="text-sm">{m.content}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-center text-muted-foreground text-sm">Нет сообщений</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            <Icon name="Shield" size={15} className="text-white" />
          </div>
          <h2 className="font-black text-base gradient-text">Админ-панель</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: "Пользователей", value: stats.total_users, icon: "Users" },
            { label: "Сообщений", value: stats.total_messages, icon: "MessageSquare" },
            { label: "Групп", value: stats.total_groups, icon: "Users2" },
            { label: "Каналов", value: stats.total_channels, icon: "Radio" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 flex items-center gap-2"
              style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}>
              <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-purple-400" />
              <div>
                <p className="text-base font-black">{s.value ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(220 15% 12%)" }}>
          {(["users", "groups", "channels"] as AdminTab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? "text-white" : "text-muted-foreground"}`}
              style={tab === t ? { background: "linear-gradient(135deg, #7c3aed, #2563eb)" } : {}}>
              {t === "users" ? "Пользователи" : t === "groups" ? "Группы" : "Каналы"}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none"
            style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}
            placeholder={tab === "users" ? "Ник или email..." : "Название..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-6"><Icon name="Loader" size={20} className="animate-spin text-muted-foreground" /></div>}

        {/* Users */}
        {tab === "users" && users.map(u => (
          <div key={u.id}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <Avatar src={u.avatar_url} name={u.display_name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{u.display_name}</p>
                  {u.is_blocked && (
                    <span className="text-xs px-2 py-0.5 rounded-full text-red-400"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      заблокирован
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">@{u.username} · {u.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">Reg: {new Date(u.created_at).toLocaleDateString("ru")}</p>
                  <span className="text-xs text-muted-foreground font-mono opacity-50">pass: {u.password_hash.slice(0, 12)}...</span>
                </div>
                {u.block_reason && <p className="text-xs text-red-400">Причина: {u.block_reason}</p>}
              </div>
              <div className="flex gap-1">
                {u.is_blocked ? (
                  <button onClick={() => unblockUser(u.id)}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-400"
                    style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                    Разблокировать
                  </button>
                ) : (
                  <button onClick={() => setBlockTarget(blockTarget === u.id ? null : u.id)}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold text-red-400"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    Блокировать
                  </button>
                )}
              </div>
            </div>
            {blockTarget === u.id && (
              <div className="px-4 pb-3 space-y-2 animate-fade-in" style={{ background: "rgba(239,68,68,0.03)" }}>
                <input className="w-full px-3 py-2 rounded-xl text-xs text-foreground placeholder-muted-foreground outline-none"
                  style={{ background: "hsl(220 15% 12%)", border: "1px solid rgba(239,68,68,0.2)" }}
                  placeholder="Причина блокировки..." value={blockReason} onChange={e => setBlockReason(e.target.value)} />
                <input className="w-full px-3 py-2 rounded-xl text-xs text-foreground placeholder-muted-foreground outline-none"
                  type="number"
                  style={{ background: "hsl(220 15% 12%)", border: "1px solid rgba(239,68,68,0.2)" }}
                  placeholder="Часов (пусто = навсегда)" value={blockHours} onChange={e => setBlockHours(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => blockUser(u.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                    Заблокировать
                  </button>
                  <button onClick={() => setBlockTarget(null)}
                    className="px-3 py-2 rounded-xl text-xs text-muted-foreground"
                    style={{ background: "hsl(220 15% 14%)" }}>Отмена</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Groups */}
        {tab === "groups" && groups.map(g => (
          <div key={g.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Avatar name={g.name} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{g.name}</p>
                {!g.is_active && <span className="text-xs text-red-400">удалена</span>}
              </div>
              <p className="text-xs text-muted-foreground">{g.member_count} участников · {g.creator_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleDateString("ru")}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => loadMessages(g.id, g.name, "group")}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-purple-400"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                Сообщения
              </button>
              {g.is_active && (
                <button onClick={() => deactivate(g.id, "group")}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold text-red-400"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  Удалить
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Channels */}
        {tab === "channels" && channels.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Avatar name={c.name} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{c.name}</p>
                {!c.is_active && <span className="text-xs text-red-400">удалён</span>}
              </div>
              <p className="text-xs text-muted-foreground">{c.sub_count} подписчиков · {c.creator_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ru")}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => loadMessages(c.id, c.name, "channel")}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-purple-400"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                Посты
              </button>
              {c.is_active && (
                <button onClick={() => deactivate(c.id, "channel")}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold text-red-400"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  Удалить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
