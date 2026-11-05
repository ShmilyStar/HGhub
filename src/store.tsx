import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, platform as envPlatform } from "./api";
import type { User } from "./types";

export type Platform = "android" | "windows" | "macos";
export type Theme = "dark" | "light";
export type Tab = "home" | "search" | "category" | "profile";

/** 播放页上下文：ids 是来源列表，index 是当前条目。 */
export type FeedContext = {
  kind: "feed";
  key: string;
  videoIds: number[];
  index: number;
  title: string;
  source: string;
  feedKind?: "video" | "post";
};

export type Page =
  | FeedContext
  | { kind: "channel"; key: string; cate: string; name: string }
  | { kind: "ranks"; key: string }
  | { kind: "posts"; key: string }
  | { kind: "post"; key: string; id: number };

export type PageInput =
  | { kind: "feed"; videoIds: number[]; index: number; title: string; source?: string; feedKind?: "video" | "post" }
  | { kind: "channel"; cate: string; name: string }
  | { kind: "ranks" }
  | { kind: "posts" }
  | { kind: "post"; id: number };

export type Toast = { id: number; msg: string; icon?: "ok" | "heart" | "star" | "info" };

export type WatchProgress = {
  ep: number;
  time: number;
  totalEp?: number;
  updatedAt: number;
};

type Persist = {
  likes: number[];
  favs: number[];
  history: number[];
  follows: number[];
  muted: boolean;
  volume: number;
  searchHist: string[];
  vipExpireAt: number; // 0=未开通, -1=永久, >0=到期毫秒时间戳
  vipCode: string;
  deviceId: string;
  progress: Record<number, WatchProgress>;
};

function genDeviceId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "HG-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const LS = "hghub_app_v1";
const DEFAULTS: Persist = {
  likes: [], favs: [], history: [], follows: [],
  muted: true, volume: 0.7, searchHist: [],
  vipExpireAt: 0, vipCode: "", deviceId: "",
  progress: {},
};

function loadPersist(): Persist {
  try {
    const raw = localStorage.getItem(LS);
    const parsed = raw ? (JSON.parse(raw) as Partial<Persist>) : {};
    const merged = { ...DEFAULTS, ...parsed };
    if (!merged.deviceId) merged.deviceId = genDeviceId();
    return merged;
  } catch {
    return { ...DEFAULTS, deviceId: genDeviceId() };
  }
}

