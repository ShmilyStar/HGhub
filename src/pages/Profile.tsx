import { useEffect, useState } from "react";
import { api, APP_VERSION, fmt, logLine, platform } from "../api";
import type { Detail } from "../types";
import { formatVipExpire, useStore } from "../store";
import { Avatar, Empty, Img, Modal, Toggle } from "../components/ui";
import { IBoltF, IBroom, IChevR, IClock, IHeart, IInfo, ILink, ILogout, IMoon, IShield, ISparkF, IStar, ISun, IUser } from "../icons";

export default function Profile({ wide: _wide }: { wide: boolean }) {
  const {
    user, setLoginOpen, logout, theme, setTheme,
    history, favs, clearHistory, clearLocal, push, toast,
    vipExpireAt, deviceId, setVipModalOpen, progress,
    disguiseEnabled, disguisePin, setDisguiseEnabled, setDisguisePin, lockDisguiseNow,
  } = useStore();
  const [tab, setTab] = useState<"fav" | "history">("fav");
  const [cards, setCards] = useState<Detail[]>([]);
  const [about, setAbout] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinEditing, setPinEditing] = useState(false);
  const [pinDraft, setPinDraft] = useState(disguisePin);

  const vipInfo = formatVipExpire(vipExpireAt);
  const ids = tab === "fav" ? favs : history;

  useEffect(() => {
    let alive = true;
    if (!ids.length) { setCards([]); return; }
    setLoading(true);
    Promise.allSettled(ids.slice(0, 12).map((id) => api.video(id)))
      .then((rs) => {
        if (!alive) return;
        setCards(rs.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<Detail>).value));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ids.join(",")]);

  return (
    <div className="absolute inset-0 bg-bg page-aura flex flex-col">
      <div className="shrink-0 px-4 pb-2 flex items-center justify-between" style={{ paddingTop: "calc(var(--sat, 0px) + 14px)" }}>
        <div>
          <div className="text-[23px] font-extrabold tracking-tight text-on leading-none">我的会员</div>
          <div className="text-[11px] text-mut mt-1">本机免注册畅看 · 会员权益与追剧足迹</div>
        </div>
        <button
          onClick={() => setVipModalOpen(true)}
          className="h-8 px-3 rounded-full gold-grad text-[11.5px] font-extrabold flex items-center gap-1 pressable">
          <ISparkF size={12} />
          {vipInfo.isVip ? "续期卡密" : "卡密激活"}
        </button>
      </div>

      <div className="flex-1 scroll-y px-4 pt-2 pb-28">
        {/* 顶部黑金 VIP 会员中心大卡片（免登录常驻） */}
        <div
          className="rounded-(--r-lg) p-4.5 a-rise relative overflow-hidden border"
          style={{
            background: vipInfo.isVip
              ? "linear-gradient(135deg, rgba(255, 204, 92, 0.20) 0%, rgba(28, 22, 16, 0.94) 55%, rgba(14, 15, 22, 0.98) 100%)"
              : "linear-gradient(135deg, rgba(255, 82, 56, 0.14) 0%, rgba(18, 20, 28, 0.94) 60%, rgba(13, 15, 21, 0.98) 100%)",
            borderColor: vipInfo.isVip ? "rgba(255, 202, 98, 0.38)" : "rgba(255, 255, 255, 0.10)",
            boxShadow: vipInfo.isVip
              ? "0 16px 40px -12px rgba(245, 166, 35, 0.28), inset 0 1px 0 rgba(255, 232, 178, 0.22)"
              : "0 14px 34px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vipInfo.isVip ? "gold-grad" : "bg-white/10 text-amber border border-white/12"}`}>
                <ISparkF size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[16.5px] font-extrabold text-white tracking-tight">
                    {vipInfo.statusText}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${vipInfo.isVip ? "gold-grad" : "bg-white/12 text-white/75"}`}>
                    {vipInfo.isVip ? "已解锁全集" : "试看 15秒"}
                  </span>
                </div>
                <div className="text-[11.5px] text-white/65 mt-0.5">
                  {vipInfo.remainText} · 本机设备码 <span className="font-mono text-white/85">{deviceId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 到期时间醒目展示栏 */}
          <div className="mt-3.5 px-3.5 py-2.5 rounded-(--r-sm) bg-black/35 border border-white/8 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] text-white/70">
              <IClock size={14} className="text-amber" />
              会员到期时间
            </span>
            <span className={`text-[13px] font-extrabold tabular-nums ${vipInfo.isVip ? "text-[#ffd27d]" : "text-white/75"}`}>
              {vipInfo.expireDateText}
            </span>
          </div>

          <div className="mt-3.5 flex items-center gap-2.5">
            <button
              onClick={() => setVipModalOpen(true)}
              className="flex-1 h-10 rounded-(--r-ctl) gold-grad text-[13px] font-extrabold pressable flex items-center justify-center gap-1.5 shadow-[0_6px_20px_-4px_rgba(245,166,35,0.45)]">
              <IBoltF size={14} />
              {vipInfo.isVip ? "输入卡密续期 / 叠加时长" : "输入数字卡密 · 立即开通 VIP"}
            </button>
          </div>
        </div>

        {/* 🛡️ 防查岗伪装模式（计算器锁）卡片 */}
        <div className="mt-3.5 rounded-(--r-lg) glass-card p-4 border border-white/10 a-rise">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#f7c355]/15 border border-[#f7c355]/35 flex items-center justify-center text-[#f7c355] shrink-0">
                <IShield size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-extrabold text-on">防查岗伪装模式（计算器锁）</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${disguiseEnabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/8 text-mut"}`}>
                    {disguiseEnabled ? "已开启守护" : "未开启"}
                  </span>
                </div>
                <div className="text-[11px] text-mut mt-0.5">
                  启动或切后台自动变真计算器 · 输入 <b className="text-[#ffd27d] font-mono">{disguisePin}=</b> 解锁
                </div>
              </div>
            </div>
            <Toggle
              on={disguiseEnabled}
              onChange={(on) => {
                setDisguiseEnabled(on);
                toast(on ? `已开启防查岗伪装（解锁暗号：${disguisePin}=）` : "已关闭防查岗伪装模式", "ok");
              }}
            />
          </div>

          {pinEditing ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="输入3-8位纯数字暗号（如 8888）"
                inputMode="numeric"
                className="flex-1 h-9 px-3 rounded-(--r-ctl) bg-black/40 border border-[#f7c355]/40 text-[12.5px] font-mono text-white outline-none"
              />
              <button
                onClick={() => {
                  const clean = pinDraft.replace(/\D/g, "");
                  if (clean.length < 3) {
                    toast("暗号请至少输入 3 位数字", "info");
                    return;
                  }
                  setDisguisePin(clean);
                  setPinEditing(false);
                  toast(`解锁暗号已改为：输入 ${clean} 再按 =`, "ok");
                }}
                className="h-9 px-3.5 rounded-(--r-ctl) gold-grad text-[12px] font-bold pressable">
                保存暗号
              </button>
              <button
                onClick={() => { setPinDraft(disguisePin); setPinEditing(false); }}
                className="h-9 px-3 rounded-(--r-ctl) bg-white/8 text-[12px] text-mut pressable">
                取消
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={lockDisguiseNow}
                className="flex-1 h-9 rounded-(--r-ctl) bg-white/10 hover:bg-white/14 border border-white/12 text-[12px] font-bold text-white flex items-center justify-center gap-1.5 pressable">
                <IShield size={14} className="text-[#f7c355]" />
                <span>立即伪装成计算器（输入 {disguisePin}= 返回）</span>
              </button>
              <button
                onClick={() => { setPinDraft(disguisePin); setPinEditing(true); }}
                className="h-9 px-3 rounded-(--r-ctl) bg-white/6 border border-white/8 text-[11.5px] font-medium text-[#ffd27d] pressable">
                改暗号
              </button>
            </div>
          )}
        </div>

        {/* 已登录账号资料卡（可选，仅登录时展示） */}
        {user && (
          <div className="mt-3.5 rounded-(--r-lg) glass-card p-3.5 flex items-center gap-3 relative overflow-hidden">
            <Avatar size={46} name={user.nickname} hue={16} ring />
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-bold text-on truncate">{user.nickname}</span>
                <span className="text-[11px] text-mut">@{user.username}</span>
              </div>
              <div className="flex gap-4 mt-1 text-[11px] text-mut">
                <span>获赞 <b className="text-on font-bold">{fmt(user.counts?.like)}</b></span>
                <span>收藏 <b className="text-on font-bold">{fmt(user.counts?.collect)}</b></span>
              </div>
            </div>
            <button onClick={async () => { await logout(); }}
              className="relative w-8.5 h-8.5 rounded-full bg-white/8 border border-white/8 flex items-center justify-center text-mut pressable" aria-label="退出登录">
              <ILogout size={16} />
            </button>
          </div>
        )}

        {/* 我的内容 */}
        <div className="flex bg-black/30 border border-white/8 rounded-(--r-ctl) p-1 mt-4">
          {([["fav", "我的追剧收藏"], ["history", "最近观看足迹"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 h-8.5 rounded-(--r-ctl) text-[12px] font-bold pressable ${tab === k ? "brand-grad glow-neon" : "text-mut"}`}>{l}</button>
          ))}
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-7 h-7 spinner" /></div>
          ) : cards.length ? (
            <div className="grid grid-cols-3 gap-2">
              {cards.map((c) => {
                const prog = progress[c.id];
                const totalEp = c.episodes?.length || prog?.totalEp || 0;
                return (
                  <button key={c.id} onClick={() => push({ kind: "feed", videoIds: cards.map((x) => x.id), index: cards.findIndex((x) => x.id === c.id), title: tab === "fav" ? "我的收藏" : "观看历史" })}
                    className="relative rounded-(--r-sm) overflow-hidden bg-s1 elev-1 ring-1 ring-white/8 pressable text-left" style={{ paddingTop: "135%" }}>
                    <Img src={c.cover} />
                    {prog && prog.ep >= 1 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-amber/30 text-[9.5px] font-bold text-[#ffd27d]">
                        看至第{prog.ep}{totalEp ? `/${totalEp}` : ""}集
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/50 to-transparent p-2">
                      <div className="text-[11px] font-semibold text-white clamp-2 leading-tight">{c.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty icon={tab === "fav" ? <IStar size={24} /> : <IClock size={24} />}
              title={tab === "fav" ? "还没有收藏" : "还没有观看记录"}
              sub={tab === "fav" ? "在剧集页点收藏，之后就能在这里找到" : "看过的剧集会出现在这里"}
              action="去逛逛" onAction={() => push({ kind: "ranks" })} />
          )}
          {cards.length > 0 && tab === "history" && (
            <button onClick={clearHistory} className="mt-3 w-full h-9 rounded-(--r-ctl) glass-card text-[12px] text-mut pressable">清空观看历史</button>
          )}
        </div>

        {/* 设置 */}
        <div className="mt-5 rounded-(--r-md) glass-card divide-y divide-white/6">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-8.5 h-8.5 rounded-full tonal flex items-center justify-center">{theme === "dark" ? <IMoon size={16} /> : <ISun size={16} />}</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-on">沉浸深色外观</div>
              <div className="text-[10.5px] text-mut">曜石黑影院级沉浸配色</div>
            </div>
            <Toggle on={theme === "dark"} onChange={(on) => setTheme(on ? "dark" : "light")} label="深色外观" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-8.5 h-8.5 rounded-full tonal flex items-center justify-center"><IHeart size={16} /></span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-on">本机追剧数据</div>
              <div className="text-[10.5px] text-mut">{favs.length} 部收藏 · {history.length} 条观看记录</div>
            </div>
          </div>
          {!user && (
            <button onClick={() => setLoginOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left pressable">
              <span className="w-8.5 h-8.5 rounded-full tonal flex items-center justify-center"><IUser size={16} /></span>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-on">账号云同步（可选）</div>
                <div className="text-[10.5px] text-mut">默认免登录使用 · 登录可跨设备同步收藏</div>
              </div>
              <IChevR size={15} className="text-mut" />
            </button>
          )}
        </div>

        {/* 关于 / 缓存 */}
        <div className="mt-3 rounded-(--r-md) glass-card divide-y divide-white/6">
          <button onClick={() => setAbout(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left pressable">
            <span className="w-8.5 h-8.5 rounded-full tonal flex items-center justify-center"><IInfo size={16} /></span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-on">关于 HGhub</div>
              <div className="text-[10.5px] text-mut">版本 {APP_VERSION} · 极速双端播放器</div>
            </div>
            <IChevR size={15} className="text-mut" />
          </button>
          <button onClick={() => setClearOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left pressable">
            <span className="w-8.5 h-8.5 rounded-full tonal flex items-center justify-center"><IBroom size={16} /></span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-on">清理缓存</div>
              <div className="text-[10.5px] text-mut">封面 / 播放缓存与本地记录</div>
            </div>
            <IChevR size={15} className="text-mut" />
          </button>
          {/* 打不开时先点这里：把 DNS / 代理 / HTTP 结果复制给维护者 */}
          <button onClick={async () => {
            try {
              const text = JSON.stringify(await api.netDiag(), null, 2);
              logLine(`[net_diag] ${text}`);
              await navigator.clipboard?.writeText(text);
              toast("网络诊断结果已复制", "ok");
            } catch (e) {
              toast((e as Error).message || "诊断失败", "info");
            }
          }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left pressable">
            <span className="w-8.5 h-8.5 rounded-full tonal flex items-center justify-center"><ILink size={16} /></span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-on">网络诊断</div>
              <div className="text-[10.5px] text-mut">检测 DNS / 系统代理 / 官网连通性</div>
            </div>
            <IChevR size={15} className="text-mut" />
          </button>
        </div>

        <div className="text-center text-[10px] text-dim mt-5">HGhub {APP_VERSION} · {platform === "android" ? "Android" : platform === "macos" ? "macOS" : "Windows"} 客户端</div>

        <Modal open={about} onClose={() => setAbout(false)} width={392}>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-(--r-sm) brand-grad glow-neon flex items-center justify-center text-on-primary text-[17px] font-black">H</span>
              <div>
                <div className="text-[16px] font-bold text-on leading-tight">HGhub</div>
                <div className="text-[11px] text-mut mt-0.5">黄果短剧 · 第三方客户端 v{APP_VERSION}</div>
              </div>
            </div>

            <p className="text-[12px] text-on/70 leading-relaxed mt-4">
              基于 Rust + Tauri 2 构建的跨平台客户端，支持 Windows、macOS 与 Android。
              界面遵循 Fluent 设计语言，播放器采用沉浸式竖屏信息流。
            </p>

            <div className="mt-4 rounded-(--r-sm) bg-s3/60 p-3 text-[11px] text-mut leading-relaxed">
              本项目仅供学习与交流，所有内容均来自上游站点，客户端不存储、不分发任何视频内容。
              请于 24 小时内删除相关资源，并支持正版。
            </div>

            <div className="mt-4 divide-y divide-white/5">
              <button onClick={() => { navigator.clipboard?.writeText("https://github.com/Minireel/HGhub").then(() => toast("仓库地址已复制", "ok")).catch(() => {}); }}
                className="w-full flex items-center gap-2 py-2.5 text-left pressable">
                <ILink size={15} className="text-mut" />
                <span className="text-[12px] text-on/85">github.com/Minireel/HGhub</span>
                <span className="ml-auto text-[10.5px] text-primary">复制</span>
              </button>
              <button onClick={() => { navigator.clipboard?.writeText("https://huangguoai.com").then(() => toast("站点地址已复制", "ok")).catch(() => {}); }}
                className="w-full flex items-center gap-2 py-2.5 text-left pressable">
                <ILink size={15} className="text-mut" />
                <span className="text-[12px] text-on/85">huangguoai.com</span>
                <span className="ml-auto text-[10.5px] text-primary">复制</span>
              </button>
            </div>

            <button onClick={() => setAbout(false)} className="mt-4 w-full h-9 rounded-(--r-ctl) bg-s3 text-[12.5px] text-on pressable">知道了</button>
          </div>
        </Modal>

        <Modal open={clearOpen} onClose={() => setClearOpen(false)} width={330}>
          <div className="p-5">
            <div className="text-[14.5px] font-bold text-on">清理缓存</div>
            <p className="text-[12px] text-mut leading-relaxed mt-2">
              将清除封面与播放列表缓存、喜欢与收藏标记、观看历史和搜索历史。账号登录状态会保留。
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setClearOpen(false)} className="flex-1 h-9 rounded-(--r-ctl) bg-s3 text-[12.5px] text-on/80 pressable">取消</button>
              <button disabled={clearing} onClick={async () => {
                setClearing(true);
                try { await api.clearCache(); } catch { /* 忽略 */ }
                clearLocal();
                setClearing(false);
                setClearOpen(false);
                toast("缓存已清理", "ok");
              }} className="flex-1 h-9 rounded-(--r-ctl) bg-primary text-[12.5px] font-semibold text-on-primary pressable disabled:opacity-60">
                {clearing ? "清理中…" : "确定清理"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}