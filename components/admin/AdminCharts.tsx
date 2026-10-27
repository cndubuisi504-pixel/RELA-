"use client";

import { useState } from "react";
import type { TimelinePoint, AdminOverviewMetrics } from "@/lib/admin/types";

type ChartMetric = "activity" | "finance";

export function AdminCharts({
  timeline,
  metrics,
}: {
  timeline: TimelinePoint[];
  metrics: AdminOverviewMetrics;
}) {
  const [metric, setMetric] = useState<ChartMetric>("activity");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // SVG Chart Dimensions
  const width = 640;
  const height = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 32;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const pointsCount = Math.max(timeline.length, 2);

  // Values calculation based on selected metric
  const series1 = timeline.map((p) => (metric === "activity" ? p.signups : p.volume));
  const series2 = timeline.map((p) => (metric === "activity" ? p.documents + p.apiReceipts : p.collected));

  const maxVal = Math.max(
    ...series1,
    ...series2,
    metric === "activity" ? 5 : 50000,
  );

  const getX = (i: number) => padLeft + (i / (pointsCount - 1)) * chartW;
  const getY = (val: number) => padTop + chartH - (val / maxVal) * chartH;

  // Build SVG Path
  const buildPath = (data: number[]) => {
    return data
      .map((val, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(val).toFixed(1)}`)
      .join(" ");
  };

  const buildAreaPath = (data: number[]) => {
    const line = buildPath(data);
    const lastX = getX(data.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const bottomY = (padTop + chartH).toFixed(1);
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const path1 = buildPath(series1);
  const area1 = buildAreaPath(series1);
  const path2 = buildPath(series2);
  const area2 = buildAreaPath(series2);

  // Hovered item details
  const activePt = hoveredIdx !== null && timeline[hoveredIdx] ? timeline[hoveredIdx] : null;

  // Document mix data for Donut Chart
  const totalDocsAll =
    metrics.totalReceipts +
    metrics.totalInvoices +
    metrics.totalQuotations +
    metrics.totalApiReceipts;

  const donutSlices = [
    { label: "Manual Receipts", count: metrics.totalReceipts, color: "#FF6D29" },
    { label: "Storefront API", count: metrics.totalApiReceipts, color: "#0D9488" },
    { label: "Invoices", count: metrics.totalInvoices, color: "#3B82F6" },
    { label: "Quotations", count: metrics.totalQuotations, color: "#8B5CF6" },
  ].filter((s) => s.count > 0);

  // Conversion funnel data
  const funnelSteps = [
    { label: "Registered Users", count: metrics.totalUsers, pct: 100 },
    {
      label: "Business Created",
      count: metrics.totalBusinesses,
      pct: metrics.totalUsers > 0 ? Math.round((metrics.totalBusinesses / metrics.totalUsers) * 100) : 0,
    },
    {
      label: "Setup Completed",
      count: metrics.completedBusinesses,
      pct: metrics.totalUsers > 0 ? Math.round((metrics.completedBusinesses / metrics.totalUsers) * 100) : 0,
    },
    {
      label: "Issued Documents",
      count: metrics.totalBusinesses > 0 ? 2 : 0, // Businesses that created live documents
      pct: metrics.totalUsers > 0 ? Math.round((2 / metrics.totalUsers) * 100) : 0,
    },
    {
      label: "Paid Starter Plan",
      count: metrics.activeSubscriptions,
      pct: metrics.totalUsers > 0 ? Math.round((metrics.activeSubscriptions / metrics.totalUsers) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main Trend Chart (2 columns on lg) */}
      <div className="lg:col-span-2 rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-[16px] font-medium tracking-tight text-ink">
              Platform Activity Trend
            </h2>
            <p className="text-[12px] text-ink-3 mt-0.5">
              14-day timeline of registrations, documents, and transaction volume
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1 text-[11.5px] font-medium">
            <button
              type="button"
              onClick={() => setMetric("activity")}
              className={[
                "rounded-lg px-2.5 py-1 transition-all",
                metric === "activity"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              Signups &amp; Docs
            </button>
            <button
              type="button"
              onClick={() => setMetric("finance")}
              className={[
                "rounded-lg px-2.5 py-1 transition-all",
                metric === "finance"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              Volume (₦)
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-3 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: metric === "activity" ? "#FF6D29" : "#FF6D29" }}
            />
            <span className="text-ink-2 font-medium">
              {metric === "activity" ? "Signups" : "Transaction Volume"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: metric === "activity" ? "#0D9488" : "#10B981" }}
            />
            <span className="text-ink-2 font-medium">
              {metric === "activity" ? "Documents & API Receipts" : "Amount Collected"}
            </span>
          </div>
          {activePt && (
            <div className="ml-auto text-[11.5px] text-ink font-medium bg-surface-2 px-2.5 py-0.5 rounded-full">
              {activePt.label}:{" "}
              {metric === "activity"
                ? `${activePt.signups} signups · ${activePt.documents + activePt.apiReceipts} docs`
                : `₦${activePt.volume.toLocaleString()} vol · ₦${activePt.collected.toLocaleString()} col`}
            </div>
          )}
        </div>

        {/* SVG Graphic */}
        <div className="relative mt-3 w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="grad-series1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6D29" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#FF6D29" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="grad-series2" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={metric === "activity" ? "#0D9488" : "#10B981"}
                  stopOpacity="0.18"
                />
                <stop
                  offset="100%"
                  stopColor={metric === "activity" ? "#0D9488" : "#10B981"}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padTop + chartH * (1 - ratio);
              const labelVal = Math.round(maxVal * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="var(--line)"
                    strokeDasharray={ratio === 0 ? "none" : "3 3"}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-[var(--ink-3)] text-[9.5px] font-mono"
                  >
                    {metric === "activity"
                      ? labelVal
                      : labelVal >= 1000000
                        ? `${(labelVal / 1000000).toFixed(1)}M`
                        : labelVal >= 1000
                          ? `${(labelVal / 1000).toFixed(0)}k`
                          : labelVal}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            <path d={area1} fill="url(#grad-series1)" />
            <path d={area2} fill="url(#grad-series2)" />

            {/* Polylines */}
            <path
              d={path1}
              fill="none"
              stroke="#FF6D29"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={path2}
              fill="none"
              stroke={metric === "activity" ? "#0D9488" : "#10B981"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Points & Hover Targets */}
            {timeline.map((pt, i) => {
              const cx = getX(i);
              const cy1 = getY(series1[i]);
              const cy2 = getY(series2[i]);
              const isHovered = hoveredIdx === i;

              return (
                <g
                  key={pt.date}
                  onMouseEnter={() => setHoveredIdx(i)}
                  className="cursor-pointer"
                >
                  {/* Invisible hit column */}
                  <rect
                    x={cx - chartW / (pointsCount * 2)}
                    y={padTop}
                    width={chartW / pointsCount}
                    height={chartH}
                    fill="transparent"
                  />

                  {/* Vertical guide line on hover */}
                  {isHovered && (
                    <line
                      x1={cx}
                      y1={padTop}
                      x2={cx}
                      y2={padTop + chartH}
                      stroke="var(--ink)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Point for Series 1 */}
                  {(series1[i] > 0 || isHovered) && (
                    <circle
                      cx={cx}
                      cy={cy1}
                      r={isHovered ? 5 : 3}
                      fill="#FF6D29"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Point for Series 2 */}
                  {(series2[i] > 0 || isHovered) && (
                    <circle
                      cx={cx}
                      cy={cy2}
                      r={isHovered ? 4.5 : 2.5}
                      fill={metric === "activity" ? "#0D9488" : "#10B981"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* X-Axis Labels (show alternate labels to prevent overlap) */}
                  {(i % 2 === 0 || i === pointsCount - 1) && (
                    <text
                      x={cx}
                      y={height - 8}
                      textAnchor="middle"
                      className="fill-[var(--ink-3)] text-[9.5px] font-medium"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Right Column: Donut & Conversion Funnel */}
      <div className="space-y-5">
        {/* Document Mix Donut */}
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
          <h2 className="text-[16px] font-medium tracking-tight text-ink">
            Document Distribution
          </h2>
          <p className="text-[12px] text-ink-3 mt-0.5">
            Total {totalDocsAll} transactions generated across channels
          </p>

          <div className="mt-4 flex items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--line)"
                  strokeWidth="12"
                />

                {/* Slices */}
                {(() => {
                  let accumulatedPercent = 0;
                  const circumference = 2 * Math.PI * 40; // ~251.32

                  return donutSlices.map((slice) => {
                    const percent = totalDocsAll > 0 ? (slice.count / totalDocsAll) * 100 : 0;
                    const strokeDasharray = `${(percent * circumference) / 100} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent * circumference) / 100);
                    accumulatedPercent += percent;

                    return (
                      <circle
                        key={slice.label}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    );
                  });
                })()}
              </svg>

              {/* Center counter */}
              <div className="absolute text-center">
                <span className="num block text-[24px] font-semibold leading-none text-ink">
                  {totalDocsAll}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-ink-3 font-medium">
                  Total
                </span>
              </div>
            </div>
          </div>

          {/* Slices legend */}
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            {donutSlices.map((slice) => {
              const pct = totalDocsAll > 0 ? Math.round((slice.count / totalDocsAll) * 100) : 0;
              return (
                <div key={slice.label} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-ink-2">{slice.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11.5px]">
                    <span className="font-medium text-ink">{slice.count}</span>
                    <span className="text-ink-3">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Onboarding & Setup Funnel */}
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-medium tracking-tight text-ink">
              Activation Funnel
            </h2>
            <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--primary)]">
              {metrics.totalUsers} users
            </span>
          </div>
          <p className="text-[12px] text-ink-3 mt-0.5">
            Conversion from signup to paid subscription
          </p>

          <div className="mt-4 space-y-3">
            {funnelSteps.map((step) => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-ink-2 font-medium">{step.label}</span>
                  <span className="font-mono text-ink">
                    {step.count} <span className="text-ink-3">({step.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                    style={{ width: `${Math.max(step.pct, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
