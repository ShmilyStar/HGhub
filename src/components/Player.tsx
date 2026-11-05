import React, { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { fmtTime, isLocalMedia, mediaUrl, platform } from "../api";
import { useStore } from "../store";
import { setBackHandler } from "../back";
import {
  IBoltF, ICompress, IExpand, ILockF, IPauseF, IPlayF, IReplay, ISparkF, IVol, IVolMute,
} from "../icons";

const PREVIEW_LIMIT = 15;

type Props = {
  src: string;              // 原始 m3u8 / mp4 地址
  poster?: string;          // 已处理好的封面地址（本地协议）
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  onPlaying?: () => void;
  onTogglePlay?: (playing: boolean) => void;
  onToggleMute?: () => void;
  controls?: boolean;
  className?: string;
};

export default function Player({
  src, poster, autoPlay = true, muted: propMuted, loop = false, onEnded, onPlaying,
  onTogglePlay, onToggleMute, controls = true, className = "",
}: Props) {
  const store = useStore();
  const isVip = store.isVip;
  const setVipModalOpen = store.setVipModalOpen;
  const toast = store.toast;
  const muted = propMuted !== undefined ? propMuted : store.muted;

  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vsize, setVsize] = useState({ w: 0, h: 0 });
  const [full, setFull] = useState(false);
  const [rate, setRate] = useState(1);
  const [errMsg, setErrMsg] = useState<string>("");

  /* —— VIP 15秒试看拦截 —— */
  const [vipLocked, setVipLocked] = useState(false);
  const vipLockedRef = useRef(false);

  /* —— 控制栏显隐（手机端触屏唤醒 + 自动渐隐，暂停时常驻） —— */
  const [showCtrl, setShowCtrl] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);

  const wakeCtrl = useCallback(() => {
    setShowCtrl(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !vipLockedRef.current) {
        setShowCtrl(false);
      }
    }, 3600);
  }, []);

  useEffect(() => {
    if (!playing || vipLocked) {
      setShowCtrl(true);
      window.clearTimeout(hideTimer.current);
    } else {
      wakeCtrl();
    }
    return () => window.clearTimeout(hideTimer.current);
  }, [playing, vipLocked, wakeCtrl]);

  /* —— 手势状态：长按 2.0x 倍速（上滑锁定） + 左右滑动快进快退 —— */
  const [holdSpeed, setHoldSpeed] = useState(false);
  const [speedLock, setSpeedLock] = useState(false);
  const [lockArmed, setLockArmed] = useState(false);
  const lockArmedRef = useRef(false);
  const [scrub, setScrub] = useState<{ pct: number; target: number } | null>(null);
  const scrubTarget = useRef<number | null>(null);
  const [barPct, setBarPct] = useState<number | null>(null);
  const barDragging = useRef(false);

  const gesture = useRef<{
    x: number;
    y: number;
    startY: number;
    t: number;
    timer: number | null;
    mode: "idle" | "hold" | "scrub";
    base: number;
    width: number;
  } | null>(null);

  const effRate = holdSpeed || speedLock ? 2 : rate;

  /* 同步倍速 */
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = effRate;
  }, [effRate]);

  /* 同步静音 */
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  /* 防息屏（Screen Wake Lock） */
  useEffect(() => {
    if (!playing || vipLocked) return undefined;
    let sentinel: { release?: () => Promise<void> } | null = null;
    let disposed = false;
    const req = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release?: () => Promise<void> }> } }).wakeLock;
        if (wl && !disposed && document.visibilityState === "visible") {
          sentinel = await wl.request("screen");
        }
      } catch { /* ignore */ }
    };
    req();
    const onVis = () => { if (document.visibilityState === "visible" && !disposed) req(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      sentinel?.release?.().catch(() => {});
    };
  }, [playing, vipLocked]);

  /* 触发 VIP 15s 试看拦截 */
  const triggerVipGate = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = PREVIEW_LIMIT;
    }
    setTime(PREVIEW_LIMIT);
    setPlaying(false);
    if (!vipLockedRef.current) {
      vipLockedRef.current = true;
      setVipLocked(true);
      setVipModalOpen(true);
    }
  }, [setVipModalOpen]);

  /* 激活 VIP 后自动解锁并继续播放 */
  useEffect(() => {
    if (isVip && vipLockedRef.current) {
      vipLockedRef.current = false;
      setVipLocked(false);
      videoRef.current?.play().catch(() => {});
    } else if (!isVip && time >= PREVIEW_LIMIT) {
      triggerVipGate();
    }
  }, [isVip, time, triggerVipGate]);

  /* 安全定位（带 VIP 15s 边界拦截） */
  const seekSafe = useCallback((target: number) => {
    const v = videoRef.current;
    if (!v) return false;
    const clamped = Math.max(0, duration > 0 ? Math.min(duration, target) : target);
    if (!isVip && clamped >= PREVIEW_LIMIT) {
      triggerVipGate();
      setVipModalOpen(true);
      return false;
    }
    vipLockedRef.current = false;
    setVipLocked(false);
    v.currentTime = clamped;
    setTime(clamped);
    wakeCtrl();
    return true;
  }, [duration, isVip, triggerVipGate, setVipModalOpen, wakeCtrl]);

  /* 安全播放/暂停切换 */
  const togglePlaySafe = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!isVip && (vipLockedRef.current || v.currentTime >= PREVIEW_LIMIT - 0.15)) {
      triggerVipGate();
      setVipModalOpen(true);
      return;
    }
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
    wakeCtrl();
  }, [isVip, triggerVipGate, setVipModalOpen, wakeCtrl]);

  /* 加载视频流 */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setWaiting(true);
    setErrMsg("");
    setTime(0);
    setDuration(0);
    vipLockedRef.current = false;
    setVipLocked(false);

    const url = isLocalMedia(src) ? src : mediaUrl(src);
    const useHls = !url.includes("/seg?u=");

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (useHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 24,
        backBufferLength: 30,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 4,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = muted;
        video.playbackRate = effRate;
        if (autoPlay) video.play().catch(() => setPlaying(false));
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        const detail = `${data.type}/${data.details}`;
        setErrMsg(detail);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else { hls.destroy(); hlsRef.current = null; }
      });
    } else {
      video.src = url;
      video.muted = muted;
      video.playbackRate = effRate;
      if (autoPlay) video.play().catch(() => setPlaying(false));
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay]);

  /* 全屏切换（兼容 Android WebView 应用内沉浸全屏 + 桌面原生 Fullscreen） */
  useEffect(() => {
    const onFs = () => {
      if (platform !== "android") setFull(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!full) {
      setBackHandler(null);
      return undefined;
    }
    setBackHandler(() => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setFull(false);
      return true;
    });
    return () => setBackHandler(null);
  }, [full]);

  const toggleFull = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (platform === "android") {
      setFull((f) => !f);
      wakeCtrl();
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setFull(false);
    } else {
      el.requestFullscreen().then(() => setFull(true)).catch(() => setFull((f) => !f));
    }
    wakeCtrl();
  };

  const cycleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeedLock(false);
    const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    toast(`播放倍速 ${next}x`, "info");
    wakeCtrl();
  };

  const toggleMuteBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleMute) onToggleMute();
    else store.setMuted((m) => !m);
    wakeCtrl();
  };

  /* —— 画面手势：长按 2.0x 倍速 / 左右滑动快进快退 / 单击唤醒控制栏与暂停 —— */
  const onSurfaceDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (vipLocked) return;
    const el = e.currentTarget;
    const width = el.clientWidth || 1;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const g = {
      x: e.clientX,
      y: e.clientY,
      startY: e.clientY,
      t: Date.now(),
      base: time,
      width,
      mode: "idle" as "idle" | "hold" | "scrub",
      timer: window.setTimeout(() => {
        const cur = gesture.current;
        if (!cur || cur.mode !== "idle") return;
        cur.mode = "hold";
        setHoldSpeed(true);
        setLockArmed(false);
        lockArmedRef.current = false;
        try { navigator.vibrate?.(25); } catch { /* ignore */ }
      }, 360) as unknown as number,
    };
    gesture.current = g;
  };

  const onSurfaceMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;

    if (g.mode === "hold") {
      const armed = g.startY - e.clientY > 56;
      if (armed !== lockArmedRef.current) {
        lockArmedRef.current = armed;
        setLockArmed(armed);
      }
      return;
    }

    if (g.mode === "idle") {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        if (g.timer) window.clearTimeout(g.timer);
        g.mode = "scrub";
        wakeCtrl();
      } else if (Math.abs(dy) > 14) {
        if (g.timer) window.clearTimeout(g.timer);
      }
      return;
    }

    if (g.mode === "scrub") {
      const total = duration || 0;
      if (!total) return;
      // 整屏横滑对应最多 120 秒（短片则对应全片时长），保证长视频快进快退依然精准不跳脱
      const spanSec = Math.min(total, Math.max(30, total * 0.65, 90));
      const target = Math.max(0, Math.min(total, g.base + (dx / g.width) * spanSec));
      scrubTarget.current = target;
      setScrub({ pct: (target / total) * 100, target });
    }
  };

  const onSurfaceUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.timer) window.clearTimeout(g.timer);

    if (g.mode === "hold") {
      setHoldSpeed(false);
      if (lockArmedRef.current) {
        setSpeedLock(true);
        toast("已锁定 2.0x 倍速 · 点顶部标识解除", "info");
      }
      lockArmedRef.current = false;
      setLockArmed(false);
      return;
    }

    if (g.mode === "scrub") {
      const target = scrubTarget.current;
      setScrub(null);
      scrubTarget.current = null;
      if (target != null) {
        const ok = seekSafe(target);
        if (ok && playing) videoRef.current?.play().catch(() => {});
      }
      return;
    }

    if (Date.now() - g.t < 280) {
      // 如果控制栏已隐藏，先唤醒控制栏方便拖进度条；如果控制栏已显示，则切换播放/暂停
      if (!showCtrl && playing) {
        wakeCtrl();
      } else {
        togglePlaySafe();
      }
    }
  };

  /* —— 底部进度条直接触控拖拽 —— */
  const calcBarRatio = (clientX: number, clientY: number) => {
    const r = barRef.current?.getBoundingClientRect();
    if (!r) return null;
    const rotated = platform === "android" && full && vsize.w > vsize.h && vsize.h > 0;
    const span = rotated ? r.height : r.width;
    if (!span) return null;
    const raw = rotated ? (clientY - r.top) / span : (clientX - r.left) / span;
    return Math.max(0, Math.min(1, raw));
  };

  const onBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration) return;
    barDragging.current = true;
    wakeCtrl();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const ratio = calcBarRatio(e.clientX, e.clientY);
    if (ratio != null) setBarPct(ratio);
  };

  const onBarMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barDragging.current || !duration) return;
    e.stopPropagation();
    const ratio = calcBarRatio(e.clientX, e.clientY);
    if (ratio != null) setBarPct(ratio);
  };

  const onBarUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barDragging.current) return;
    e.stopPropagation();
    barDragging.current = false;
    const ratio = calcBarRatio(e.clientX, e.clientY) ?? barPct;
    setBarPct(null);
    if (ratio != null && duration) {
      const ok = seekSafe(ratio * duration);
      if (ok && playing) videoRef.current?.play().catch(() => {});
    }
  };

  const activePct = scrub
    ? scrub.pct
    : barPct != null
      ? barPct * 100
      : duration > 0
        ? (time / duration) * 100
        : 0;

  const displayTime = scrub
    ? scrub.target
    : barPct != null && duration
      ? barPct * duration
      : time;

  const rotated = platform === "android" && full && vsize.w > vsize.h && vsize.h > 0;

  return (
    <div
      ref={wrapRef}
      className={`${
        full ? "fixed inset-0 z-50 bg-black" : `relative bg-black overflow-hidden ${className}`
      } select-none ${rotated ? "fs-landscape" : ""}`}>
      {/* 手势触控层 + 视频画面 */}
      <div
        className={`relative w-full h-full transition-all duration-300 ${
          vipLocked ? "blur-md scale-105 brightness-50" : ""
        }`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={onSurfaceDown}
        onPointerMove={onSurfaceMove}
        onPointerUp={onSurfaceUp}
        onPointerCancel={onSurfaceUp}>
        <video
          ref={videoRef}
          poster={poster}
          playsInline
          loop={loop}
          className="w-full h-full object-contain bg-black pointer-events-none"
          onPlay={() => { setPlaying(true); setWaiting(false); onTogglePlay?.(true); }}
          onPause={() => { setPlaying(false); onTogglePlay?.(false); }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => { setWaiting(false); onPlaying?.(); }}
          onTimeUpdate={(e) => {
            const t = (e.target as HTMLVideoElement).currentTime;
            if (!isVip && t >= PREVIEW_LIMIT) {
              triggerVipGate();
              return;
            }
            if (vipLockedRef.current && t < PREVIEW_LIMIT - 0.3) {
              vipLockedRef.current = false;
              setVipLocked(false);
            }
            setTime(t);
          }}
          onLoadedMetadata={(e) => {
            const v = e.target as HTMLVideoElement;
            setDuration(v.duration || 0);
            setVsize({ w: v.videoWidth || 0, h: v.videoHeight || 0 });
          }}
          onEnded={() => onEnded?.()}
        />
      </div>

      {/* 顶部状态角标：非 VIP 试看倒计时 / 倍速胶囊 / 全屏返回 */}
      <div className="absolute inset-x-0 top-0 z-30 p-2.5 flex items-center justify-between pointer-events-none">
        {!isVip && !vipLocked && time > 0 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setVipModalOpen(true); }}
            className="pointer-events-auto flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/60 backdrop-blur-md border border-[#f7c355]/40 text-[10.5px] font-semibold text-[#ffe08a] pressable">
            <ISparkF size={11} className="text-[#f7c355]" />
            <span>试看剩余 {Math.max(0, Math.ceil(PREVIEW_LIMIT - time))}s · 解锁VIP</span>
          </button>
        ) : <span />}

        {(holdSpeed || speedLock) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (speedLock) {
                setSpeedLock(false);
                toast("已恢复 1.0x 倍速", "info");
              }
            }}
            className="pointer-events-auto flex items-center gap-1.5 h-7 px-3 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white elev-2">
            <IBoltF size={12} className="text-[#f7c355]" />
            <span>
              {holdSpeed
                ? lockArmed
                  ? "松开即可锁定 2.0x"
                  : "2.0x 倍速播放中 · 上滑锁定"
                : "2.0x 锁定中 · 点击解除"}
            </span>
          </button>
        )}

        {full && (
          <button
            type="button"
            onClick={toggleFull}
            className="pointer-events-auto w-8 h-8 rounded-full bg-black/55 backdrop-blur-md border border-white/12 flex items-center justify-center text-white pressable">
            <ICompress size={15} />
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {errMsg && (
        <div className="absolute left-2 top-11 z-30 max-w-[80%] rounded bg-black/70 px-2 py-1 text-[10px] leading-tight text-red-300 break-all pointer-events-none">
          {errMsg}
        </div>
      )}

      {/* 缓冲转圈 */}
      {waiting && !vipLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-9 h-9 spinner" />
        </div>
      )}

      {/* 滑动快进/快退中央时间预览 HUD */}
      {(scrub || barPct != null) && duration > 0 && !vipLocked && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/12 text-center elev-2">
            <div className="text-[17px] font-extrabold tabular-nums text-white">
              <span className="text-[#ff6a48]">{fmtTime(displayTime)}</span>
              <span className="text-white/40 mx-1">/</span>
              <span className="text-white/80">{fmtTime(duration)}</span>
            </div>
            <div className="text-[10px] text-white/60 mt-0.5">左右滑动调节进度</div>
          </div>
        </div>
      )}

      {/* 暂停态中央大播放按钮 */}
      {!playing && !waiting && !vipLocked && !scrub && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); togglePlaySafe(); }}
          aria-label="播放"
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <span className="pointer-events-auto w-14 h-14 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center elev-2 pressable">
            <IPlayF size={24} className="text-white ml-0.5" />
          </span>
        </button>
      )}

      {/* 15 秒试看结束 —— VIP 毛玻璃拦截层 */}
      {vipLocked && !isVip && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center px-5 text-center bg-black/55 backdrop-blur-md a-fade">
          <div className="w-11 h-11 rounded-2xl gold-grad flex items-center justify-center text-[#1a1103] shadow-[0_8px_24px_rgba(247,195,85,0.35)] mb-2.5">
            <ILockF size={20} />
          </div>
          <div className="text-[15px] font-extrabold text-white tracking-tight">
            免费试看 {PREVIEW_LIMIT} 秒已结束
          </div>
          <p className="text-[11.5px] text-white/75 mt-1 max-w-[240px] leading-relaxed">
            激活 VIP 会员卡密，立即解锁「黄果吃瓜」完整爆料视频与全站短剧
          </p>
          <div className="flex items-center gap-2.5 mt-3.5">
            <button
              type="button"
              onClick={() => setVipModalOpen(true)}
              className="h-9 px-4 rounded-full gold-grad text-[#1a1103] text-[12px] font-extrabold flex items-center gap-1.5 pressable shadow-[0_6px_20px_rgba(247,195,85,0.35)]">
              <ISparkF size={13} />
              <span>输入卡密解锁 VIP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                vipLockedRef.current = false;
                setVipLocked(false);
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
                setTime(0);
              }}
              className="h-9 px-3.5 rounded-full bg-white/10 border border-white/15 text-[11.5px] font-semibold text-white/90 flex items-center gap-1 pressable">
              <IReplay size={13} />
              <span>重看前15秒</span>
            </button>
          </div>
        </div>
      )}

      {/* 底部控制栏 + 常驻可拖拽进度条（不再使用电脑端 group-hover，手机端随时可见可拖） */}
      {controls && !vipLocked && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-x-0 bottom-0 z-30 px-3 pb-2 pt-7 bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-opacity duration-250 ${
            showCtrl || !playing || scrub || barPct != null ? "opacity-100" : "opacity-85"
          }`}>
          {/* 高灵敏度触控进度条（上下扩充 10px 热区，手指一按即拖） */}
          <div
            ref={barRef}
            onPointerDown={onBarDown}
            onPointerMove={onBarMove}
            onPointerUp={onBarUp}
            onPointerCancel={onBarUp}
            style={{ touchAction: "none" }}
            className="relative py-2.5 cursor-pointer flex items-center">
            <div className="relative w-full h-[4px] rounded-full bg-white/25 overflow-visible">
              {/* 15s 试看节点标记（非 VIP 时提示） */}
              {!isVip && duration > PREVIEW_LIMIT && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-2.5 rounded-full bg-[#f7c355]/90 z-10"
                  style={{ left: `${Math.min(100, (PREVIEW_LIMIT / duration) * 100)}%` }}
                />
              )}
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff5e3a] to-[#f7c355]"
                style={{ width: `${Math.max(0, Math.min(100, activePct))}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,94,58,0.9)] ring-2 ring-[#ff5e3a]"
                style={{ left: `${Math.max(0, Math.min(100, activePct))}%` }}
              />
            </div>
          </div>

          {/* 底部功能按钮行 */}
          <div className="flex items-center gap-2.5 text-white mt-0.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePlaySafe(); }}
              aria-label={playing ? "暂停" : "播放"}
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center pressable">
              {playing ? <IPauseF size={14} /> : <IPlayF size={14} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={toggleMuteBtn}
              aria-label="静音"
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center pressable">
              {muted ? <IVolMute size={14} /> : <IVol size={14} />}
            </button>

            <span className="text-[11px] font-medium tabular-nums text-white/90">
              {fmtTime(displayTime)} <span className="text-white/40">/</span> {fmtTime(duration)}
            </span>

            <div className="flex-1" />

            {/* 快退 10s / 快进 10s 快捷胶囊 */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); seekSafe(time - 10); }}
              className="px-2 h-6 rounded-full bg-white/10 text-[10.5px] font-semibold text-white/85 pressable tabular-nums">
              -10s
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); seekSafe(time + 10); }}
              className="px-2 h-6 rounded-full bg-white/10 text-[10.5px] font-semibold text-white/85 pressable tabular-nums">
              +10s
            </button>

            {/* 倍速切换按钮 */}
            <button
              type="button"
              onClick={cycleRate}
              className={`px-2.5 h-6 rounded-full text-[11px] font-bold pressable tabular-nums ${
                effRate !== 1
                  ? "bg-[#f7c355]/25 border border-[#f7c355]/50 text-[#ffe08a]"
                  : "bg-white/10 text-white/90"
              }`}>
              {effRate}x
            </button>

            {/* 全屏切换按钮 */}
            <button
              type="button"
              onClick={toggleFull}
              aria-label="全屏"
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center pressable">
              {full ? <ICompress size={14} /> : <IExpand size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}