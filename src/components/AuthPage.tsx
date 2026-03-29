import { useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import Icon from "@/components/ui/icon";

export default function AuthPage() {
  const { setUser, setToken } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ login: "", username: "", email: "", password: "", display_name: "" });

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.auth.login({ login: form.login, password: form.password });
        setToken(res.token);
        setUser(res.user);
      } else {
        const res = await api.auth.register({
          username: form.username, email: form.email,
          password: form.password, display_name: form.display_name || form.username,
        });
        setToken(res.token);
        setUser(res.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ background: "hsl(220 20% 7%)" }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse" style={{ background: "radial-gradient(circle, #2563eb, transparent)", animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-glow" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            <Icon name="Zap" size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black gradient-text">NovaMess</h1>
          <p className="text-muted-foreground text-sm mt-1">Мессенджер нового поколения</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "hsl(220 15% 12%)" }}>
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === m ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
                style={mode === m ? { background: "linear-gradient(135deg, #7c3aed, #2563eb)" } : {}}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Имя пользователя</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
                    placeholder="username"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Отображаемое имя</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
                    placeholder="Ваше имя"
                    value={form.display_name}
                    onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
              </>
            )}

            {mode === "login" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Логин или Email</label>
                <input
                  className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
                  placeholder="username или email"
                  value={form.login}
                  onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Пароль</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                style={{ background: "hsl(220 15% 12%)", border: "1px solid hsl(220 15% 20%)" }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Шифрование · Исчезающие сообщения · Реакции
        </p>
      </div>
    </div>
  );
}
