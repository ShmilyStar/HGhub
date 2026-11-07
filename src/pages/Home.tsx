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
  const [resumeItem, setResumeItem] = useState<{ id: number; title: string; ep: number } | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const loadingRef = useRef(false);

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

  const load = useCallback(async (p: number) => {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api.feed(p, 10);
      const list = res?.items || [];
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...list.filter((x) => !seen.has(x.id))];
      });
      setPage(p);
      if (!list.length || (res?.pagination && p >= res.pagination.pages)) setDone(true);
    } catch (e) {
      toast((e as Error).message || "加载失败", "info");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [done, toast]);

  useEffect(() => { if (!items.length) load(1); /* eslint-disable-next-line */ }, []);

  const ids = items.map((v) => v.id);

  return (
    <div className="absolute inset-0 bg-black">
      {items.length ? (
        <Feed videoIds={ids} mode="home" active={active} bottomInset={bottomInset}
          onNearEnd={() => { if (!loading && !done) load(page + 1); }} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><div className="w-9 h-9 spinner" /></div>
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