import { useEffect, useRef, useState } from "react";
import { api, fmt } from "../api";
import type { RankItem, VideoCard } from "../types";
import { useStore } from "../store";
import { Masonry, RankRow } from "../components/cards";
import { Empty } from "../components/ui";
import { IBack, IClose, IFireF, IRefresh, ISearch, ITrophy } from "../icons";

const HOT_TAGS = ["都市", "逆袭", "古风", "系统", "后宫", "校园", "仙侠", "职场", "大男主", "御姐", "脑洞", "奇幻"];

export default function Search({ active, wide }: { active: boolean; wide: boolean }) {
  const { push, searchHist, addSearch, clearSearchHist, toast } = useStore();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [items, setItems] = useState<VideoCard[]>([]);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (active && !/Android/i.test(navigator.userAgent)) inputRef.current?.focus();
  }, [active]);

  const run = async (keyword: string, p: number) => {
    if (busy.current) return;
    if (p > pages && p > 1) return;
    busy.current = true;
    setLoading(true);
    try {
      const res = await api.search(keyword, p, 20);
      setItems((prev) => {
        const base = p === 1 ? [] : prev;
        const seen = new Set(base.map((x) => x.id));
        return [...base, ...(res?.items || []).filter((x) => !seen.has(x.id))];
      });
      setPage(p);
      setPages(res?.pagination?.pages || 1);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message || "搜索失败");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const submit = (keyword: string) => {
    const k = keyword.trim();
    if (!k) return;
    setSubmitted(k);
    addSearch(k);
    setItems([]);
    setPages(1);
    run(k, 1);
  };

  const querying = submitted.length > 0;

  return (
    <div className="absolute inset-0 bg-bg page-aura flex flex-col">
      {/* 搜索栏 */}
      <div className="shrink-0 px-4 pb-3 flex items-center gap-2.5" style={{ paddingTop: "calc(var(--sat, 0px) + 12px)" }}>
        <form className="flex-1 flex items-center gap-2.5 h-11 rounded-(--r-ctl) glass-card px-4 focus-within:border-primary/50 transition-colors"
          onSubmit={(e) => { e.preventDefault(); submit(q); }}>
          <ISearch size={17} className="text-primary shrink-0" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索短剧、作者、热门题材…"
            className="flex-1 min-w-0 bg-transparent text-[13.5px] text-on placeholder-dim outline-none" />
          {q && <button type="button" onClick={() => { setQ(""); setSubmitted(""); setItems([]); }} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-mut pressable"><IClose size={11} /></button>}
        </form>
        <button onClick={() => push({ kind: "ranks" })} aria-label="排行榜"
          className="w-11 h-11 rounded-full flex items-center justify-center gold-grad pressable elev-2">
          <ITrophy size={19} />
        </button>
      </div>

      <div className="flex-1 scroll-y px-4 pb-28">
        {!querying ? (
          <>
            {searchHist.length > 0 && (
              <div className="mt-1 a-rise">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-on">搜索历史</span>
                  <button onClick={clearSearchHist} className="text-[11px] text-dim pressable">清空</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {searchHist.map((h) => (
                    <button key={h} onClick={() => { setQ(h); submit(h); }} className="px-3.5 h-8 rounded-(--r-ctl) bg-white/6 border border-white/8 text-[12px] text-on/85 pressable">{h}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-(--r-md) glass-card p-4 a-rise">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-on"><IFireF size={16} className="text-primary" />全网热门题材</span>
                <button onClick={() => push({ kind: "ranks" })} className="text-[11.5px] text-primary font-semibold pressable">热播总榜 ›</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3.5">
                {HOT_TAGS.map((t, idx) => (
                  <button key={t} onClick={() => { setQ(t); submit(t); }}
                    className={`px-3.5 h-8 rounded-(--r-ctl) text-[12px] font-medium pressable ${
                      idx < 3
                        ? "bg-gradient-to-r from-[#ff5e3a]/18 to-[#ff2a55]/14 border border-[#ff5e3a]/30 text-[#ff8b73]"
                        : "bg-white/6 border border-white/6 text-on/85"
                    }`}>
                    {idx < 3 && "🔥 "}{t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 mb-2">
              <span className="text-[13px] font-bold text-on">猜你想看</span>
              <button onClick={() => submit(HOT_TAGS[Math.floor(Math.random() * HOT_TAGS.length)])}
                className="flex items-center gap-1 px-2.5 h-6 rounded-full bg-white/6 text-[11px] text-mut pressable"><IRefresh size={12} />随机探索</button>
            </div>
            <p className="text-[11.5px] text-dim leading-relaxed">
              输入关键词后按回车搜索，或点击上方热门标签一键直达高分剧集。
            </p>
          </>
        ) : (
          <>
            <div className="text-[11.5px] text-mut mt-1 mb-2.5">「{submitted}」共找到 <span className="text-primary font-bold">{items.length}</span> 部剧集</div>
            {items.length ? (
              <>
                <Masonry videos={items} wide={wide} onOpen={(v) => push({ kind: "feed", videoIds: items.map((x) => x.id), index: items.findIndex((x) => x.id === v.id), title: `搜索 · ${submitted}` })} />
                <div className="flex justify-center py-4">
                  {loading ? <div className="w-6 h-6 spinner" />
                    : page < pages ? (
                      <button onClick={() => run(submitted, page + 1)} className="px-5 h-9 rounded-(--r-ctl) glass-card text-[12px] text-on/85 pressable">加载更多</button>
                    ) : <span className="text-[10.5px] text-dim">— 已经到底啦 —</span>}
                </div>
              </>
            ) : loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 spinner" /></div>
            ) : (
              <Empty icon={<ISearch size={26} />} title={err || "没有找到相关内容"} sub="换个关键词试试，比如「都市」「逆袭」"
                action="看看热榜" onAction={() => push({ kind: "ranks" })} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ================= 排行榜 ================= */
const RANK_TABS = [
  { k: "hot", label: "热播榜", desc: "按全网实时热力指数排序" },
  { k: "recommend", label: "推荐榜", desc: "按编辑精选与高分推荐排序" },
  { k: "potential", label: "潜力榜", desc: "按新剧黑马飙升指数排序" },
] as const;

export function RankPage({ onBack, wide }: { onBack: () => void; wide: boolean }) {
  const { push, toast } = useStore();
  const [tab, setTab] = useState<"hot" | "recommend" | "potential">("hot");
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.rank(tab)
      .then((res) => { if (alive) setItems(res?.items || []); })
      .catch((e) => { if (alive) { setItems([]); toast((e as Error).message || "榜单加载失败", "info"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab, toast]);

  const max = Math.max(1, ...items.map((x) => x.metric_value || 0));
  const meta = RANK_TABS.find((t) => t.k === tab)!;

  return (
    <div className="absolute inset-0 bg-bg page-aura flex flex-col">
      <div className="shrink-0 relative overflow-hidden border-b border-white/6 bg-s1/65 backdrop-blur-xl" style={{ paddingTop: "var(--sat, 0px)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(90% 130% at 95% 0%, rgba(247,195,85,.24) 0%, rgba(255,82,56,.14) 45%, transparent 72%)" }} />
        <div className="relative px-3.5 pt-2 pb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center text-on hover:bg-s3 pressable"><IBack size={19} /></button>
          <div className="px-1.5 mt-1.5 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-(--r-sm) gold-grad elev-1 flex items-center justify-center"><ITrophy size={20} /></span>
                <span className="text-[23px] font-extrabold tracking-tight text-on">HG 权威热榜</span>
              </div>
              <div className="text-[11px] text-mut mt-1">{meta.desc} · 每 10 分钟实时更新</div>
            </div>
          </div>
          <div className="flex bg-black/30 border border-white/8 rounded-(--r-ctl) p-1 mt-3.5">
            {RANK_TABS.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`flex-1 h-8 rounded-(--r-ctl) text-[12px] font-bold transition-all ${tab === t.k ? "brand-grad glow-neon" : "text-mut"}`}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 scroll-y px-3.5 pt-3 pb-8">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 spinner" /></div>
        ) : items.length ? (
          items.map((it) => (
            <RankRow key={`${it.video_id}-${it.rank}`} item={it} metricMax={max}
              onOpen={() => push({ kind: "feed", videoIds: items.map((x) => x.video_id), index: items.findIndex((x) => x.video_id === it.video_id), title: "HG 热榜" })} />
          ))
        ) : (
          <Empty icon={<ITrophy size={26} />} title="榜单暂时为空" sub="稍后再来看看，或者去首页刷刷推荐" />
        )}
        {wide && <div className="h-2" />}
      </div>
    </div>
  );
}