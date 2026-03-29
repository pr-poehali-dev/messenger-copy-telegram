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
      "X-Auth-Token": getToken(),
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
      req(URLS.auth, "/?action=register", "POST", d),
    login: (d: { login: string; password: string }) =>
      req(URLS.auth, "/?action=login", "POST", d),
    logout: () => req(URLS.auth, "/?action=logout", "POST"),
    me: () => req(URLS.auth, "/?action=me"),
    updateProfile: (d: { display_name?: string; bio?: string; avatar_url?: string }) =>
      req(URLS.auth, "/?action=profile", "PUT", d),
  },
  messages: {
    chats: () => req(URLS.messages, "/?action=chats"),
    list: (withUser: number, offset = 0) =>
      req(URLS.messages, `/?action=messages&with=${withUser}&offset=${offset}`),
    send: (d: { receiver_id: number; content: string; disappear_hours?: number }) =>
      req(URLS.messages, "/?action=send", "POST", d),
    react: (message_id: number, emoji: string) =>
      req(URLS.messages, "/?action=react", "POST", { message_id, emoji }),
    searchUsers: (q: string) =>
      req(URLS.messages, `/?action=search&q=${encodeURIComponent(q)}`),
  },
  groups: {
    list: () => req(URLS.groups, "/?action=list"),
    create: (d: { name: string; description?: string }) =>
      req(URLS.groups, "/?action=create", "POST", d),
    messages: (groupId: number, offset = 0) =>
      req(URLS.groups, `/?action=messages&group_id=${groupId}&offset=${offset}`),
    send: (groupId: number, content: string, disappear_hours?: number) =>
      req(URLS.groups, `/?action=send&group_id=${groupId}`, "POST", { content, disappear_hours }),
    join: (groupId: number) =>
      req(URLS.groups, `/?action=join&group_id=${groupId}`, "POST"),
    react: (groupId: number, message_id: number, emoji: string) =>
      req(URLS.groups, `/?action=react&group_id=${groupId}`, "POST", { message_id, emoji }),
  },
  channels: {
    list: () => req(URLS.channels, "/?action=list"),
    create: (d: { name: string; description?: string }) =>
      req(URLS.channels, "/?action=create", "POST", d),
    posts: (channelId: number, offset = 0) =>
      req(URLS.channels, `/?action=posts&channel_id=${channelId}&offset=${offset}`),
    post: (channelId: number, content: string) =>
      req(URLS.channels, `/?action=post&channel_id=${channelId}`, "POST", { content }),
    subscribe: (channelId: number) =>
      req(URLS.channels, `/?action=subscribe&channel_id=${channelId}`, "POST"),
    react: (channelId: number, post_id: number, emoji: string) =>
      req(URLS.channels, `/?action=react&channel_id=${channelId}`, "POST", { post_id, emoji }),
  },
  admin: {
    stats: () => req(URLS.admin, "/?action=stats"),
    users: (q?: string) => req(URLS.admin, `/?action=users${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    blockUser: (id: number, reason: string, hours?: number) =>
      req(URLS.admin, `/?action=block&user_id=${id}`, "POST", { reason, hours }),
    unblockUser: (id: number) =>
      req(URLS.admin, `/?action=unblock&user_id=${id}`, "POST"),
    groups: (q?: string) => req(URLS.admin, `/?action=groups${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    groupMessages: (groupId: number) =>
      req(URLS.admin, `/?action=group-messages&group_id=${groupId}`),
    deactivateGroup: (groupId: number) =>
      req(URLS.admin, `/?action=deactivate-group&group_id=${groupId}`, "PUT"),
    channels: (q?: string) => req(URLS.admin, `/?action=channels${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    channelMessages: (channelId: number) =>
      req(URLS.admin, `/?action=channel-messages&channel_id=${channelId}`),
    deactivateChannel: (channelId: number) =>
      req(URLS.admin, `/?action=deactivate-channel&channel_id=${channelId}`, "PUT"),
  },
};