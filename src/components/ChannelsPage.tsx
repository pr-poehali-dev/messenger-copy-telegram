import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import Icon from "@/components/ui/icon";

const REACTIONS = ["👍", "❤️", "😂", "🔥", "👏", "😮"];

interface Channel {
  id: number;
  name: string;
  description?: string;
  avatar_url?: string;
  creator: string;
  creator_name: string;
  sub_count: number;
  last_post?: string;
  last_time?: string;
  is_subscribed: boolean;
}

interface Post {
  id: number;
  author_id: number;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  reactions: Record<string, number>;
}

export default function ChannelsPage() {
  const { user, activeChannelId, openChannel, closeChannel, activeChannelName } = useStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadChannels = async () => {
    try { setChannels(await api.channels.list()); } catch (_) { /* silent */ }
  };

  useEffect(() => {
    loadChannels();
    const t = setInterval(loadChannels, 5000);
    return () => clearInterval(t);
  }, []);

  const loadPosts = useCallback(async () => {
    if (!activeChannelId) return;
    try { setPosts(await api.channels.posts(activeChannelId)); } catch (_) { /* silent */ }
  }, [activeChannelId]);

  useEffect(() => {
    loadPosts();
    const t = setInterval(loadPosts, 5000);
    return () => clearInterval(t);
  }, [loadPosts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  const isCreator = channels.find(c => c.id === activeChannelId)?.creator === user?.username;

  const send = async () => {
    if (!text.trim() || !activeChannelId) return;
    try {
      await api.channels.post(activeChannelId, text.trim());
      setText(""); loadPosts();
    } catch (_) { /* silent */ }
  };

  const createChannel = async () => {
    if (!newName.trim()) return;
    try {
      await api.channels.create({ name: newName, description: newDesc });
      setNewName(""); setNewDesc(""); setShowCreate(false);
      loadChannels();
    } catch (_) { /* silent */ }
  };

  const subscribe = async (channelId: number) => {
    try {
      await api.channels.subscribe(channelId);
      loadChannels();
    } catch (_) { /* silent */ }
  };

  const addReaction = async (postId: number, emoji: string) => {
    if (!activeChannelId) return;
    try {
      await api.channels.react(activeChannelId, postId, emoji);
      setReactionTarget(null); loadPosts();
    } catch (_) { /* silent */ }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ru", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  };

  if (activeChannelId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass">
          <button onClick={closeChannel} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <Avatar name={activeChannelName} size={36} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{activeChannelName}</p>
            <p className="text-xs text-muted-foreground">канал</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {posts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Icon name="Radio" size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Постов пока нет</p>
            </div>
          )}
          {posts.map(post => (
            <div key={post.id} className="rounded-2xl p-4 animate-fade-in" style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Avatar src={post.avatar_url} name={post.display_name} size={28} />
                <div>
                  <p className="text-xs font-semibold text-purple-400">{post.display_name}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{post.content}</p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => setReactionTarget(reactionTarget === post.id ? null : post.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon name="Smile" size={14} />
                  Реакция
                </button>
                {Object.entries(post.reactions).map(([emoji, count]) => (
                  <button key={emoji} className="text-xs px-2 py-0.5 rounded-full hover:scale-110 transition-transform"
                    style={{ background: "hsl(220 15% 18%)", border: "1px solid hsl(220 15% 25%)" }}
                    onClick={() => addReaction(post.id, emoji)}>
                    {emoji} {count}
                  </button>
                ))}
              </div>
              {reactionTarget === post.id && (
                <div className="flex gap-1 px-2 py-1.5 rounded-2xl mt-2 animate-scale-in w-fit"
                  style={{ background: "hsl(220 18% 12%)", border: "1px solid hsl(220 15% 22%)" }}>
                  {REACTIONS.map(r => (
                    <button key={r} className="text-lg hover:scale-125 transition-transform" onClick={() => addReaction(post.id, r)}>{r}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {isCreator && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-end gap-2">
              <div className="flex-1 px-4 py-2 rounded-2xl" style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}>
                <textarea className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none resize-none max-h-32"
                  placeholder="Новый пост..." rows={1} value={text}
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
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-bold text-base">Каналы</h2>
        <button onClick={() => setShowCreate(true)}
          className="p-2 rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
          <Icon name="Plus" size={18} />
        </button>
      </div>

      {showCreate && (
        <div className="px-4 py-3 border-b border-border space-y-2 animate-fade-in" style={{ background: "rgba(124,58,237,0.05)" }}>
          <input className="w-full px-3 py-2 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none"
            style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
            placeholder="Название канала" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="w-full px-3 py-2 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none"
            style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
            placeholder="Описание" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={createChannel} disabled={!newName.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>Создать</button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl text-sm text-muted-foreground"
              style={{ background: "hsl(220 15% 14%)" }}>Отмена</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {channels.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Icon name="Radio" size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Нет каналов</p>
          </div>
        )}
        {channels.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all">
            <button className="flex-1 flex items-center gap-3 min-w-0 text-left" onClick={() => { subscribe(c.id); openChannel(c.id, c.name); }}>
              <Avatar name={c.name} size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{c.name}</p>
                <div className="flex items-center gap-2">
                  <Icon name="Users" size={12} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{c.sub_count}</span>
                  <span className="text-xs text-muted-foreground truncate">{c.description || ""}</span>
                </div>
              </div>
            </button>
            {!c.is_subscribed && (
              <button onClick={() => subscribe(c.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                Подписаться
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
