import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store";

type Op = "+" | "-" | "×" | "÷" | null;

export default function CalculatorLock() {
  const { disguiseLocked, disguisePin, unlockDisguise } = useStore();
  const [display, setDisplay] = useState("0");
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [waitingNext, setWaitingNext] = useState(false);
  const [historyLine, setHistoryLine] = useState("");

  /* 每次进入伪装锁时重置计算器屏幕，并确保后台视频静音暂停 */
  useEffect(() => {
    if (!disguiseLocked) return;
    setDisplay("0");
    setPrevVal(null);
    setOp(null);
    setWaitingNext(false);
    setHistoryLine("");
    try {
      document.querySelectorAll("video").forEach((v) => {
        try { v.pause(); } catch { /* ignore */ }
      });
    } catch { /* ignore */ }
  }, [disguiseLocked]);

  const inputDigit = useCallback((d: string) => {
    try { navigator.vibrate?.(10); } catch { /* ignore */ }
    setDisplay((cur) => {
      if (waitingNext) {
        setWaitingNext(false);
        return d;
      }
      if (cur === "0") return d;
      if (cur.replace(/[^0-9]/g, "").length >= 12) return cur;
      return cur + d;
    });
  }, [waitingNext]);

  const inputDot = useCallback(() => {
    try { navigator.vibrate?.(10); } catch { /* ignore */ }
    if (waitingNext) {
      setDisplay("0.");
      setWaitingNext(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }, [display, waitingNext]);

  const clearAll = useCallback(() => {
    try { navigator.vibrate?.(12); } catch { /* ignore */ }
    setDisplay("0");
    setPrevVal(null);
    setOp(null);
    setWaitingNext(false);
    setHistoryLine("");
  }, []);

  const toggleSign = useCallback(() => {
    try { navigator.vibrate?.(10); } catch { /* ignore */ }
    setDisplay((cur) => {
      if (cur === "0") return cur;
      return cur.startsWith("-") ? cur.slice(1) : "-" + cur;
    });
  }, []);

  const inputPercent = useCallback(() => {
    try { navigator.vibrate?.(10); } catch { /* ignore */ }
    const val = parseFloat(display);
    if (!Number.isFinite(val)) return;
    setDisplay(String(Number((val / 100).toPrecision(10))));
  }, [display]);

  const compute = (a: number, b: number, operator: Op): number => {
    switch (operator) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? 0 : a / b;
      default: return b;
    }
  };

  const handleOp = useCallback((nextOp: Op) => {
    try { navigator.vibrate?.(12); } catch { /* ignore */ }
    const inputValue = parseFloat(display);
    if (prevVal == null) {
      setPrevVal(inputValue);
      setHistoryLine(`${display} ${nextOp}`);
    } else if (op && !waitingNext) {
      const result = Number(compute(prevVal, inputValue, op).toPrecision(12));
      setDisplay(String(result));
      setPrevVal(result);
      setHistoryLine(`${result} ${nextOp}`);
    } else {
      setHistoryLine(`${prevVal} ${nextOp}`);
    }
    setWaitingNext(true);
    setOp(nextOp);
  }, [display, op, prevVal, waitingNext]);

  const handleEquals = useCallback(() => {
    const cleanDigits = display.trim();
    /* 核心暗号校验：输入指定数字暗号后按 = 立即解锁进入黄果 */
    if (cleanDigits === disguisePin) {
      try { navigator.vibrate?.(35); } catch { /* ignore */ }
      unlockDisguise(cleanDigits);
      return;
    }

    try { navigator.vibrate?.(12); } catch { /* ignore */ }
    if (op && prevVal != null) {
      const current = parseFloat(display);
      if (op === "÷" && current === 0) {
        setHistoryLine(`${prevVal} ÷ 0 =`);
        setDisplay("错误");
        setPrevVal(null);
        setOp(null);
        setWaitingNext(true);
        return;
      }
      const result = Number(compute(prevVal, current, op).toPrecision(12));
      setHistoryLine(`${prevVal} ${op} ${current} =`);
      setDisplay(String(result));
      setPrevVal(null);
      setOp(null);
      setWaitingNext(true);
    }
  }, [disguisePin, display, op, prevVal, unlockDisguise]);

  /* 支持电脑键盘输入 */
  useEffect(() => {
    if (!disguiseLocked) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); inputDigit(e.key); }
      else if (e.key === ".") { e.preventDefault(); inputDot(); }
      else if (e.key === "+" ) { e.preventDefault(); handleOp("+"); }
      else if (e.key === "-" ) { e.preventDefault(); handleOp("-"); }
      else if (e.key === "*" ) { e.preventDefault(); handleOp("×"); }
      else if (e.key === "/" ) { e.preventDefault(); handleOp("÷"); }
      else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); handleEquals(); }
      else if (e.key === "Escape" || e.key === "c" || e.key === "C") { e.preventDefault(); clearAll(); }
      else if (e.key === "Backspace") {
        e.preventDefault();
        setDisplay((cur) => (cur.length > 1 ? cur.slice(0, -1) : "0"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disguiseLocked, inputDigit, inputDot, handleOp, handleEquals, clearAll]);

  if (!disguiseLocked) return null;

  const fontSize =
    display.length > 10 ? "text-[40px]" : display.length > 7 ? "text-[52px]" : "text-[66px]";

  return (
    <div
      className="fixed inset-0 z-[120] bg-black text-white flex flex-col items-center justify-between select-none"
      style={{
        paddingTop: "calc(var(--sat, 0px) + 12px)",
        paddingBottom: "calc(var(--sab, 0px) + 18px)",
      }}>
      {/* 顶部极简工具栏（外观 100% 像系统自带计算器，右上角伪装成 Build 版本号防忘暗号） */}
      <div className="w-full max-w-[400px] px-6 flex items-center justify-between text-white/30 text-[12px]">
        <span className="font-medium tracking-wider">标准计算器</span>
        <span className="text-[10.5px] tabular-nums text-white/15">Build {disguisePin}</span>
      </div>

      {/* 计算器显示屏 */}
      <div className="w-full max-w-[400px] flex-1 flex flex-col justify-end px-6 pb-5 text-right overflow-hidden">
        <div className="min-h-[26px] text-[18px] text-white/45 tabular-nums truncate">
          {historyLine}
        </div>
        <div className={`${fontSize} font-light leading-none tracking-tight tabular-nums break-all mt-1`}>
          {display}
        </div>
      </div>

      {/* 计算器按键矩阵（iOS 深色计算器配色） */}
      <div className="w-full max-w-[400px] px-5 grid grid-cols-4 gap-3.5">
        {/* 第 1 行 */}
        <button
          type="button"
          onClick={clearAll}
          className="aspect-square rounded-full bg-[#a5a5a5] active:bg-[#d4d4d2] text-black text-[24px] font-medium flex items-center justify-center transition-colors">
          {display === "0" && !prevVal ? "AC" : "C"}
        </button>
        <button
          type="button"
          onClick={toggleSign}
          className="aspect-square rounded-full bg-[#a5a5a5] active:bg-[#d4d4d2] text-black text-[24px] font-medium flex items-center justify-center transition-colors">
          +/-
        </button>
        <button
          type="button"
          onClick={inputPercent}
          className="aspect-square rounded-full bg-[#a5a5a5] active:bg-[#d4d4d2] text-black text-[24px] font-medium flex items-center justify-center transition-colors">
          %
        </button>
        <button
          type="button"
          onClick={() => handleOp("÷")}
          className={`aspect-square rounded-full text-[30px] font-medium flex items-center justify-center transition-colors ${
            op === "÷" && waitingNext ? "bg-white text-[#ff9f0a]" : "bg-[#ff9f0a] active:bg-[#fbc78d] text-white"
          }`}>
          ÷
        </button>

        {/* 第 2 行 */}
        {["7", "8", "9"].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => inputDigit(n)}
            className="aspect-square rounded-full bg-[#333333] active:bg-[#737373] text-white text-[28px] font-normal flex items-center justify-center transition-colors">
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOp("×")}
          className={`aspect-square rounded-full text-[30px] font-medium flex items-center justify-center transition-colors ${
            op === "×" && waitingNext ? "bg-white text-[#ff9f0a]" : "bg-[#ff9f0a] active:bg-[#fbc78d] text-white"
          }`}>
          ×
        </button>

        {/* 第 3 行 */}
        {["4", "5", "6"].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => inputDigit(n)}
            className="aspect-square rounded-full bg-[#333333] active:bg-[#737373] text-white text-[28px] font-normal flex items-center justify-center transition-colors">
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOp("-")}
          className={`aspect-square rounded-full text-[32px] font-medium flex items-center justify-center transition-colors ${
            op === "-" && waitingNext ? "bg-white text-[#ff9f0a]" : "bg-[#ff9f0a] active:bg-[#fbc78d] text-white"
          }`}>
          −
        </button>

        {/* 第 4 行 */}
        {["1", "2", "3"].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => inputDigit(n)}
            className="aspect-square rounded-full bg-[#333333] active:bg-[#737373] text-white text-[28px] font-normal flex items-center justify-center transition-colors">
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOp("+")}
          className={`aspect-square rounded-full text-[30px] font-medium flex items-center justify-center transition-colors ${
            op === "+" && waitingNext ? "bg-white text-[#ff9f0a]" : "bg-[#ff9f0a] active:bg-[#fbc78d] text-white"
          }`}>
          +
        </button>

        {/* 第 5 行 */}
        <button
          type="button"
          onClick={() => inputDigit("0")}
          className="col-span-2 rounded-full bg-[#333333] active:bg-[#737373] text-white text-[28px] font-normal flex items-center pl-8 transition-colors">
          0
        </button>
        <button
          type="button"
          onClick={inputDot}
          className="aspect-square rounded-full bg-[#333333] active:bg-[#737373] text-white text-[28px] font-bold flex items-center justify-center transition-colors">
          .
        </button>
        <button
          type="button"
          onClick={handleEquals}
          className="aspect-square rounded-full bg-[#ff9f0a] active:bg-[#fbc78d] text-white text-[30px] font-medium flex items-center justify-center transition-colors">
          =
        </button>
      </div>
    </div>
  );
}
