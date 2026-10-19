import { formatKobo, currencySymbol, type Currency } from "@/lib/money";

export type MonthPoint = { label: string; full: string; value: number };

/** Reachable bar heights so a single big month doesn't flatten the rest. */
export function RevenueChart({ data, currency = "NGN" }: { data: MonthPoint[]; currency?: Currency }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 320;
  const H = 140;
  const PAD_TOP = 14;
  const plotH = H - PAD_TOP - 26;
  const gap = 14;
  const barW = (W - gap * (data.length + 1)) / data.length;

  const chartLabel = data
    .map((d) => `${d.full}: ${formatKobo(d.value, currency)}`)
    .join("; ");

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Money collected per month. ${chartLabel}`}
      >
        {data.map((d, i) => {
          const h = Math.max(3, (d.value / max) * plotH);
          const x = gap + i * (barW + gap);
          const y = PAD_TOP + (plotH - h);
          return (
            <g key={d.label}>
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                className="num fill-[var(--ink-3)]"
                fontSize="9.5"
              >
                {d.value > 0 ? compact(d.value, currency) : ""}
              </text>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="6"
                fill={d.value > 0 ? "var(--primary)" : "var(--line)"}
                opacity={d.value > 0 ? 0.92 : 0.6}
              />
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-[var(--ink-3)]"
                fontSize="9.5"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Money collected per month</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.full}</th>
              <td>{formatKobo(d.value, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Compact chart labels in the same currency as the data. */
export function compact(minor: number, currency: Currency = "NGN"): string {
  const units = minor / 100;
  const symbol = currencySymbol(currency);
  if (units >= 1_000_000) return `${symbol}${(units / 1_000_000).toFixed(units % 1_000_000 ? 1 : 0)}m`;
  if (units >= 1_000) return `${symbol}${Math.round(units / 1_000)}k`;
  return `${symbol}${Number(units.toFixed(2))}`;
}
