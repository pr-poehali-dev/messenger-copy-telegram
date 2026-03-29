const URLS = {
  auth: "https://functions.poehali.dev/47f7d725-4124-4b05-ab39-0249ccb5bc77",
  messages: "https://functions.poehali.dev/c268ea8d-1de7-4eda-b40d-60a6dfcfc030",
  groups: "https://functions.poehali.dev/434d016b-a36c-4f3c-bd13-ac43205a983d",
  channels: "https://functions.poehali.dev/52eb1b3a-c269-4fdf-b58d-5b56e49fe087",
  admin: "https://functions.poehali.dev/e59ad2aa-1c39-4890-9f64-2f5ac4987456",
};

function getToken() {
  return localStorage.getItem("nm_token") || "";
}

async function req(base: string, path: string, method = "GET", body?: unknown, extraHeaders?: Record<string, string>) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

export const api = {
  auth: {
    register: (d: { username: string; email: string; password: string; display_name?: string }) =>
      req(URLS.auth, "/register", "POST", d),
    login: (d: { login: string; password: string }) =>
      req(URLS.auth, "/login", "POST", d),
    logout: () => req(URLS.auth, "/logout", "POST"),
    me: () => req(URLS.auth, "/me"),
    updateProfile: (d: { display_name?: string; bio?: string; avatar_url?: string }) =>
      req(URLS.auth, "/profile", "PUT", d),
  },
  messages: {
    chats: () => req(URLS.messages, "/chats"),
    list: (withUser: number, offset = 0) =>
      req(URLS.messages, `/messages?with=${withUser}&offset=${offset}`),
    send: (d: { receiver_id: number; content: string; disappear_hours?: number }) =>
      req(URLS.messages, "/messages", "POST", d),
    react: (message_id: number, emoji: string) =>
      req(URLS.messages, "/reactions", "POST", { message_id, emoji }),
    searchUsers: (q: string) =>
      req(URLS.messages, `/users/search?q=${encodeURIComponent(q)}`),
  },
  groups: {
    list: () => req(URLS.groups, "/groups"),
    create: (d: { name: string; description?: string }) =>
      req(URLS.groups, "/groups", "POST", d),
    messages: (groupId: number, offset = 0) =>
      req(URLS.groups, `/${groupId}/messages?offset=${offset}`),
    send: (groupId: number, content: string, disappear_hours?: number) =>
      req(URLS.groups, `/${groupId}/messages`, "POST", { content, disappear_hours }),
    join: (groupId: number) =>
      req(URLS.groups, `/${groupId}/join`, "POST"),
    react: (groupId: number, message_id: number, emoji: string) =>
      req(URLS.groups, `/${groupId}/reactions`, "POST", { message_id, emoji }),
  },
  channels: {
    list: () => req(URLS.channels, "/channels"),
    create: (d: { name: string; description?: string }) =>
      req(URLS.channels, "/channels", "POST", d),
    posts: (channelId: number, offset = 0) =>
      req(URLS.channels, `/${channelId}/posts?offset=${offset}`),
    post: (channelId: number, content: string) =>
      req(URLS.channels, `/${channelId}/posts`, "POST", { content }),
    subscribe: (channelId: number) =>
      req(URLS.channels, `/${channelId}/subscribe`, "POST"),
    react: (channelId: number, post_id: number, emoji: string) =>
      req(URLS.channels, `/${channelId}/reactions`, "POST", { post_id, emoji }),
  },
  admin: {
    stats: () => req(URLS.admin, "/stats"),
    users: (q?: string) => req(URLS.admin, `/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    blockUser: (id: number, reason: string, hours?: number) =>
      req(URLS.admin, `/users/${id}/block`, "POST", { reason, hours }),
    unblockUser: (id: number) =>
      req(URLS.admin, `/users/${id}/unblock`, "POST"),
    groups: (q?: string) => req(URLS.admin, `/groups${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    groupMessages: (groupId: number) =>
      req(URLS.admin, `/group-messages?group_id=${groupId}`),
    deactivateGroup: (groupId: number) =>
      req(URLS.admin, `/deactivate-group?group_id=${groupId}`, "PUT"),
    channels: (q?: string) => req(URLS.admin, `/channels${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    channelMessages: (channelId: number) =>
      req(URLS.admin, `/channel-messages?channel_id=${channelId}`),
    deactivateChannel: (channelId: number) =>
      req(URLS.admin, `/deactivate-channel?channel_id=${channelId}`, "PUT"),
  },
};
