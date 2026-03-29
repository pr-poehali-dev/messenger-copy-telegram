import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore, Tab } from "@/lib/store";
import AuthPage from "@/components/AuthPage";
import ChatsPage from "@/components/ChatsPage";
import GroupsPage from "@/components/GroupsPage";
import ChannelsPage from "@/components/ChannelsPage";
import ContactsPage from "@/components/ContactsPage";
import ProfilePage from "@/components/ProfilePage";
import SettingsPage from "@/components/SettingsPage";
import AdminPage from "@/components/AdminPage";
import ChatWindow from "@/components/ChatWindow";
import Avatar from "@/components/Avatar";
import Icon from "@/components/ui/icon";

const NAV: { id: Tab; icon: string; label: string }[] = [
  { id: "chats", icon: "MessageCircle", label: "Чаты" },
  { id: "groups", icon: "Users", label: "Группы" },
  { id: "channels", icon: "Radio", label: "Каналы" },
  { id: "contacts", icon: "UserSearch", label: "Люди" },
  { id: "settings", icon: "Settings", label: "Настройки" },
];

export default function Index() {
  const { user, token, setUser, setToken, activeTab, setActiveTab, activeChatId, openChat } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const me = await api.auth.me();
        setUser(me);
      } catch (_) {
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(220 20% 7%)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-glow" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            <Icon name="Zap" size={28} className="text-white" />
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const isAdmin = user.username === "CoNNectioN";
  const allNav = isAdmin ? [...NAV, { id: "admin" as Tab, icon: "ShieldCheck", label: "Админ" }] : NAV;

  const renderContent = () => {
    if (activeTab === "chats") {
      if (activeChatId) {
        return (
          <div className="flex h-full">
            <div className="w-72 border-r border-border flex-shrink-0 hidden md:flex flex-col" style={{ background: "hsl(220 18% 9%)" }}>
              <ChatsPage onOpenChat={openChat} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <ChatWindow />
            </div>
          </div>
        );
      }
      return (
        <div className="flex h-full">
          <div className="flex-1 flex flex-col" style={{ background: "hsl(220 18% 9%)" }}>
            <ChatsPage onOpenChat={openChat} />
          </div>
          <div className="hidden md:flex flex-1 items-center justify-center border-l border-border">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-glow" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.2))" }}>
                <Icon name="MessageCircle" size={36} className="text-purple-400" />
              </div>
              <p className="text-lg font-semibold gradient-text">Выберите диалог</p>
              <p className="text-sm text-muted-foreground mt-1">или начните новый чат</p>
            </div>
          </div>
        </div>
      );
    }
    if (activeTab === "groups") return <GroupsPage />;
    if (activeTab === "channels") return <ChannelsPage />;
    if (activeTab === "contacts") return <ContactsPage onOpenChat={(id, u) => { openChat(id, u); setActiveTab("chats"); }} />;
    if (activeTab === "settings") return <SettingsPage />;
    if (activeTab === "profile") return <ProfilePage />;
    if (activeTab === "admin" && isAdmin) return <AdminPage />;
    return null;
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "hsl(220 20% 7%)" }}>
      {/* Sidebar nav */}
      <div className="flex flex-col items-center py-3 px-2 gap-1 border-r border-border flex-shrink-0"
        style={{ background: "hsl(220 20% 6%)", width: "68px" }}>
        {/* Logo */}
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 flex-shrink-0 animate-glow"
          style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
          onClick={() => setActiveTab("chats")}>
          <Icon name="Zap" size={20} className="text-white" />
        </button>

        {/* Nav items */}
        <div className="flex-1 flex flex-col gap-1 w-full">
          {allNav.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`nav-item w-full ${activeTab === item.id ? "active" : ""}`}
              title={item.label}>
              <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={22} />
              <span className="text-[9px] leading-none">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Profile avatar */}
        <button onClick={() => setActiveTab("profile")} className={`nav-item w-full ${activeTab === "profile" ? "active" : ""}`} title="Профиль">
          <Avatar src={user.avatar_url} name={user.display_name} size={28} />
          <span className="text-[9px] leading-none">Профиль</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
