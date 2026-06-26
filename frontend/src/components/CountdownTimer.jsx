import { useEffect, useState } from 'react';

function diff(target) {
  const ms = new Date(target) - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export default function CountdownTimer({ target, label, onExpire, className = '' }) {
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => {
      const v = diff(target);
      setT(v);
      if (!v) {
        clearInterval(id);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onExpire]);

  if (!t) return null;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className={className}>
      {label && <p className="mb-2 text-xs uppercase tracking-widest text-white/50">{label}</p>}
      <div className="flex items-end gap-3 font-serif text-3xl tabular-nums text-white">
        {t.d > 0 && (
          <span>
            <span>{t.d}</span>
            <span className="ml-0.5 font-sans text-base text-white/40">d</span>
          </span>
        )}
        <span>
          {pad(t.h)}
          <span className="ml-0.5 font-sans text-base text-white/40">h</span>
        </span>
        <span>
          {pad(t.m)}
          <span className="ml-0.5 font-sans text-base text-white/40">m</span>
        </span>
        <span>
          {pad(t.s)}
          <span className="ml-0.5 font-sans text-base text-white/40">s</span>
        </span>
      </div>
    </div>
  );
}
