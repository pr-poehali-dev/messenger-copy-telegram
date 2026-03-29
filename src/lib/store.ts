import { create } from "zustand";

export type Tab = "chats" | "groups" | "channels" | "contacts" | "settings" | "profile" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  activeTab: Tab;
  activeChatId: number | null;
  activeChatUser: { id: number; username: string; display_name: string; avatar_url?: string; is_online?: boolean } | null;
  activeGroupId: number | null;
  activeGroupName: string;
  activeChannelId: number | null;
  activeChannelName: string;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setActiveTab: (tab: Tab) => void;
  openChat: (userId: number, chatUser: AppState["activeChatUser"]) => void;
  closeChat: () => void;
  openGroup: (groupId: number, name: string) => void;
  closeGroup: () => void;
  openChannel: (channelId: number, name: string) => void;
  closeChannel: () => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem("nm_token"),
  activeTab: "chats",
  activeChatId: null,
  activeChatUser: null,
  activeGroupId: null,
  activeGroupName: "",
  activeChannelId: null,
  activeChannelName: "",
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem("nm_token", token);
    else localStorage.removeItem("nm_token");
    set({ token });
  },
  setActiveTab: (tab) => set({ activeTab: tab, activeChatId: null, activeGroupId: null, activeChannelId: null }),
  openChat: (userId, chatUser) => set({ activeChatId: userId, activeChatUser: chatUser, activeTab: "chats" }),
  closeChat: () => set({ activeChatId: null, activeChatUser: null }),
  openGroup: (groupId, name) => set({ activeGroupId: groupId, activeGroupName: name }),
  closeGroup: () => set({ activeGroupId: null, activeGroupName: "" }),
  openChannel: (channelId, name) => set({ activeChannelId: channelId, activeChannelName: name }),
  closeChannel: () => set({ activeChannelId: null, activeChannelName: "" }),
  logout: () => {
    localStorage.removeItem("nm_token");
    set({ user: null, token: null, activeChatId: null, activeGroupId: null, activeChannelId: null });
  },
}));
