import { useRef, useState } from "react";
import { formatVipExpire, useStore } from "../store";
import { Modal } from "./ui";
import { IBoltF, IClose, ISparkF } from "../icons";

export default function VipModal() {
  const { vipModalOpen, setVipModalOpen, vipExpireAt, activateVip, toast } = useStore();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const tapCount = useRef(0);
  const vipInfo = formatVipExpire(vipExpireAt);

  const onSubmit = (inputCode?: string) => {
    const target = (inputCode ?? code).trim();
    if (!target) {
      setErr("请输入卡密激活码");
      return;
    }
    const res = activateVip(target);
    if (!res.ok) {
      setErr(res.msg);
      return;
    }
    setErr("");
    setCode("");
    toast("卡密激活成功", "ok");
    setVipModalOpen(false);
  };

  const handleDevTap = () => {
    tapCount.current += 1;
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setCode("1234");
      toast("调试快捷码已填入: 1234", "info");
    }
  };

  return (
    <Modal open={vipModalOpen} onClose={() => setVipModalOpen(false)} width={350}>
      <div className="relative overflow-hidden p-5">
        {/* 顶部微光氛围 */}
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background:
              "radial-gradient(90% 100% at 50% 0%, rgba(255, 196, 82, 0.22) 0%, transparent 100%)",
          }}
        />

        {/* 标题栏 */}
        <div className="relative flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDevTap}
            className="w-9 h-9 rounded-xl gold-grad flex items-center justify-center shrink-0 shadow-[0_6px_20px_-4px_rgba(245,166,35,0.55)]">
            <ISparkF size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-extrabold tracking-tight text-on leading-snug">
              {vipInfo.isVip ? "会员卡密续期" : "兑换会员卡密"}
            </div>
            <div className="text-[11px] text-mut mt-0.5 truncate">
              {vipInfo.isVip
                ? `当前到期：${vipInfo.expireDateText}（${vipInfo.remainText}）`
                : "输入卡密即刻解锁全集畅看"}
            </div>
          </div>
          <button
            onClick={() => setVipModalOpen(false)}
            className="w-7.5 h-7.5 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-mut pressable"
            aria-label="关闭">
            <IClose size={13} />
          </button>
        </div>

        {/* 卡密输入区 */}
        <div className="mt-5">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (err) setErr("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            placeholder="请输入卡密激活码"
            className="w-full h-11 px-3.5 rounded-(--r-ctl) bg-black/40 border border-white/12 text-[14px] font-bold tracking-wider text-on placeholder-dim outline-none focus:border-amber/70 transition-colors"
          />
          {err && <div className="text-[11.5px] text-danger mt-1.5 pl-1">{err}</div>}

          <button
            onClick={() => onSubmit()}
            className="mt-4 w-full h-11 rounded-(--r-ctl) gold-grad text-[14px] font-extrabold tracking-wide pressable flex items-center justify-center gap-1.5 shadow-[0_8px_26px_-6px_rgba(245,166,35,0.55)]">
            <IBoltF size={15} />
            {vipInfo.isVip ? "立即续期 / 叠加时长" : "立即兑换 VIP 解锁全集"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
