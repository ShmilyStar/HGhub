import { useCallback, useEffect, useRef, useState } from "react";
import Feed from "../components/Feed";
import { api, platform } from "../api";
import type { VideoCard } from "../types";
import { useStore } from "../store";
import { IClose, ISearch, IShield, IVol, IVolMute } from "../icons";

export default function Home({ active, bottomInset }: { active: boolean; bottomInset: number }) {
  const { muted, setMuted, setTab, toast, fs, lockDisguiseNow, history, progress, push } = useStore();
  const [items, setItems] = useState<VideoCard[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeItem, setResumeItem] = useState<{ id: number; title: string; ep: number } | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const loadingRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const lastId = history[0];
    const lastProg = lastId ? progress[lastId] : null;
    if (lastId && lastProg && lastProg.ep >= 1) {
      let alive = true;
      api.video(lastId).then((v) => {
        if (!alive || !v?.title) return;
        setResumeItem({ id: lastId, title: v.title, ep: lastProg.ep });
      }).catch(() => {});
      return () => { alive = false; };
    }
  }, [history[0]]);

  const load = useCallback(async (p: number, isAutoRetry = false) => {
    if (loadingRef.current) return;
    if (p > 1 && done) return;

    if (!isAutoRetry && p === 1) {
      retryCountRef.current = 0;
    }

    loadingRef.current = true;
    setLoading(true);
    if (p === 1) {
      setError(null);
      setDone(false);
    }

    try {
      const res = await api.feed(p, 10);
      const list = res?.items || [];
      if (list.length > 0) {
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...list.filter((x) => !seen.has(x.id))];
        });
        setPage(p);
        setError(null);
        retryCountRef.current = 0;
        if (res?.pagination && p >= res.pagination.pages) {
          setDone(true);
        }
      } else {
        if (p === 1) {
          if (retryCountRef.current < 3) {
            const delay = [700, 1600, 3000][retryCountRef.current] || 2000;
            retryCountRef.current += 1;
            loadingRef.current = false;
            setLoading(true);
            if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = window.setTimeout(() => {
              load(1, true);
            }, delay);
            return;
          } else {
            setError("未能获取到推荐剧集，请点击重试");
          }
        } else {
          setDone(true);
        }
      }
    } catch (e) {
      const msg = (e as Error).message || "加载失败";
      if (p === 1) {
        if (retryCountRef.current < 3) {
          const delay = [700, 1600, 3000][retryCountRef.current] || 2000;
          retryCountRef.current += 1;
          loadingRef.current = false;
          setLoading(true);
          if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => {
            load(1, true);
          }, delay);
          return;
        } else {
          setError(msg);
          toast(msg, "info");
        }
      } else {
        toast(msg, "info");
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [done, toast]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, []);

  // 1. 挂载首次拉取
  useEffect(() => {
    if (!items.length) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 切回首页时（active: false -> true），若列表仍为空且未在加载，自动拉取
  useEffect(() => {
    if (active && !items.length && !loadingRef.current) {
      load(1);
    }
  }, [active, items.length, load]);

  const ids = items.map((v) => v.id);

  return (
    <div className="absolute inset-0 bg-black">
      {items.length ? (
        <Feed videoIds={ids} mode="home" active={active} bottomInset={bottomInset}
          onNearEnd={() => { if (!loading && !done) load(page + 1); }} />
      ) : loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 spinner" />
          <span className="text-[12px] text-white/50 tracking-wider font-medium">推荐加载中…</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber mb-3 shadow-[0_0_24px_rgba(247,195,85,0.18)]">
            <span className="text-[22px]">⚠️</span>
          </div>
          <div className="text-[15px] font-bold text-white mb-1">推荐加载失败</div>
          <div className="text-[12px] text-white/50 max-w-[260px] mb-4 leading-relaxed">
            {error || "网络连接异常或代理预热中，请点击重试"}
          </div>
          <button
            onClick={() => { setError(null); load(1); }}
            className="px-6 h-9 rounded-full brand-grad text-white text-[13px] font-bold shadow-lg pressable">
            点击重试
          </button>
        </div>
      )}

      {/* 顶部浮动：继续追剧胶囊 */}
      {resumeItem && !resumeDismissed && !fs && (
        <div
          className="absolute left-3 z-30 pointer-events-auto flex items-center gap-2 pl-3 pr-2 h-8.5 rounded-full bg-black/65 backdrop-blur-md border border-amber/35 text-[11px] text-white shadow-[0_4px_16px_rgba(245,166,35,0.22)] a-pop"
          style={{ top: "calc(var(--sat, 0px) + 8px)", maxWidth: "calc(100% - 150px)" }}>
          <button
            onClick={() => {
              push({ kind: "feed", videoIds: [resumeItem.id], index: 0, title: resumeItem.title });
            }}
            className="flex items-center gap-1.5 truncate text-left pressable">
            <span className="text-[#ffd27d] font-bold">▶ 继续看</span>
            <span className="truncate text-white/90 font-medium">《{resumeItem.title}》第{resumeItem.ep}集</span>
          </button>
          <button
            onClick={() => setResumeDismissed(true)}
            className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white shrink-0 pressable"
            aria-label="关闭">
            <IClose size={10} />
          </button>
        </div>
      )}

      {/* 移动端：一键防查岗伪装 + 静音 + 搜索 */}
      {platform === "android" && !fs && (
        <div className="absolute inset-x-0 z-20 flex items-center px-3 pointer-events-none" style={{ top: "calc(var(--sat, 0px) + 6px)" }}>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={lockDisguiseNow}
              aria-label="紧急伪装成计算器"
              title="一键伪装计算器"
              className="pointer-events-auto w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-[#f7c355] pressable elev-1">
              <IShield size={17} />
            </button>
            <button onClick={() => setMuted((m) => !m)}
              className="pointer-events-auto w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white/90 pressable elev-1">
              {muted ? <IVolMute size={17} /> : <IVol size={17} />}
            </button>
            <button onClick={() => setTab("search")}
              className="pointer-events-auto w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white/90 pressable elev-1">
              <ISearch size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}