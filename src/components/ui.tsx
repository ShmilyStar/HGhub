import React, { useEffect, useRef, useState } from "react";
import { cover } from "../api";
import { useStore } from "../store";
import { ICheck, IClose, IHeartF, ISparkF, IStarF } from "../icons";

/* ——— 头像 ——— */
export function Avatar({ hue = 250, icon, name, size = 40, ring = false, className = "" }: {
  hue?: number; icon?: React.ReactNode; name?: string; size?: number; ring?: boolean; className?: string;
}) {
  const inner = (
    <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden font-semibold"
      style={{ background: `hsl(${hue} 22% 30%)`, color: `hsl(${hue} 70% 88%)` }}>
      {icon ?? <span style={{ fontSize: size * 0.42 }} className="leading-none">{(name || "H").replace(/^@/, "")[0].toUpperCase()}</span>}
    </div>
  );
  return (
    <div className={`shrink-0 ${className}`} style={{ width: size, height: size }}>
      {ring ? <div className="w-full h-full rounded-full p-[2px] bg-primary"><div className="w-full h-full rounded-full bg-bg p-[2px]">{inner}</div></div> : inner}
    </div>
  );
}

/* ——— 底部弹层 ——— */
export function Sheet({ open, onClose, children, z = "z-40" }: { open: boolean; onClose: () => void; children: React.ReactNode; z?: string }) {
  const [render, setRender] = useState(open);
  useEffect(() => {
    if (open) setRender(true);
    else { const t = window.setTimeout(() => setRender(false), 230); return () => window.clearTimeout(t); }
  }, [open]);
  if (!render) return null;
  return (
    <div className={`absolute inset-0 ${z}`}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-xs ${open ? "a-fade" : "opacity-0 transition-opacity duration-200"}`} onClick={onClose} />
      <div className={`absolute bottom-0 inset-x-0 bg-s1/95 backdrop-blur-2xl border-t border-white/10 elev-3 overflow-hidden ${open ? "a-sheet" : "a-sheet-out"}`}
        style={{ paddingBottom: "var(--sab, 0px)", borderTopLeftRadius: "var(--r-lg)", borderTopRightRadius: "var(--r-lg)" }}>
        <div className="pt-3 pb-1 flex justify-center"><div className="w-9 h-1 rounded-full bg-white/20" /></div>
        {children}
      </div>
    </div>
  );
}

/* ——— 居中弹窗 ——— */
export function Modal({ open, onClose, children, width = 340 }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  const [render, setRender] = useState(open);
  useEffect(() => {
    if (open) setRender(true);
    else { const t = window.setTimeout(() => setRender(false), 200); return () => window.clearTimeout(t); }
  }, [open]);
  if (!render) return null;
  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center p-6">
      <div className={`absolute inset-0 bg-black/68 backdrop-blur-md ${open ? "a-fade" : "opacity-0 transition-opacity"}`} onClick={onClose} />
      <div className={`relative bg-s2/95 backdrop-blur-2xl border border-white/10 rounded-(--r-lg) elev-3 ${open ? "a-scale-in" : "opacity-0 scale-90 transition-all"}`} style={{ width, maxWidth: "100%" }}>
        {children}
      </div>
    </div>
  );
}

/* ——— 开关 ——— */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (b: boolean) => void; label?: string }) {
  return (
    <button onClick={() => onChange(!on)} aria-pressed={on} aria-label={label}
      className={`relative w-[46px] h-[26px] rounded-full transition-all duration-200 ${on ? "brand-grad glow-neon" : "bg-s4"}`}>
      <span className={`absolute top-[3px] w-5 h-5 rounded-full elev-1 transition-all duration-200 ${on ? "left-[23px] bg-white" : "left-[3px] bg-mut"}`} />
    </button>
  );
}

/* ——— 空状态 ——— */
export function Empty({ icon, title, sub, action, onAction }: {
  icon: React.ReactNode; title: string; sub?: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center a-rise">
      <div className="w-16 h-16 rounded-(--r-md) tonal flex items-center justify-center mb-4">{icon}</div>
      <div className="text-[15px] font-bold text-on/90">{title}</div>
      {sub && <div className="text-xs text-mut mt-1.5 leading-relaxed">{sub}</div>}
      {action && (
        <button onClick={onAction} className="mt-5 px-6 h-10 rounded-(--r-ctl) brand-grad glow-neon text-[13px] font-bold pressable">{action}</button>
      )}
    </div>
  );
}

/* ——— 键帽 ——— */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-(--r-ctl) bg-s4 text-[11px] font-semibold text-on/85 elev-1">{children}</span>;
}

/* ——— Toast ——— */
export function ToastHost() {
  const { toasts } = useStore();
  return (
    <div
      className="fixed inset-x-0 z-[140] flex flex-col-reverse items-center gap-2 pointer-events-none px-4"
      style={{ bottom: "calc(var(--sab, 0px) + 108px)" }}>
      {toasts.map((t) => (
        <div key={t.id} className="a-toast pointer-events-auto flex items-center gap-2 max-w-[90vw] glass-pill rounded-full px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/15">
          {t.icon === "ok" && <ICheck size={15} className="text-mint shrink-0" />}
          {t.icon === "heart" && <IHeartF size={15} className="text-neon shrink-0" />}
          {t.icon === "star" && <IStarF size={15} className="text-amber shrink-0" />}
          {t.icon === "info" && <ISparkF size={14} className="text-primary shrink-0" />}
          <span className="text-[12.5px] font-medium text-white truncate leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ——— 长按 ——— */
export function useLongPress(cb: (e: { clientX: number; clientY: number }) => void, ms = 480) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef({ x: 0, y: 0 });
  const fired = useRef(false);
  const clear = () => { window.clearTimeout(timer.current); };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      const { clientX, clientY } = e;
      timer.current = window.setTimeout(() => { fired.current = true; cb({ clientX, clientY }); }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onClickCapture: (e: React.MouseEvent) => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false; } },
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); cb({ clientX: e.clientX, clientY: e.clientY }); },
  };
}

/* ——— 关闭按钮 ——— */
export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-8 h-8 rounded-full bg-s3/80 flex items-center justify-center text-mut pressable hover:text-on">
      <IClose size={16} />
    </button>
  );
}

/* ——— 图片（骨架 + 渐显，自动走本地解密协议） ——— */
export function Img({ src, alt = "", className = "", eager = false, raw = false }: {
  src: string; alt?: string; className?: string; eager?: boolean; raw?: boolean;
}) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);
  const url = raw ? src : cover(src);
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {!ok && !err && <div className="absolute inset-0 shimmer" />}
      {err && <div className="absolute inset-0 bg-s3" />}
      <img src={url} alt={alt} loading={eager ? "eager" : "lazy"} onLoad={() => setOk(true)} onError={() => setErr(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${ok ? "opacity-100" : "opacity-0"}`} draggable={false} />
    </div>
  );
}
/* ——— 右侧停靠面板（桌面评论/选集） ——— */
export function DockPanel({ open, onClose, children, width = 372 }: {
  open: boolean; onClose: () => void; children: React.ReactNode; width?: number;
}) {
  const [render, setRender] = useState(open);
  useEffect(() => {
    if (open) setRender(true);
    else { const t = window.setTimeout(() => setRender(false), 230); return () => window.clearTimeout(t); }
  }, [open]);
  if (!render) return null;
  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <div className={`absolute inset-0 bg-black/35 pointer-events-auto ${open ? "a-fade" : "opacity-0 transition-opacity duration-200"}`} onClick={onClose} />
      <div className={`desktop-dock absolute right-0 top-0 bottom-0 pointer-events-auto flex flex-col ${open ? "a-panel-in" : "a-panel-out"}`}
        role="dialog" aria-label="侧边面板" style={{ width, maxWidth: "88%" }}>
        {children}
      </div>
    </div>
  );
}