import { useState } from "react";
import { formatVipExpire, useStore } from "../store";
import { Modal } from "./ui";
import { IBoltF, ICheck, IClock, IClose, ILockF, ISparkF } from "../icons";

const QUICK_CODES: { code: string; label: string; tag: string }[] = [
  { code: "1234", label: "天卡 +1天", tag: "1234" },
  { code: "2234", label: "周卡 +7天", tag: "2234" },
  { code: "3234", label: "月卡 +30天", tag: "3234" },
  { code: "9999", label: "永久卡", tag: "9999" },
  { code: "0000", label: "重置试看", tag: "0000" },
];

export default function VipModal() {
  const { vipModalOpen, setVipModalOpen, vipExpireAt, deviceId, activateVip, toast } = useStore();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const vipInfo = formatVipExpire(vipExpireAt);

  const onSubmit = (inputCode?: string) => {
    const target = (inputCode ?? code).trim();
    if (!target) {
      setErr("请输入数字激活卡密（例如 1234 / 2234 / 3234）");
      return;
    }
    const res = activateVip(target);
    if (!res.ok) {
      setErr(res.msg);
      return;
    }
    setErr("");
    setCode("");
    if (target !== "0000") {
      setVipModalOpen(false);
    }
  };

  return (
    <Modal open={vipModalOpen} onClose={() => setVipModalOpen(false)} width={384}>
      <div className="relative overflow-hidden p-5">
        {/* 顶部黑金流光氛围 */}
        <div
          className="absolute inset-x-0 top-0 h-36 pointer-events-none"
          style={{
            background:
              "radial-gradient(90% 100% at 50% 0%, rgba(255, 196, 82, 0.24) 0%, rgba(255, 82, 56, 0.10) 55%, transparent 100%)",
          }}
        />

        {/* 标题栏 */}
        <div className="relative flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl gold-grad flex items-center justify-center shadow-[0_6px_20px_-4px_rgba(245,166,35,0.55)]">
            <ISparkF size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-extrabold tracking-tight text-on">尊享 VIP 会员中心</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold gold-grad">PRO</span>
            </div>
            <div className="text-[11px] text-mut">免注册登录 · 输入卡密即刻解锁全集</div>
          </div>
          <button
            onClick={() => setVipModalOpen(false)}
            className="w-7.5 h-7.5 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-mut pressable"
            aria-label="关闭">
            <IClose size={13} />
          </button>
        </div>

        {/* 会员状态与到期时间卡片 */}
        <div
          className="relative mt-4 rounded-(--r-md) p-3.5 border overflow-hidden"
          style={{
            background: vipInfo.isVip
              ? "linear-gradient(135deg, rgba(255, 209, 102, 0.16) 0%, rgba(25, 22, 18, 0.92) 100%)"
              : "rgba(255, 255, 255, 0.04)",
            borderColor: vipInfo.isVip ? "rgba(255, 202, 98, 0.36)" : "rgba(255, 255, 255, 0.08)",
          }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                  vipInfo.isVip ? "gold-grad" : "bg-white/10 text-white/80"
                }`}>
                {vipInfo.statusText}
              </span>
              <span className="text-[11px] text-mut">{vipInfo.remainText}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard
                  ?.writeText(deviceId)
                  .then(() => toast("设备码已复制", "ok"))
                  .catch(() => {});
              }}
              className="text-[10.5px] text-amber/90 font-semibold pressable">
              设备码 {deviceId} · 复制
            </button>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-white/8 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5 text-mut">
              <IClock size={13} className="text-amber" />
              到期时间
            </span>
            <span className={`font-bold tabular-nums ${vipInfo.isVip ? "text-[#ffd27d]" : "text-white/75"}`}>
              {vipInfo.expireDateText}
            </span>
          </div>
        </div>

        {/* 权益说明 */}
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {[
            ["解锁全集", "解除 15 秒限制"],
            ["蓝光秒播", "极速专线无广告"],
            ["即开即看", "免登录本机生效"],
          ].map(([t, s]) => (
            <div key={t} className="rounded-(--r-sm) bg-white/[0.035] border border-white/7 px-2.5 py-2 text-center">
              <div className="text-[11.5px] font-bold text-[#ffd88a]">{t}</div>
              <div className="text-[10px] text-mut mt-0.5">{s}</div>
            </div>
          ))}
        </div>

        {/* 卡密输入区 */}
        <div className="mt-4">
          <div className="text-[11.5px] font-semibold text-on/85 mb-1.5 flex items-center justify-between">
            <span>输入数字激活卡密</span>
            <span className="text-[10.5px] text-mut">支持叠加续期</span>
          </div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (err) setErr("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
              placeholder="请输入卡密，如 1234 / 2234 / 3234"
              className="flex-1 h-11 px-3.5 rounded-(--r-ctl) bg-black/40 border border-white/12 text-[14px] font-bold tracking-wider text-on placeholder-dim outline-none focus:border-amber/70 transition-colors"
            />
          </div>
          {err && <div className="text-[11.5px] text-danger mt-1.5">{err}</div>}

          <button
            onClick={() => onSubmit()}
            className="mt-3 w-full h-11 rounded-(--r-ctl) gold-grad text-[14px] font-extrabold tracking-wide pressable flex items-center justify-center gap-1.5 shadow-[0_8px_26px_-6px_rgba(245,166,35,0.55)]">
            <IBoltF size={15} />
            {vipInfo.isVip ? "立即续期 / 叠加时长" : "立即激活 VIP 解锁全集"}
          </button>
        </div>

        {/* 测试快捷卡密栏（方便直接点按测试） */}
        <div className="mt-4 pt-3 border-t border-white/8">
          <div className="text-[10.5px] text-mut mb-2 flex items-center justify-between">
            <span>测试快捷验证（点击直接填入并验证）：</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CODES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setCode(item.code);
                  onSubmit(item.code);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border pressable transition-colors ${
                  item.code === "0000"
                    ? "bg-white/5 border-white/10 text-mut hover:text-white"
                    : "bg-amber/10 border-amber/25 text-[#ffd27d] hover:bg-amber/20"
                }`}>
                <span className="font-mono font-bold">{item.tag}</span> · {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[10.5px] text-dim">
          <span className="flex items-center gap-1"><ICheck size={12} className="text-amber" />免账号注册</span>
          <span className="flex items-center gap-1"><ILockF size={11} className="text-amber" />本机持久保存</span>
        </div>
      </div>
    </Modal>
  );
}
