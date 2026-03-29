import { useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import Icon from "@/components/ui/icon";

export default function ProfilePage() {
  const { user, setUser, logout } = useStore();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.auth.updateProfile({ display_name: displayName, bio });
      const me = await api.auth.me();
      setUser(me);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_) { /* silent */ } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    try { await api.auth.logout(); } catch (_) { /* silent */ }
    logout();
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div className="relative px-4 pt-8 pb-6" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.15))" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar src={user.avatar_url} name={user.display_name} size={80} />
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
              <Icon name="Camera" size={13} />
            </button>
          </div>
          {editing ? (
            <input className="text-center text-lg font-bold bg-transparent border-b-2 border-purple-500 text-foreground outline-none"
              value={displayName} onChange={e => setDisplayName(e.target.value)} />
          ) : (
            <h2 className="text-xl font-black">{user.display_name}</h2>
          )}
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {/* Bio */}
        <div className="rounded-2xl p-4" style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}>
          <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">О себе</p>
          {editing ? (
            <textarea className="w-full bg-transparent text-sm text-foreground outline-none resize-none"
              placeholder="Расскажите о себе..."
              rows={3} value={bio} onChange={e => setBio(e.target.value)} />
          ) : (
            <p className="text-sm text-foreground">{user.bio || "Не указано"}</p>
          )}
        </div>

        {/* Info */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 18%)" }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Icon name="Mail" size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Icon name="Calendar" size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Дата регистрации</p>
              <p className="text-sm font-medium">{user.created_at ? new Date(user.created_at).toLocaleDateString("ru") : "—"}</p>
            </div>
          </div>
        </div>

        {/* Encryption info */}
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.2)" }}>
            <Icon name="Shield" size={20} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-300">Шифрование активно</p>
            <p className="text-xs text-muted-foreground">Ваши сообщения защищены</p>
          </div>
        </div>

        {/* Actions */}
        {saved && (
          <div className="text-center text-sm text-emerald-400 py-1 animate-fade-in">✓ Сохранено</div>
        )}

        {editing ? (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            <button onClick={() => setEditing(false)}
              className="px-4 py-3 rounded-xl text-sm text-muted-foreground"
              style={{ background: "hsl(220 15% 14%)" }}>Отмена</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            Редактировать профиль
          </button>
        )}

        <button onClick={doLogout}
          className="w-full py-3 rounded-xl font-semibold text-sm text-red-400 hover:bg-red-400/10 transition-colors"
          style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
