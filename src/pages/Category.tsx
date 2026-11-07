import { useEffect, useRef, useState } from "react";
import { api, fmt } from "../api";
import type { Post, VideoCard } from "../types";
import { useStore } from "../store";
import { Masonry, RowCard } from "../components/cards";
import { Empty, Img } from "../components/ui";
import { IBack, IChevR, IGrid, ITrophy } from "../icons";

export const CHANNELS = [
  { cate: "ai-duanju", name: "AI成人短剧", desc: "高能反转 · 一口气看完" },
  { cate: "ai-manju", name: "AI成人漫剧", desc: "国创漫剧 · 每周更新" },
  { cate: "ai-huanlian", name: "AI换脸", desc: "换脸演绎 · 全新剧情" },
  { cate: "ai-mogai", name: "AI魔改", desc: "魔改名场面 · 脑洞大开" },
] as const;

/* ================= 分类总览 ================= */
export default function Category({ wide }: { wide: boolean }) {
  const { push } = useStore();
  const [rows, setRows] = useState<Record<string, VideoCard[]>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        CHANNELS.map(async (c) => {
          try {
            const res = await api.category(c.cate, 1, 8);
            return [c.cate, res?.items || []] as const;
          } catch {
            return [c.cate, [] as VideoCard[]] as const;
          }
        }),
      );
      let p: Post[] = [];
      try { p = (await api.posts(1, 8))?.items || []; } catch { p = []; }
      if (!alive) return;
      setRows(Object.fromEntries(entries));
      setPosts(p);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="absolute inset-0 bg-bg page-aura flex flex-col">
      <div className="shrink-0 px-4 pb-2" style={{ paddingTop: "calc(var(--sat, 0px) + 14px)" }}>
        <div className="flex items-end gap-2.5">
          <span className="text-[23px] font-extrabold tracking-tight text-on leading-none">频道分类</span>
          <span className="text-[11px] text-mut pb-0.5">{CHANNELS.length + 1} 大精选专区 · 每日热播更新</span>
        </div>
      </div>

      <div className="flex-1 scroll-y pt-2" style={{ paddingBottom: "calc(var(--sab, 0px) + 96px)" }}>
        {/* 排行榜入口（大厂黑金/暖色流光横幅） */}
        <button onClick={() => push({ kind: "ranks" })}
          className="mx-4 mb-5 w-[calc(100%-2rem)] flex items-center gap-3.5 rounded-(--r-md) glass-card p-3.5 text-left pressable relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(80% 140% at 0% 0%, rgba(247,195,85,.18) 0%, transparent 65%)" }} />
          <span className="relative w-10 h-10 rounded-(--r-sm) gold-grad flex items-center justify-center shrink-0 elev-1"><ITrophy size={20} /></span>
          <span className="relative flex-1">
            <span className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-on">全站热播总榜</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold gold-grad">TOP 50</span>
            </span>
            <span className="block text-[11px] text-mut mt-0.5">热播榜 · 推荐榜 · 潜力飙升榜</span>
          </span>
          <IChevR size={16} className="relative text-mut" />
        </button>

        {CHANNELS.map((c, ci) => {
          const list = rows[c.cate] || [];
          return (
            <section key={c.cate} className="mb-5 a-rise" style={{ animationDelay: `${Math.min(ci * 50, 300)}ms` }}>
              <button onClick={() => push({ kind: "channel", cate: c.cate, name: c.name })}
                className="w-full flex items-center gap-3 px-4 mb-2.5 text-left pressable group">
                <span className="w-[36px] h-[36px] rounded-(--r-sm) tonal flex items-center justify-center shrink-0">
                  <IGrid size={18} strokeWidth={2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15.5px] font-bold text-on leading-tight">{c.name}</span>
                  <span className="block text-[10.5px] text-mut mt-0.5 truncate">{c.desc}</span>
                </span>
                <span className="flex items-center gap-0.5 px-2.5 h-6 rounded-full bg-white/6 text-[11px] font-medium text-mut group-hover:text-primary transition-colors">
                  全部<IChevR size={13} />
                </span>
              </button>
              <div className="scroll-x flex gap-2.5 px-4 snap-x">
                {list.map((v) => (
                  <RowCard key={v.id} v={v} onOpen={() => push({ kind: "feed", videoIds: list.map((x) => x.id), index: list.findIndex((x) => x.id === v.id), title: c.name })} />
                ))}
                {!list.length && <div className="h-[150px] flex items-center text-[11.5px] text-dim px-1">{loading ? "加载中…" : "暂无内容"}</div>}
              </div>
            </section>
          );
        })}

        {/* 吃瓜 */}
        <section className="mb-5 a-rise">
          <button onClick={() => push({ kind: "posts" })}
            className="w-full flex items-center gap-3 px-4 mb-2.5 text-left pressable group">
            <span className="w-[36px] h-[36px] rounded-(--r-sm) tonal flex items-center justify-center shrink-0">
              <IGrid size={18} strokeWidth={2} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15.5px] font-bold text-on leading-tight">黄果吃瓜</span>
              <span className="block text-[10.5px] text-mut mt-0.5 truncate">圈内爆料 · 每日更新</span>
            </span>
            <span className="flex items-center gap-0.5 px-2.5 h-6 rounded-full bg-white/6 text-[11px] font-medium text-mut group-hover:text-primary transition-colors">
              全部<IChevR size={13} />
            </span>
          </button>
          <div className="scroll-x flex gap-2.5 px-4 snap-x">
            {posts.map((post) => (
              <button key={post.id} onClick={() => push({ kind: "post", id: post.id })}
                className="w-[112px] shrink-0 text-left snap-start pressable">
                <div className="relative w-full rounded-(--r-md) overflow-hidden bg-s1 elev-1 ring-1 ring-white/8" style={{ paddingTop: "135%" }}>
                  <Img src={post.cover} />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                  <span className="absolute bottom-1.5 right-1.5 text-[9.5px] font-semibold text-white/95 tsh">{fmt(post.hot)}</span>
                </div>
                <div className="mt-2 text-[12px] font-semibold text-on clamp-1 leading-tight">{post.title}</div>
              </button>
            ))}
            {!posts.length && <div className="h-[150px] flex items-center text-[11.5px] text-dim px-1">{loading ? "加载中…" : "暂无内容"}</div>}
          </div>
        </section>

        <div className="px-4 text-center text-[10.5px] text-dim pt-1">— 已展示全部频道 —</div>
      </div>
      {wide && <div />}
    </div>
  );
}

