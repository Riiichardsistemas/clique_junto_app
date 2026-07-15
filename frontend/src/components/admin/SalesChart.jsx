/**
 * Gráfico de barras simples em SVG (sem dependências) para a receita diária.
 * data: [{ date: 'YYYY-MM-DD', sales, revenueCents }]
 */
export default function SalesChart({ data = [] }) {
  const W = 720, H = 200, pad = 8;
  const max = Math.max(1, ...data.map((d) => d.revenueCents));
  const bw = data.length ? (W - pad * 2) / data.length : 0;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DFC891" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#A98F58" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = Math.round(((d.revenueCents / max) * (H - 24)));
          const x = pad + i * bw;
          const y = H - h - 4;
          return (
            <g key={d.date}>
              <rect x={x + bw * 0.15} y={y} width={Math.max(1, bw * 0.7)} height={Math.max(1, h)}
                rx="2" fill="url(#barGold)">
                <title>{`${d.date}: ${(d.revenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • ${d.sales} venda(s)`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-cream-dim/60">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}
