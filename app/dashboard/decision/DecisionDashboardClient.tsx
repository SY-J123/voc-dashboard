"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  buildPivot,
  computeInsights,
  extractInsights,
  extractJourneyInsights,
  L2_COLORS,
  type Insight,
  type JourneyInsight,
  type ProblemInsight,
} from "../../lib/analytics";
import {
  JOURNEY_STAGES,
  PROBLEM_TYPES_L1,
  type ClassifiedReview,
} from "../../lib/types";

type SelectedCell = { journey: string; l1: string } | null;

const shownProblemTypes = PROBLEM_TYPES_L1.filter(
  (l1) => l1 !== "긍정" && l1 !== "_미분류",
);

const JOURNEY_SHORT: Record<string, string> = {
  "가입·로그인": "가입/로그인",
  "송금·이체": "송금",
  "결제": "결제",
  "금융상품": "금융상품",
  "프로모션·이벤트": "프로모션",
  "앱 전반·CS": "앱 전반",
  "_미상": "전반",
};

function taskTitle(insight: ProblemInsight): string {
  const journey = insight.topJourneys[0]?.journey;
  const short = journey ? JOURNEY_SHORT[journey] ?? journey : "전반";
  return `${short} ${insight.l2}`;
}

function pct(value: number, total: number) {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function heatClass(count: number, max: number, selected: boolean) {
  const selectedClass = selected ? " ring-2 ring-neutral-950 ring-inset" : "";
  if (count === 0) return "bg-white text-neutral-300" + selectedClass;
  const ratio = max > 0 ? count / max : 0;
  if (ratio >= 0.72) return "bg-red-600 text-white" + selectedClass;
  if (ratio >= 0.45) return "bg-orange-400 text-orange-950" + selectedClass;
  if (ratio >= 0.22) return "bg-orange-100 text-orange-950" + selectedClass;
  return "bg-neutral-100 text-neutral-700" + selectedClass;
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "danger" | "amber";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50"
        : "border-neutral-200 bg-white";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-xs text-neutral-500">{hint}</div>
    </div>
  );
}