/* ================= 频道详情页 ================= */
export function ChannelPage({ cate, name, onBack, wide }: { cate: string; name: string; onBack: () => void; wide: boolean }) {
  const { push } = useStore();
  const [sort, setSort] = useState<"最新" | "最热" | "高分">("最新");
  const [items, setItems] = useState<VideoCard[]>([]);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = async () => {
    if (busy.current || page >= pages) return;
    busy.current = true;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await api.category(cate, next, 20);
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...(res?.items || []).filter((x) => !seen.has(x.id))];
      });
      setPage(next);
      setPages(res?.pagination?.pages || next);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message || "加载失败");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  useEffect(() => { loadMore(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) loadMore(); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages]);

  const sorted = [...items].sort((a, b) => {
    if (sort === "最热") return (b.hot || 0) - (a.hot || 0);
    if (sort === "高分") return (b.score || 0) - (a.score || 0);
    return b.id - a.id;
  });

  return (
    <div className="absolute inset-0 bg-bg page-aura flex flex-col">
      <div className="shrink-0 border-b border-white/6 bg-s1/60 backdrop-blur-xl" style={{ paddingTop: "var(--sat, 0px)" }}>
        <div className="px-3 pt-2 pb-3 flex items-center gap-2.5">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center text-on hover:bg-s3 pressable"><IBack size={19} /></button>
          <span className="w-[38px] h-[38px] rounded-(--r-sm) tonal flex items-center justify-center"><IGrid size={20} strokeWidth={1.9} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[16.5px] font-bold text-on leading-tight">{name}</div>
            <div className="text-[10.5px] text-mut">共 {items.length} 部 · 已加载 {page}/{Math.max(pages, 1)} 页</div>
          </div>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          {(["最新", "最热", "高分"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)}
              className={`px-4 h-8 rounded-(--r-ctl) text-[12px] font-semibold pressable ${sort === s ? "brand-grad glow-neon" : "bg-white/6 text-mut"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 scroll-y px-3.5 pt-3 pb-8">
        {sorted.length ? (
          <Masonry videos={sorted} wide={wide} onOpen={(v) => push({ kind: "feed", videoIds: sorted.map((x) => x.id), index: sorted.findIndex((x) => x.id === v.id), title: name })} />
        ) : err ? (
          <Empty icon={<IGrid size={26} />} title="加载失败" sub={err} action="重试" onAction={loadMore} />
        ) : (
          <div className="flex justify-center py-10"><div className="w-8 h-8 spinner" /></div>
        )}
        <div ref={sentinel} className="h-10" />
        {loading && <div className="flex justify-center py-3"><div className="w-6 h-6 spinner" /></div>}
        {!loading && page >= pages && sorted.length > 0 && (
          <div className="text-center text-[10.5px] text-dim py-3">— 已经到底啦 —</div>
        )}
      </div>
    </div>
  );
}