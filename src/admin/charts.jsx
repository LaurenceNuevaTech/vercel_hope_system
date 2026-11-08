import { useLayoutEffect, useRef, useState } from 'react';

// Categorical palette (CVD-safe, ≥3:1 on white). Series 1 follows the brand colour.
export const SERIES = ['#A67C00', '#2F3B52', '#1E8A55', '#7A4FB5', '#C2372F', '#0E9AA7'];
const RAMP = ['#EEF2FB', '#D3DEF5', '#A9BEEB', '#7393DA', '#4467C4', '#2A4FB0', '#1C3D8F'];

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const niceMax = (v) => { if (v <= 5) return 5; const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p) * p; };

/** Lines over time with a crosshair tooltip. series: [{ name, color, values }] */
export function LineChart({ labels, series, height = 240, unit = '', format = (v) => v }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const L = 52; const R = series.length > 1 ? 96 : 20; const T = 10; const B = 26;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i) => L + (n === 1 ? 0 : (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (height - T - B) * (1 - v / max);
  const every = Math.ceil(n / Math.max(2, Math.floor((W - L - R) / 60)));
  const ticks = [0, max / 2, max];
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - L) / (W - L - R)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };
  // Direct end labels, nudged apart so they never collide.
  const ends = series.map((s) => ({ s, y: y(s.values[n - 1] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;

  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`Line chart: ${series.map((s) => s.name).join(', ')}`}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t ? '#EEF1F6' : '#C9D0DD'} /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="#8A93A6">{format(Math.round(t))}</text></g>)}
        {labels.map((l, i) => ((i % every === 0 && (n - 1 - i) >= every) || i === n - 1) && <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10.5" fill="#8A93A6">{l}</text>)}
        {series.map((s) => <path key={s.name} d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />)}
        {series.length > 1 && ends.map(({ s, y: yy }) => <text key={s.name} x={W - R + 8} y={yy + 4} fontSize="11" fill="#1B2333" fontWeight="600">{s.name}</text>)}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={height - B} stroke="#9AA3B5" strokeDasharray="3 3" />
            {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="tip-box" style={{ left: Math.min(x(hover) + 12, W - 160), top: 8 }}>
          <b>{labels[hover]}</b>
          {series.map((s) => <div className="r" key={s.name}><span><i style={{ background: s.color }} />{s.name}</span><b style={{ margin: 0 }}>{format(s.values[hover])}{unit}</b></div>)}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars, one series, value labels at the bar end. data: [[label, value]] */
export function BarList({ data, color = '#A67C00', unit = '', labelWidth = 160, format = (v) => v }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d[1]));
  const rowH = 30; const R = 46;
  const H = data.length * rowH + 4;
  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label="Bar chart">
        {data.map(([label, v], i) => {
          const w = Math.max(v ? 4 : 0, ((W - labelWidth - R) * v) / max);
          return (
            <g key={label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x="0" y={i * rowH} width={W} height={rowH} fill={hover === i ? '#F6F8FC' : 'transparent'} />
              <text x={labelWidth - 10} y={i * rowH + 19} textAnchor="end" fontSize="11" fill="#5E6678">{label.length > 28 ? `${label.slice(0, 27)}…` : label}</text>
              <rect x={labelWidth} y={i * rowH + 7} width={w} height={16} rx="4" fill={color} />
              <text x={labelWidth + w + 6} y={i * rowH + 19} fontSize="11" fill="#1B2333" fontWeight="600">{format(v)}{unit}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Vertical columns: data [[label, value]] */
export function Columns({ data, height = 200, color = '#A67C00', format = (v) => v }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const L = 8; const B = 24; const T = 18;
  const max = Math.max(1, ...data.map((d) => d[1]));
  const bw = (W - L) / data.length;
  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={height} role="img" aria-label="Column chart">
        {data.map(([label, v], i) => {
          const h = ((height - B - T) * v) / max;
          return (
            <g key={label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={L + i * bw} y={T} width={bw} height={height - B - T} fill={hover === i ? '#F6F8FC' : 'transparent'} />
              <rect x={L + i * bw + bw * 0.18} y={height - B - h} width={bw * 0.64} height={Math.max(v ? 2 : 0, h)} rx="4" fill={color} />
              {(hover === i || data.length <= 8) && <text x={L + i * bw + bw / 2} y={height - B - h - 5} textAnchor="middle" fontSize="10.5" fill="#1B2333" fontWeight="600">{format(v)}</text>}
              <text x={L + i * bw + bw / 2} y={height - 7} textAnchor="middle" fontSize="10.5" fill="#8A93A6">{label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Funnel: stages [[label, value]] narrowing bars. */
export function Funnel({ data, color = '#A67C00' }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="funnel">
      {data.map(([label, v], i) => (
        <div key={label} className="funnel-row">
          <span>{label}</span>
          <div><i style={{ width: `${Math.max(3, (v / max) * 100)}%`, background: color, opacity: 1 - i * 0.1 }} /></div>
          <b className="num">{v}</b>
        </div>
      ))}
    </div>
  );
}