export function formatVipExpire(expireAt: number, now = Date.now()): {
  isVip: boolean;
  statusText: string;
  expireDateText: string;
  remainText: string;
} {
  if (expireAt === -1) {
    return {
      isVip: true,
      statusText: "尊享永久 VIP",
      expireDateText: "永久有效",
      remainText: "不限时长 · 全集畅看",
    };
  }
  if (expireAt > now) {
    const d = new Date(expireAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const expireDateText = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const diffMs = expireAt - now;
    const days = Math.floor(diffMs / 86400_000);
    const hours = Math.floor((diffMs % 86400_000) / 3600_000);
    const remainText = days > 0 ? `剩余 ${days} 天 ${hours} 小时` : `剩余 ${Math.max(1, hours)} 小时`;
    return {
      isVip: true,
      statusText: "尊享 VIP 会员",
      expireDateText,
      remainText,
    };
  }
  if (expireAt > 0 && expireAt <= now) {
    return {
      isVip: false,
      statusText: "VIP 已过期",
      expireDateText: "已到期",
      remainText: "每集免费试看 15 秒",
    };
  }
  return {
    isVip: false,
    statusText: "免费试看模式",
    expireDateText: "未开通",
    remainText: "每集免费试看 15 秒",
  };
}

function readTheme(): Theme {
  try {
    return localStorage.getItem("hghub_theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

type Store = {
  platform: Platform;
  theme: Theme; setTheme: (t: Theme) => void;
  tab: Tab; setTab: (t: Tab) => void;
  stack: Page[]; push: (p: PageInput) => void; pop: () => void;
  user: User | null; setUser: (u: User | null) => void;
  loginOpen: boolean; setLoginOpen: (b: boolean) => void;
  logout: () => Promise<void>;
  likes: number[]; favs: number[]; history: number[]; follows: number[];
  isLiked: (id: number) => boolean; isFav: (id: number) => boolean;
  toggleLikeLocal: (id: number) => boolean;
  toggleFavLocal: (id: number) => boolean;
  addHistory: (id: number) => void;
  clearHistory: () => void;
  clearLocal: () => void;
  toggleFollowLocal: (uid: number) => boolean;
  theater: boolean; setTheater: (v: boolean | ((p: boolean) => boolean)) => void;
  fs: boolean; setFs: (v: boolean | ((p: boolean) => boolean)) => void;
  muted: boolean; setMuted: (v: boolean | ((p: boolean) => boolean)) => void;
  volume: number; setVolume: (v: number) => void;
  searchHist: string[]; addSearch: (q: string) => void; clearSearchHist: () => void;
  toasts: Toast[]; toast: (msg: string, icon?: Toast["icon"]) => void;
  /* VIP 会员与卡密状态 */
  isVip: boolean;
  vipExpireAt: number;
  vipCode: string;
  deviceId: string;
  vipModalOpen: boolean;
  setVipModalOpen: (b: boolean) => void;
  activateVip: (rawCode: string) => { ok: boolean; msg: string };
  /* 剧集断点续播进度 */
  progress: Record<number, WatchProgress>;
  saveProgress: (id: number, ep: number, time: number, totalEp?: number, force?: boolean) => void;
  getProgress: (id: number) => WatchProgress | undefined;
};

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);
let seq = 0;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Persist>(loadPersist);
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [tab, setTabRaw] = useState<Tab>("home");
  const [stack, setStack] = useState<Page[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theater, setTheaterState] = useState(false);
  const [fs, setFsState] = useState(false);
  const toastSeq = useRef(0);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem("hghub_theme", theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(p)); } catch { /* ignore */ }
  }, [p]);

  useEffect(() => {
    api.boot()
      .then((r) => { if (r.user && (r.user as User).id) setUser(r.user as User); })
      .catch(() => { /* 离线也能用 */ });
  }, []);

  const toast = useCallback((msg: string, icon?: Toast["icon"]) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t.slice(-2), { id, msg, icon }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }, []);

  const setTab = useCallback((t: Tab) => { setTabRaw(t); setStack([]); }, []);
  const push = useCallback((pg: PageInput) => {
    setStack((s) => [...s, { ...pg, key: `p${++seq}` } as Page]);
  }, []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);

  const toggleLikeLocal = useCallback((id: number) => {
    let on = false;
    setP((s) => {
      on = !s.likes.includes(id);
      return { ...s, likes: on ? [id, ...s.likes] : s.likes.filter((x) => x !== id) };
    });
    return on;
  }, []);
  const toggleFavLocal = useCallback((id: number) => {
    let on = false;
    setP((s) => {
      on = !s.favs.includes(id);
      return { ...s, favs: on ? [id, ...s.favs] : s.favs.filter((x) => x !== id) };
    });
    return on;
  }, []);
  const toggleFollowLocal = useCallback((uid: number) => {
    let on = false;
    setP((s) => {
      on = !s.follows.includes(uid);
      return { ...s, follows: on ? [uid, ...s.follows] : s.follows.filter((x) => x !== uid) };
    });
    return on;
  }, []);
  const addHistory = useCallback((id: number) => {
    setP((s) => ({ ...s, history: [id, ...s.history.filter((x) => x !== id)].slice(0, 80) }));
  }, []);
  const clearHistory = useCallback(() => setP((s) => ({ ...s, history: [], progress: {} })), []);
  const clearLocal = useCallback(() => setP((s) => ({ ...s, likes: [], favs: [], history: [], searchHist: [], progress: {} })), []);
  const saveProgress = useCallback((id: number, ep: number, time: number, totalEp?: number, force = false) => {
    if (!id || ep < 1) return;
    setP((s) => {
      const prev = s.progress?.[id];
      const cleanTime = Math.max(0, Math.floor(time));
      if (
        !force &&
        prev &&
        prev.ep === ep &&
        Math.abs(prev.time - cleanTime) < 3 &&
        (!totalEp || prev.totalEp === totalEp)
      ) {
        return s;
      }
      return {
        ...s,
        progress: {
          ...(s.progress || {}),
          [id]: {
            ep,
            time: cleanTime,
            totalEp: totalEp || prev?.totalEp,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);
  const getProgress = useCallback((id: number) => p.progress?.[id], [p.progress]);
  const addSearch = useCallback((q: string) => {
    const t = q.trim();
    if (!t) return;
    setP((s) => ({ ...s, searchHist: [t, ...s.searchHist.filter((x) => x !== t)].slice(0, 12) }));
  }, []);
  const clearSearchHist = useCallback(() => setP((s) => ({ ...s, searchHist: [] })), []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setUser(null);
    toast("已退出登录", "info");
  }, [toast]);

  const setTheater = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setTheaterState((prev) => (typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : v));
  }, []);

  const setFs = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setFsState((prev) => (typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : v));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const setMuted = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setP((s) => ({ ...s, muted: typeof v === "function" ? v(s.muted) : v }));
  }, []);
  const setVolume = useCallback((v: number) => {
    const volume = Math.max(0, Math.min(1, v));
    setP((s) => ({ ...s, volume, muted: volume === 0 }));
  }, []);

  const activateVip = useCallback((rawCode: string): { ok: boolean; msg: string } => {
    const code = rawCode.trim();
    if (!code) return { ok: false, msg: "请输入数字卡密" };

    if (code === "0000") {
      setP((s) => ({ ...s, vipExpireAt: 0, vipCode: "" }));
      setNowTick(Date.now());
      toast("已重置为免费试看模式（15秒）", "info");
      return { ok: true, msg: "已重置为免费试看状态" };
    }

    const PLAN_MAP: Record<string, { days: number; label: string }> = {
      "1234": { days: 1, label: "体验天卡（1天）" },
      "1111": { days: 1, label: "体验天卡（1天）" },
      "2234": { days: 7, label: "尊享周卡（7天）" },
      "7777": { days: 7, label: "尊享周卡（7天）" },
      "3234": { days: 30, label: "尊享月卡（30天）" },
      "8888": { days: 30, label: "尊享月卡（30天）" },
      "4234": { days: 90, label: "尊享季卡（90天）" },
      "5234": { days: 365, label: "尊享年卡（365天）" },
      "6666": { days: 365, label: "尊享年卡（365天）" },
      "9234": { days: -1, label: "至尊永久卡" },
      "9999": { days: -1, label: "至尊永久卡" },
    };

    const plan = PLAN_MAP[code];
    if (!plan) {
      return { ok: false, msg: "卡密无效，请输入有效数字卡密（如 1234 / 2234 / 8888）" };
    }

    const now = Date.now();
    setP((s) => {
      if (plan.days === -1) {
        return { ...s, vipExpireAt: -1, vipCode: code };
      }
      const base = s.vipExpireAt === -1
        ? -1
        : s.vipExpireAt > now
          ? s.vipExpireAt
          : now;
      const nextExpire = base === -1 ? -1 : base + plan.days * 86400_000;
      return { ...s, vipExpireAt: nextExpire, vipCode: code };
    });
    setNowTick(now);
    toast(`激活成功 · 已开通${plan.label}`, "ok");
    return { ok: true, msg: `激活成功：${plan.label}` };
  }, [toast]);

  const isVip = p.vipExpireAt === -1 || p.vipExpireAt > nowTick;

  const value = useMemo<Store>(() => ({
    platform: envPlatform,
    theme, setTheme: setThemeState,
    tab, setTab, stack, push, pop,
    user, setUser, loginOpen, setLoginOpen, logout,
    likes: p.likes, favs: p.favs, history: p.history, follows: p.follows,
    isLiked: (id) => p.likes.includes(id),
    isFav: (id) => p.favs.includes(id),
    toggleLikeLocal, toggleFavLocal, toggleFollowLocal, addHistory, clearHistory, clearLocal,
    muted: p.muted, setMuted, volume: p.volume, setVolume, theater, setTheater, fs, setFs,
    searchHist: p.searchHist, addSearch, clearSearchHist,
    toasts, toast,
    isVip,
    vipExpireAt: p.vipExpireAt,
    vipCode: p.vipCode,
    deviceId: p.deviceId,
    vipModalOpen,
    setVipModalOpen,
    activateVip,
    progress: p.progress || {},
    saveProgress,
    getProgress,
  }), [theme, tab, setTab, stack, push, pop, user, loginOpen, logout,
    p, toggleLikeLocal, toggleFavLocal, toggleFollowLocal, addHistory, clearHistory, clearLocal,
    setMuted, setVolume, addSearch, clearSearchHist, toasts, toast, theater, setTheater, fs, setFs,
    isVip, vipModalOpen, activateVip, saveProgress, getProgress]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
