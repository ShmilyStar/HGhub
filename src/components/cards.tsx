import React from "react";
import { cover, fmt } from "../api";
import type { VideoCard } from "../types";
import { IHeartF, IPlayF } from "../icons";
import { Img } from "./ui";

/* ——— 瀑布流卡片 ——— */
export function WaterfallCard({ v, onOpen }: { v: VideoCard; onOpen: () => void }) {
  const ratio = 1.32;
  return (
    <button onClick={onOpen}
      className="relative w-full overflow-hidden text-left bg-s1 elev-1 ring-1 ring-white/8 pressable block rounded-(--r-md)"
      style={{ paddingTop: `${ratio * 100}%` }}>
      <Img src={v.cover} />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9.5px] font-bold elev-1 ${v.is_finished ? "gold-grad" : "brand-grad"}`}>
        {v.is_finished ? "已完结" : `更新至${v.episode_count}集`}
      </span>
      <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[9.5px] font-semibold text-white/95">
        <IPlayF size={9} />{fmt(v.hot)}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <div className="text-[12px] font-semibold text-white leading-snug clamp-2 tsh">{v.title}</div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-white/70 truncate max-w-[62%]">{v.author?.name || "黄果短剧"}</span>
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-white/85"><IHeartF size={10} className="text-neon" />{fmt(v.like_count)}</span>
        </div>
      </div>
    </button>
  );
}

/* ——— 近无缝瀑布流 ——— */
export function Masonry({ videos, onOpen, wide = false, gap = "gap-2" }: {
  videos: VideoCard[]; onOpen: (v: VideoCard) => void; wide?: boolean; gap?: string;
}) {
  const mb = gap === "gap-1" ? "mb-1" : "mb-2";
  return (
    <div className={`${wide ? "columns-3 xl:columns-4" : "columns-2"} ${gap} [column-fill:balance]`}>
      {videos.map((v) => (
        <div key={v.id} className={`break-inside-avoid ${mb}`}>
          <WaterfallCard v={v} onOpen={() => onOpen(v)} />
        </div>
      ))}
    </div>
  );
}

/* ——— 分类横向卡片 ——— */
export function RowCard({ v, onOpen }: { v: VideoCard; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-[112px] shrink-0 text-left snap-start pressable group">
      <div className="relative w-full rounded-(--r-md) overflow-hidden bg-s1 elev-1 ring-1 ring-white/8" style={{ paddingTop: "135%" }}>
        <Img src={v.cover} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold ${v.is_finished ? "gold-grad" : "brand-grad"}`}>
          {v.is_finished ? "完结" : `${v.episode_count}集`}
        </span>
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 text-[9.5px] font-semibold text-white/95 tsh"><IPlayF size={9} />{fmt(v.hot)}</span>
      </div>
      <div className="mt-2 text-[12px] font-semibold text-on clamp-1 leading-tight group-hover:text-primary transition-colors">{v.title}</div>
      <div className="text-[10px] text-mut clamp-1 mt-0.5">{v.tags?.slice(0, 2).join(" · ") || "精选短剧"}</div>
    </button>
  );
}

/* ——— 排行榜条目 ——— */
export function RankRow({ item, onOpen, metricMax }: {
  item: { rank: number; video_id: number; title: string; cover: string; tags: string[]; score: number; metric_value: number; metric_label: string };
  onOpen: () => void; metricMax: number;
}) {
  const i = item.rank - 1;
  const rankBadge =
    i === 0
      ? "gold-grad shadow-[0_4px_12px_rgba(247,195,85,0.35)]"
      : i === 1
        ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900"
        : i === 2
          ? "bg-gradient-to-br from-amber-300 to-amber-600 text-amber-950"
          : "bg-s3 text-mut";
  return (
    <button onClick={onOpen}
      className={`w-full flex items-center gap-3.5 p-3 rounded-(--r-md) text-left mb-2.5 pressable a-rise glass-card`}
      style={{ animationDelay: `${Math.min(i * 35, 300)}ms` }}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] font-extrabold shrink-0 tabular-nums ${rankBadge}`}>{item.rank}</span>
      <div className="relative w-[54px] h-[72px] rounded-(--r-sm) overflow-hidden bg-s3 ring-1 ring-white/10 shrink-0">
        <Img src={item.cover} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-on clamp-2 leading-snug">{item.title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10.5px] text-mut truncate">{item.tags?.slice(0, 2).join(" · ") || "热播短剧"}</span>
          <span className="ml-auto flex items-center gap-0.5 text-[10.5px] font-bold text-primary tabular-nums">{fmt(item.metric_value)} 热度</span>
        </div>
        <div className="mt-2 h-[3.5px] rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full brand-grad" style={{ width: `${Math.max(8, Math.round((item.metric_value / Math.max(1, metricMax)) * 100))}%` }} />
        </div>
      </div>
    </button>
  );
}