function KeywordBars({
  keywords,
}: {
  keywords: { keyword: string; count: number }[];
}) {
  const max = keywords[0]?.count ?? 1;
  return (
    <div className="space-y-2">
      {keywords.slice(0, 6).map((item) => (
        <div key={item.keyword} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-xs">
          <div className="truncate text-neutral-600" title={item.keyword}>
            {item.keyword}
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900"
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
          <div className="text-right tabular-nums text-neutral-500">
            {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function PriorityItem({
  insight,
  active,
  onSelect,
}: {
  insight: ProblemInsight;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-neutral-200 bg-white hover:border-neutral-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-[11px] font-medium ${
              active ? "text-neutral-300" : "text-neutral-400"
            }`}
          >
            #{insight.rank} · {insight.l1}
          </div>
          <div className="mt-1 font-semibold leading-snug">{insight.l2}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">
            {insight.negCount}
          </div>
          <div
            className={`text-[11px] ${
              active ? "text-neutral-300" : "text-neutral-400"
            }`}
          >
            {insight.pctOfAll.toFixed(1)}%
          </div>
        </div>
      </div>
      <div
        className={`mt-3 flex flex-wrap gap-1.5 text-[11px] ${
          active ? "text-neutral-200" : "text-neutral-500"
        }`}
      >
        {insight.topJourneys.map((j) => (
          <span
            key={j.journey}
            className={`rounded px-1.5 py-0.5 ${
              active ? "bg-white/10" : "bg-neutral-100"
            }`}
          >
            {j.journey} {j.count}
          </span>
        ))}
      </div>
    </button>
  );
}

function EvidencePanel({ insight }: { insight: ProblemInsight | undefined }) {
  if (!insight) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
        개선 과제를 선택하면 근거가 표시됩니다.
      </div>
    );
  }

  const review = insight.representatives[0];

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <div className="text-xs font-medium text-neutral-500">선택 과제</div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            {insight.l2}
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            {insight.l1} · 부정 {insight.negCount}건 · 전체의{" "}
            {insight.pctOfAll.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-950">
          {insight.action.team}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-2 text-xs font-medium text-neutral-500">
            자주 등장한 문제 키워드
          </div>
          <KeywordBars keywords={insight.topKeywords} />
        </div>
        <div>
          <div className="mb-2 text-xs font-medium text-neutral-500">
            감정 어휘
          </div>
          <div className="flex flex-wrap gap-1.5">
            {insight.topEmotions.length === 0 ? (
              <span className="text-xs text-neutral-400">집계된 감정 어휘 없음</span>
            ) : (
              insight.topEmotions.map((e) => (
                <span
                  key={e.keyword}
                  className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                >
                  {e.keyword} <span className="opacity-60">{e.count}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {review && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium text-neutral-500">
            대표 리뷰
          </div>
          <blockquote className="border-l-2 border-neutral-300 pl-3 text-sm leading-relaxed text-neutral-700">
            <div className="mb-1 text-xs text-neutral-400">
              ★{review.rating} · 좋아요 {review.thumbs_up}
            </div>
            {review.text.length > 220
              ? `${review.text.slice(0, 220).trimEnd()}...`
              : review.text}
          </blockquote>
        </div>
      )}

      <div className="mt-5 rounded-lg bg-neutral-50 p-4">
        <div className="text-xs font-medium text-neutral-500">추천 액션</div>
        <div className="mt-1 text-sm font-medium text-neutral-900">
          {insight.action.suggestion}
        </div>
      </div>
    </section>
  );
}

function HeatmapSelectionPanel({
  selectedCell,
  selectedReviews,
  onClose,
}: {
  selectedCell: SelectedCell;
  selectedReviews: ClassifiedReview[];
  onClose: () => void;
}) {
  if (!selectedCell) {
    return (
      <aside className="rounded-lg border border-dashed border-neutral-300 bg-white p-5">
        <div className="text-xs font-medium text-neutral-500">
          히트맵 선택 영역
        </div>
        <div className="mt-2 text-lg font-semibold text-neutral-900">
          셀을 선택하세요
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          여정과 문제 유형이 만나는 셀을 누르면 해당 영역의 부정 리뷰
          근거가 이 패널에 표시됩니다.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-neutral-500">
            히트맵 선택 영역
          </div>
          <h3 className="mt-1 text-lg font-semibold leading-snug">
            {selectedCell.journey}
            <span className="mx-1 text-neutral-300">·</span>
            {selectedCell.l1}
          </h3>
          <div className="mt-1 text-xs text-neutral-500">
            대표 부정 리뷰 {selectedReviews.length}건
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:border-neutral-400"
        >
          닫기
        </button>
      </div>

      {selectedReviews.length === 0 ? (
        <div className="rounded-md bg-neutral-50 p-4 text-sm text-neutral-500">
          표시할 부정 리뷰가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {selectedReviews.map((review) => (
            <div
              key={review.review_id}
              className="rounded-md border border-neutral-100 bg-neutral-50 p-3"
            >
              <div className="mb-1 flex flex-wrap gap-1.5 text-[11px] text-neutral-400">
                <span>★{review.rating}</span>
                <span>·</span>
                <span>{review.problem_type_l2}</span>
                <span>·</span>
                <span>좋아요 {review.thumbs_up}</span>
              </div>
              <div className="line-clamp-3 text-sm leading-relaxed text-neutral-700">
                {review.cleaned_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function DonutTooltip({
  active,
  payload,
  totalNeg,
}: {
  active?: boolean;
  payload?: { payload?: { name: string; value: number; l1: string } }[];
  totalNeg: number;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const n = payload[0].payload;
  const ratio = totalNeg > 0 ? (n.value / totalNeg) * 100 : 0;
  return (
    <div className="rounded bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg">
      <div className="font-semibold">{n.name}</div>
      <div className="text-neutral-300">{n.l1}</div>
      <div className="mt-1 tabular-nums">
        부정 {n.value}건 · {ratio.toFixed(0)}%
      </div>
    </div>
  );
}

type L2Slice = { name: string; value: number; l1: string };

type CellDetail = {
  total: number;
  l2Rows: { l2: string; count: number }[];
  keywords: { keyword: string; count: number }[];
  reviews: ClassifiedReview[];
};

function HeatmapCellDetail({
  selectedCell,
  detail,
  totalNeg,
  onClose,
}: {
  selectedCell: SelectedCell;
  detail: CellDetail | null;
  totalNeg: number;
  onClose: () => void;
}) {
  const [randIdx, setRandIdx] = useState(0);

  useEffect(() => {
    setRandIdx(0);
  }, [selectedCell?.journey, selectedCell?.l1]);

  if (!selectedCell || !detail) {
    return (
      <section className="flex h-full flex-col rounded-lg border border-dashed border-neutral-300 bg-white p-5">
        <div className="text-xs font-medium text-neutral-500">
          히트맵 셀 상세
        </div>
        <div className="mt-2 text-base font-semibold text-neutral-900">
          셀을 선택하세요
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          왼쪽 히트맵에서 셀을 클릭하면 해당 영역의 L2 분포, 주요 키워드,
          대표 부정 리뷰가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  const { l2Rows, keywords, reviews, total } = detail;
  const sharePct = totalNeg > 0 ? (total / totalNeg) * 100 : 0;
  const l2Max = l2Rows[0]?.count ?? 1;
  const review = reviews.length > 0 ? reviews[randIdx % reviews.length] : null;

  const pickAnother = () => {
    if (reviews.length <= 1) return;
    let next = randIdx;
    let attempts = 0;
    while (next === randIdx && attempts < 8) {
      next = Math.floor(Math.random() * reviews.length);
      attempts += 1;
    }
    setRandIdx(next);
  };

  return (
    <section className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-neutral-500">
            히트맵 셀 상세
          </div>
          <h3 className="mt-1 truncate text-base font-semibold leading-snug">
            {selectedCell.journey}
            <span className="mx-1 text-neutral-300">·</span>
            {selectedCell.l1}
          </h3>
          <div className="mt-1 text-[11px] text-neutral-500">
            부정 {total}건 · 전체 부정의 {sharePct.toFixed(1)}%
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] text-neutral-500 hover:border-neutral-400"
        >
          닫기
        </button>
      </div>

      <div className="mt-3">
        <div className="mb-2 text-[11px] font-medium text-neutral-500">
          L2 분포
        </div>
        {l2Rows.length === 0 ? (
          <div className="rounded-md bg-neutral-50 p-2.5 text-[11px] text-neutral-400">
            집계된 L2 없음
          </div>
        ) : (
          <div className="space-y-1.5">
            {l2Rows.map((row) => {
              const ratio = total > 0 ? (row.count / total) * 100 : 0;
              return (
                <div
                  key={row.l2}
                  className="grid grid-cols-[1fr_3.5rem] items-center gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 flex-shrink-0 rounded-sm"
                        style={{
                          background: L2_COLORS[row.l2] ?? "#a3a3a3",
                        }}
                      />
                      <span
                        className="truncate text-neutral-700"
                        title={row.l2}
                      >
                        {row.l2}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, (row.count / l2Max) * 100)}%`,
                          background: L2_COLORS[row.l2] ?? "#a3a3a3",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right tabular-nums text-neutral-500">
                    {row.count}
                    <span className="ml-1 text-neutral-400">
                      {ratio.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-2 text-[11px] font-medium text-neutral-500">
          주요 키워드
        </div>
        {keywords.length === 0 ? (
          <div className="rounded-md bg-neutral-50 p-2.5 text-[11px] text-neutral-400">
            추출된 키워드 없음
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {keywords.map((k) => (
              <span
                key={k.keyword}
                className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-700"
              >
                {k.keyword}{" "}
                <span className="tabular-nums text-neutral-400">{k.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-baseline justify-between text-[11px]">
          <span className="font-medium text-neutral-500">대표 부정 리뷰</span>
          {reviews.length > 1 && (
            <button
              type="button"
              onClick={pickAnother}
              className="text-neutral-500 hover:text-neutral-900"
            >
              ↻ 다른 리뷰 불러오기
            </button>
          )}
        </div>
        {!review ? (
          <div className="rounded-md bg-neutral-50 p-2.5 text-[11px] text-neutral-400">
            표시할 리뷰가 없습니다.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto rounded-md border border-neutral-100 bg-neutral-50 p-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-400">
              <span>★{review.rating}</span>
              <span>·</span>
              <span
                className="rounded px-1 py-0.5"
                style={{
                  background: `${L2_COLORS[review.problem_type_l2] ?? "#e5e5e5"}33`,
                  color: "#525252",
                }}
              >
                {review.problem_type_l2}
              </span>
              {review.thumbs_up > 0 && (
                <>
                  <span>·</span>
                  <span>좋아요 {review.thumbs_up}</span>
                </>
              )}
              <span className="ml-auto tabular-nums text-neutral-300">
                {(randIdx % reviews.length) + 1} / {reviews.length}
              </span>
            </div>
            <div className="text-xs leading-relaxed text-neutral-700">
              {review.cleaned_text}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TopTaskList({
  priorities,
  activeRank,
  onSelect,
}: {
  priorities: ProblemInsight[];
  activeRank: number;
  onSelect: (idx: number) => void;
}) {
  const max = priorities[0]?.negCount ?? 1;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            Top 개선 과제
          </h3>
          <p className="mt-1 text-xs text-neutral-500">부정 리뷰 기준</p>
        </div>
        <span className="text-xs text-neutral-400">비율</span>
      </div>
      <div className="space-y-2">
        {priorities.slice(0, 5).map((item, idx) => {
          const active = idx === activeRank;
          return (
            <button
              key={`${item.l1}|${item.l2}`}
              type="button"
              onClick={() => onSelect(idx)}
              className={`w-full rounded-md border p-2.5 text-left transition-colors ${
                active
                  ? "border-red-200 bg-red-50"
                  : "border-transparent hover:border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <div className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    idx === 0
                      ? "bg-red-500 text-white"
                      : idx === 1
                        ? "bg-orange-500 text-white"
                        : idx === 2
                          ? "bg-amber-400 text-amber-950"
                          : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900">
                    {taskTitle(item)}
                  </div>
                  <div className="truncate text-[11px] text-neutral-400">
                    {item.l1}
                  </div>
                </div>
                <div className="text-right text-xs tabular-nums text-neutral-500">
                  {item.pctOfAll.toFixed(1)}%
                </div>
              </div>
              <div className="mt-2 ml-8 h-1.5 rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{
                    width: `${Math.max(5, (item.negCount / max) * 100)}%`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SelectedTaskPanel({
  insight,
  reviews,
}: {
  insight: ProblemInsight | undefined;
  reviews: ClassifiedReview[];
}) {
  if (!insight) return null;
  const journey = insight.topJourneys[0]?.journey;
  if (!journey) return null;

  const cellReviews = reviews
    .filter(
      (r) =>
        r.journey_stage === journey &&
        r.problem_type_l2 === insight.l2 &&
        r.sentiment_label === "부정",
    )
    .sort(
      (a, b) =>
        b.thumbs_up - a.thumbs_up ||
        b.cleaned_text.length - a.cleaned_text.length,
    );

  const journeyNegTotal = reviews.filter(
    (r) => r.journey_stage === journey && r.sentiment_label === "부정",
  ).length;
  const totalNeg = reviews.filter((r) => r.sentiment_label === "부정").length;

  const cellCount = cellReviews.length;
  const journeyShare = journeyNegTotal > 0 ? (cellCount / journeyNegTotal) * 100 : 0;
  const totalShare = totalNeg > 0 ? (cellCount / totalNeg) * 100 : 0;

  const kwMap = new Map<string, number>();
  const emMap = new Map<string, number>();
  for (const r of cellReviews) {
    for (const k of r.problem_keywords ?? [])
      kwMap.set(k, (kwMap.get(k) ?? 0) + 1);
    for (const k of r.emotion_keywords ?? [])
      emMap.set(k, (emMap.get(k) ?? 0) + 1);
  }
  const problemKeywords = [...kwMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);
  const emotionKeywords = [...emMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const reps = cellReviews.slice(0, 3);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="border-b border-neutral-100 pb-4">
        <div className="text-xs font-medium text-neutral-500">
          선택한 과제 상세
        </div>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
          {journey} · {insight.l2}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          {journey} 여정의 부정 리뷰 중 {insight.l2}가 가장 많이 반복됩니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span className="tabular-nums">
            부정{" "}
            <span className="font-semibold text-neutral-900">
              {cellCount.toLocaleString()}건
            </span>
          </span>
          <span className="text-neutral-300">·</span>
          <span className="tabular-nums">
            해당 여정 내{" "}
            <span className="font-semibold text-neutral-900">
              {journeyShare.toFixed(1)}%
            </span>
          </span>
          <span className="text-neutral-300">·</span>
          <span className="tabular-nums">
            전체 부정의{" "}
            <span className="font-semibold text-neutral-900">
              {totalShare.toFixed(1)}%
            </span>
          </span>
          <span className="text-neutral-300">·</span>
          <span>
            상위 분류 <span className="text-neutral-700">{insight.l1}</span>
          </span>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="grid grid-cols-[6.5rem_1fr] gap-3">
          <dt className="text-xs font-medium text-neutral-500 pt-0.5">
            문제 키워드
          </dt>
          <dd className="text-neutral-800">
            {problemKeywords.length > 0 ? problemKeywords.join(", ") : "—"}
          </dd>
        </div>
        <div className="grid grid-cols-[6.5rem_1fr] gap-3">
          <dt className="text-xs font-medium text-neutral-500 pt-0.5">
            감정 키워드
          </dt>
          <dd className="text-neutral-800">
            {emotionKeywords.length > 0 ? emotionKeywords.join(", ") : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="mb-2 text-xs font-medium text-neutral-500">
          대표 리뷰
        </div>
        {reps.length === 0 ? (
          <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-400">
            표시할 리뷰가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {reps.map((r) => (
              <div
                key={r.review_id}
                className="rounded-md border border-neutral-100 bg-neutral-50 p-3"
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-400">
                  <span>★{r.rating}</span>
                  {r.thumbs_up > 0 && (
                    <>
                      <span>·</span>
                      <span>좋아요 {r.thumbs_up}</span>
                    </>
                  )}
                </div>
                <div className="text-sm leading-relaxed text-neutral-700">
                  {r.cleaned_text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="text-xs font-medium text-amber-900">추천 액션</div>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="text-xs text-amber-800 pt-0.5">담당 팀</dt>
            <dd className="font-medium text-neutral-900">
              {insight.action.team}
            </dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="text-xs text-amber-800 pt-0.5">개선 방향</dt>
            <dd className="text-neutral-800">{insight.action.suggestion}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="text-xs text-amber-800 pt-0.5">
              우선 확인할 로그/화면
            </dt>
            <dd className="text-neutral-800">{insight.action.inspect}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function InsightsSection({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  const tone: Record<
    Insight["kind"],
    { border: string; bg: string; label: string; labelText: string }
  > = {
    weakness: {
      border: "border-red-200",
      bg: "bg-red-50",
      label: "약점",
      labelText: "text-red-700",
    },
    strength: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      label: "강점",
      labelText: "text-emerald-700",
    },
    ambiguous: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      label: "모호",
      labelText: "text-amber-700",
    },
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold tracking-tight">인사이트</h3>
        <p className="mt-1 text-xs text-neutral-500">
          이번 데이터에서 도출한 약점·강점·모호 영역
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((ins, idx) => {
          const t = tone[ins.kind];
          return (
            <div
              key={`${ins.kind}-${idx}`}
              className={`rounded-lg border ${t.border} ${t.bg} p-4`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wide ${t.labelText}`}
              >
                {t.label}
              </div>
              <div className="mt-1.5 text-sm font-semibold leading-snug text-neutral-900">
                {ins.headline}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-neutral-600">
                {ins.detail}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DataQualityPanel({
  stats,
  period,
}: {
  stats: { total: number; negative: number; ambiguous: number };
  period: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold tracking-tight">
          데이터 신뢰도
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <div className="text-xs text-blue-700">감정·별점 일치율</div>
          <div className="mt-1 text-2xl font-semibold text-blue-700">86.7%</div>
        </div>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold tracking-tight">검수 필요 리뷰</div>
        <div className="mt-2 text-2xl font-semibold text-orange-500 tabular-nums">
          {stats.ambiguous.toLocaleString()}건
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          전체의 {pct(stats.ambiguous, stats.total)}
        </div>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold tracking-tight">메타 정보</div>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-400">데이터 기간</dt>
            <dd className="text-right text-neutral-700">{period}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-400">리뷰 출처</dt>
            <dd className="text-right text-neutral-700">Google Play</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-400">분석 모델</dt>
            <dd className="text-right text-neutral-700">Claude Haiku 4.5</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function JourneyDetailSection({
  journeys,
  activeJourney,
  reviews,
  onSelectJourney,
  onSelectCell,
}: {
  journeys: JourneyInsight[];
  activeJourney: string | null;
  reviews: ClassifiedReview[];
  onSelectJourney: (journey: string) => void;
  onSelectCell: (cell: SelectedCell) => void;
}) {
  const active = journeys.find((j) => j.journey === activeJourney) ?? journeys[0];
  const top = active?.topIssue;

  // 여정의 L2 분포 (도넛용) + L2별 키워드 맵 + L2별 부정 리뷰 버킷
  const journeyData = useMemo(() => {
    if (!active) {
      return {
        slices: [] as L2Slice[],
        keywordsByL2: new Map<string, { keyword: string; count: number }[]>(),
        bucketsByL2: new Map<string, ClassifiedReview[]>(),
      };
    }
    const sliceMap = new Map<string, { value: number; l1: string }>();
    const keywordsByL2 = new Map<string, Map<string, number>>();
    const bucketsByL2 = new Map<string, ClassifiedReview[]>();

    for (const r of reviews) {
      if (r.journey_stage !== active.journey) continue;
      if (r.sentiment_label !== "부정") continue;
      if (r.problem_type_l1 === "긍정") continue;
      if (r.problem_type_l1 === "_미분류") continue;
      const l2 = r.problem_type_l2;
      const slice = sliceMap.get(l2);
      if (slice) slice.value += 1;
      else sliceMap.set(l2, { value: 1, l1: r.problem_type_l1 });

      if (!keywordsByL2.has(l2)) keywordsByL2.set(l2, new Map());
      const kw = keywordsByL2.get(l2)!;
      for (const k of r.problem_keywords ?? [])
        kw.set(k, (kw.get(k) ?? 0) + 1);

      if (!bucketsByL2.has(l2)) bucketsByL2.set(l2, []);
      bucketsByL2.get(l2)!.push(r);
    }

    const slices: L2Slice[] = [...sliceMap.entries()]
      .map(([name, info]) => ({ name, value: info.value, l1: info.l1 }))
      .sort((a, b) => b.value - a.value);

    const finalKeywords = new Map<
      string,
      { keyword: string; count: number }[]
    >();
    for (const [l2, m] of keywordsByL2) {
      finalKeywords.set(
        l2,
        [...m.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([keyword, count]) => ({ keyword, count })),
      );
    }
    return { slices, keywordsByL2: finalKeywords, bucketsByL2 };
  }, [active, reviews]);

  // 도넛 슬라이스 / 리스트에서 선택된 L2. 기본은 top L2
  const [focusL2, setFocusL2] = useState<string | null>(null);
  useEffect(() => {
    setFocusL2(null); // 여정 바뀌면 reset
  }, [active?.journey]);

  const effectiveFocusL2 =
    focusL2 ?? top?.l2 ?? journeyData.slices[0]?.name ?? null;

  const focusedKeywords = effectiveFocusL2
    ? journeyData.keywordsByL2.get(effectiveFocusL2) ?? []
    : [];

  // 대표 리뷰: focused L2 의 부정 리뷰 풀에서 무작위 / 좋아요+길이 정렬
  const repBucket = useMemo(() => {
    if (!effectiveFocusL2) return [];
    return [...(journeyData.bucketsByL2.get(effectiveFocusL2) ?? [])].sort(
      (a, b) =>
        b.thumbs_up - a.thumbs_up ||
        b.cleaned_text.length - a.cleaned_text.length,
    );
  }, [journeyData.bucketsByL2, effectiveFocusL2]);

  const [randIdx, setRandIdx] = useState<number | null>(null);
  useEffect(() => {
    setRandIdx(null);
  }, [active?.journey, effectiveFocusL2]);

  const representative =
    repBucket.length === 0
      ? null
      : randIdx === null
        ? repBucket[0]
        : repBucket[randIdx];

  const refresh = () => {
    if (repBucket.length <= 1) return;
    let next = randIdx;
    let attempts = 0;
    while (
      (next === randIdx || (randIdx === null && next === 0)) &&
      attempts < 8
    ) {
      next = Math.floor(Math.random() * repBucket.length);
      attempts += 1;
    }
    setRandIdx(next);
  };

  const focusedSlice = journeyData.slices.find(
    (s) => s.name === effectiveFocusL2,
  );
  const focusedShare =
    active && focusedSlice && active.totalNeg > 0
      ? (focusedSlice.value / active.totalNeg) * 100
      : 0;

  const negShare =
    active && active.totalAll > 0 ? (active.totalNeg / active.totalAll) * 100 : 0;

  if (!active) return null;

  return (
    <section className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <aside className="rounded-lg border border-neutral-200 bg-white p-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">여정별 상세</h3>
          <p className="mt-1 text-xs text-neutral-500">
            부정 리뷰가 많은 여정 순으로 정렬했습니다.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {journeys.map((journey) => {
            const isActive = journey.journey === active.journey;
            return (
              <button
                key={journey.journey}
                type="button"
                onClick={() => onSelectJourney(journey.journey)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  isActive
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white hover:border-neutral-400"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`text-[11px] font-medium ${
                        isActive ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      #{journey.rank} 여정
                    </div>
                    <div className="mt-1 font-semibold">{journey.journey}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {journey.totalNeg}
                    </div>
                    <div
                      className={`text-[11px] ${
                        isActive ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      / {journey.totalAll}
                    </div>
                  </div>
                </div>
                {journey.topIssue && (
                  <div
                    className={`mt-2 truncate text-xs ${
                      isActive ? "text-neutral-200" : "text-neutral-500"
                    }`}
                    title={journey.topIssue.l2}
                  >
                    핵심: {journey.topIssue.l2}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="min-w-0">
            <div className="text-xs font-medium text-neutral-500">
              선택 여정
            </div>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight">
              {active.journey}
            </h3>
            <div className="mt-3 flex items-baseline gap-3">
              <div>
                <span className="text-3xl font-bold tabular-nums">
                  {active.totalNeg}
                </span>
                <span className="ml-1 text-sm text-neutral-500">
                  / {active.totalAll}건
                </span>
              </div>
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 tabular-nums">
                부정 {negShare.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-72 max-w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-red-500"
                style={{ width: `${negShare}%` }}
              />
            </div>
          </div>
          {top && (
            <button
              type="button"
              onClick={() =>
                onSelectCell({ journey: active.journey, l1: top.l1 })
              }
              className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400"
            >
              히트맵에서 보기
            </button>
          )}
        </div>

        {!top || journeyData.slices.length === 0 ? (
          <div className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
            이 여정에는 집계된 부정 핵심 이슈가 없습니다.
          </div>
        ) : (
          <>
            {/* 도넛 + 키워드 bars */}
            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
              {/* 좌: L2 도넛 */}
              <div>
                <div className="mb-2 text-xs font-medium text-neutral-500">
                  L2 분포 — 슬라이스 클릭으로 키워드·리뷰 필터
                </div>
                <div className="relative" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={journeyData.slices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={100}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                        onClick={(slice: { name?: string }) => {
                          if (slice?.name) setFocusL2(slice.name);
                        }}
                        isAnimationActive={false}
                      >
                        {journeyData.slices.map((s) => (
                          <Cell
                            key={s.name}
                            fill={L2_COLORS[s.name] ?? "#a3a3a3"}
                            stroke={
                              effectiveFocusL2 === s.name ? "#171717" : "#fff"
                            }
                            strokeWidth={effectiveFocusL2 === s.name ? 2 : 2}
                            cursor="pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <DonutTooltip totalNeg={active.totalNeg} />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                      Focus
                    </div>
                    <div
                      className="mt-0.5 max-w-[140px] truncate text-sm font-semibold text-neutral-900"
                      title={effectiveFocusL2 ?? ""}
                    >
                      {effectiveFocusL2 ?? "—"}
                    </div>
                    <div className="text-xs tabular-nums text-neutral-500">
                      {focusedSlice?.value ?? 0} · {focusedShare.toFixed(0)}%
                    </div>
                  </div>
                </div>
                {/* 슬라이스 리스트 (클릭 = focus 전환) */}
                <div className="mt-3 space-y-1 text-xs">
                  {journeyData.slices.map((s) => {
                    const isFocus = effectiveFocusL2 === s.name;
                    const ratio =
                      active.totalNeg > 0
                        ? (s.value / active.totalNeg) * 100
                        : 0;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setFocusL2(s.name)}
                        className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left ${
                          isFocus
                            ? "bg-neutral-100 font-medium"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                            style={{
                              background: L2_COLORS[s.name] ?? "#a3a3a3",
                            }}
                          />
                          <span className="truncate">{s.name}</span>
                          <span className="text-neutral-400">{s.l1}</span>
                        </span>
                        <span className="tabular-nums text-neutral-500">
                          {s.value}
                          <span className="ml-1 text-neutral-400">
                            ({ratio.toFixed(0)}%)
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 우: 키워드 bars */}
              <div>
                <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
                  <div className="font-medium text-neutral-500">
                    자주 등장한 키워드
                  </div>
                  <div
                    className="truncate text-neutral-400"
                    title={effectiveFocusL2 ?? ""}
                  >
                    {effectiveFocusL2 ?? "—"}
                  </div>
                </div>
                {focusedKeywords.length === 0 ? (
                  <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-400">
                    이 L2에는 추출된 키워드가 없습니다.
                  </div>
                ) : (
                  <KeywordBars keywords={focusedKeywords} />
                )}

                {top.emotions.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs font-medium text-neutral-500">
                      감정 어휘 (이 여정의 주된 문제 기준)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {top.emotions.map((e) => (
                        <span
                          key={e.keyword}
                          className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                        >
                          {e.keyword}{" "}
                          <span className="opacity-60">{e.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 대표 리뷰 + 새로고침 */}
            {representative && (
              <div className="mt-5 border-t border-neutral-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium text-neutral-500">
                    대표 리뷰{" "}
                    <span className="text-neutral-400">
                      · {effectiveFocusL2}
                    </span>
                  </div>
                  {repBucket.length > 1 && (
                    <button
                      type="button"
                      onClick={refresh}
                      className="text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      ↻ 다른 리뷰
                    </button>
                  )}
                </div>
                <blockquote className="border-l-2 border-neutral-300 pl-3 text-sm leading-relaxed text-neutral-700">
                  <div className="mb-1 text-xs text-neutral-400">
                    ★{representative.rating} · 좋아요{" "}
                    {representative.thumbs_up}
                  </div>
                  {representative.cleaned_text.length > 260
                    ? `${representative.cleaned_text.slice(0, 260).trimEnd()}...`
                    : representative.cleaned_text}
                </blockquote>
              </div>
            )}

            {/* 액션 (이 여정의 주된 문제 기준) */}
            <div className="mt-5 rounded-lg bg-amber-50 p-4">
              <div className="text-xs font-medium text-amber-900">
                {top.action.team}{" "}
                <span className="text-amber-700/70">· {top.l2}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                {top.action.suggestion}
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}

export default function DecisionDashboardClient({
  reviews,
}: {
  reviews: ClassifiedReview[];
}) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);
  const [activeRank, setActiveRank] = useState(0);
  const [activeJourney, setActiveJourney] = useState<string | null>(null);

  const pivot = useMemo(() => buildPivot(reviews), [reviews]);
  const priorities = useMemo(() => extractInsights(reviews, 6), [reviews]);
  const journeys = useMemo(() => extractJourneyInsights(reviews), [reviews]);
  const insights = useMemo(() => computeInsights(reviews), [reviews]);

  const stats = useMemo(() => {
    const negative = reviews.filter((r) => r.sentiment_label === "부정").length;
    const ambiguous = reviews.filter(
      (r) => r.problem_type_l1 === "_미분류" || r.needs_review,
    ).length;
    const top = priorities[0];
    return {
      total: reviews.length,
      negative,
      ambiguous,
      topLabel: top ? `${top.l2}` : "-",
      topHint: top
        ? `${top.topJourneys[0]?.journey ?? top.l1} · 부정 ${top.negCount}건`
        : "집계 없음",
    };
  }, [reviews, priorities]);

  const cellDetail = useMemo<CellDetail | null>(() => {
    if (!selectedCell) return null;
    const items = reviews.filter(
      (r) =>
        r.journey_stage === selectedCell.journey &&
        r.problem_type_l1 === selectedCell.l1 &&
        r.sentiment_label === "부정",
    );
    const sorted = [...items].sort(
      (a, b) =>
        b.thumbs_up - a.thumbs_up ||
        (b.problem_type_confidence ?? 0) - (a.problem_type_confidence ?? 0),
    );
    const l2Counts = new Map<string, number>();
    const kwMap = new Map<string, number>();
    for (const r of items) {
      l2Counts.set(
        r.problem_type_l2,
        (l2Counts.get(r.problem_type_l2) ?? 0) + 1,
      );
      for (const k of r.problem_keywords ?? [])
        kwMap.set(k, (kwMap.get(k) ?? 0) + 1);
    }
    const l2Rows = [...l2Counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([l2, count]) => ({ l2, count }));
    const keywords = [...kwMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword, count]) => ({ keyword, count }));
    return { total: items.length, l2Rows, keywords, reviews: sorted };
  }, [reviews, selectedCell]);

  const activeInsight = priorities[activeRank] ?? priorities[0];
  const period = useMemo(() => {
    const dates = reviews
      .map((review) => review.review_date)
      .filter(Boolean)
      .sort();
    if (dates.length === 0) return "-";
    return `${dates[0]} ~ ${dates[dates.length - 1]}`;
  }, [reviews]);

  return (
    <article className="-mx-6 -my-8 bg-neutral-50">
      <div className="min-h-[calc(100vh-8rem)]">
        <div className="space-y-4 p-5">
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600" />
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  토스 VOC 대시보드
                </h2>
                <p className="text-xs text-neutral-500">
                  하단은 선택한 과제의 키워드 / 감정 / 대표 리뷰 / 추천 액션
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700">
                {period}
              </button>
              <button className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700">
                전체 앱
              </button>
              <button className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700">
                필터
              </button>
              <div className="text-xs text-neutral-400">
                데이터 기준: {stats.total.toLocaleString()}건
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="전체 리뷰"
              value={stats.total.toLocaleString()}
              hint="전 기간 대비 집계"
            />
            <StatCard
              label="부정 비율"
              value={pct(stats.negative, stats.total)}
              hint={`${stats.negative.toLocaleString()}건`}
              tone="danger"
            />
            <StatCard
              label="최우선 과제"
              value={stats.topLabel}
              hint={stats.topHint}
              tone="amber"
            />
            <StatCard
              label="검수 필요"
              value={stats.ambiguous.toLocaleString()}
              hint={pct(stats.ambiguous, stats.total)}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
            <div className="rounded-lg border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-3">
                <h3 className="text-base font-semibold tracking-tight">
                  여정별 문제 분포
                </h3>
              </div>
              <div className="overflow-x-auto p-3">
                <table className="w-full min-w-[760px] border-separate border-spacing-1 text-sm">
                  <thead>
                    <tr>
                      <th className="w-36 px-2 py-2 text-left text-xs font-medium text-neutral-500">
                        여정
                      </th>
                      {shownProblemTypes.map((l1) => (
                        <th
                          key={l1}
                          className="px-2 py-2 text-center text-xs font-medium text-neutral-500"
                        >
                          {l1}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center text-xs font-medium text-red-500">
                        여정별 부정 합계
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {JOURNEY_STAGES.filter((j) => j !== "_미상").map((journey) => {
                      const journeyMeta = journeys.find(
                        (j) => j.journey === journey,
                      );
                      const rowTotal = shownProblemTypes.reduce(
                        (sum, l1) => sum + pivot.neg[journey][l1],
                        0,
                      );
                      return (
                        <tr key={journey}>
                          <th className="px-2 py-2 text-left align-middle">
                            <div className="font-medium text-neutral-800">
                              {journey}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              부정 {journeyMeta?.totalNeg ?? 0}
                            </div>
                          </th>
                          {shownProblemTypes.map((l1) => {
                            const count = pivot.neg[journey][l1];
                            const total = count + pivot.pos[journey][l1];
                            const isSelected =
                              selectedCell?.journey === journey &&
                              selectedCell?.l1 === l1;
                            return (
                              <td key={l1} className="p-0.5">
                                <button
                                  type="button"
                                  disabled={total === 0}
                                  onClick={() => {
                                    setSelectedCell(
                                      isSelected ? null : { journey, l1 },
                                    );
                                    setActiveJourney(journey);
                                  }}
                                  className={`h-14 w-full rounded px-2 text-center transition ${heatClass(
                                    count,
                                    pivot.max,
                                    isSelected,
                                  )} ${
                                    total > 0
                                      ? "cursor-pointer hover:scale-[1.02]"
                                      : "cursor-default"
                                  }`}
                                >
                                  <div className="text-base font-semibold tabular-nums">
                                    {count}
                                  </div>
                                  <div className="text-[11px] opacity-70">
                                    {pct(count, stats.negative)}
                                  </div>
                                </button>
                              </td>
                            );
                          })}
                          <td className="p-0.5">
                            <div className="h-14 rounded bg-red-50 px-2 py-1 text-center text-red-500">
                              <div className="text-base font-semibold tabular-nums">
                                {rowTotal.toLocaleString()}
                              </div>
                              <div className="text-[11px]">
                                {pct(rowTotal, stats.negative)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <HeatmapCellDetail
              selectedCell={selectedCell}
              detail={cellDetail}
              totalNeg={stats.negative}
              onClose={() => setSelectedCell(null)}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <TopTaskList
              priorities={priorities}
              activeRank={activeRank}
              onSelect={setActiveRank}
            />
            <SelectedTaskPanel insight={activeInsight} reviews={reviews} />
          </section>

          <JourneyDetailSection
            journeys={journeys}
            activeJourney={activeJourney}
            reviews={reviews}
            onSelectJourney={setActiveJourney}
            onSelectCell={setSelectedCell}
          />

          <InsightsSection insights={insights} />

          <DataQualityPanel stats={stats} period={period} />
        </div>
      </div>
    </article>
  );
}
