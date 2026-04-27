"use client";

import { useMemo, useState } from "react";

import {
  buildPivot,
  extractInsights,
  extractJourneyInsights,
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

  const representative = useMemo(() => {
    if (!active || !top) return null;
    return reviews
      .filter(
        (r) =>
          r.journey_stage === active.journey &&
          r.problem_type_l1 === top.l1 &&
          r.problem_type_l2 === top.l2 &&
          r.sentiment_label === "부정",
      )
      .sort(
        (a, b) =>
          b.thumbs_up - a.thumbs_up ||
          b.cleaned_text.length - a.cleaned_text.length,
      )[0];
  }, [active, reviews, top]);

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
          <div>
            <div className="text-xs font-medium text-neutral-500">
              선택 여정
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">
              {active.journey}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              부정 {active.totalNeg}건 · 전체 {active.totalAll}건 · 부정 비중{" "}
              {pct(active.totalNeg, active.totalAll)}
            </p>
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

        {!top ? (
          <div className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
            이 여정에는 집계된 부정 핵심 이슈가 없습니다.
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  핵심 이슈
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <div className="text-xl font-semibold text-neutral-950">
                    {top.l2}
                  </div>
                  <div className="text-sm text-neutral-500">{top.l1}</div>
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  부정 {top.count}건 · 이 여정 부정의{" "}
                  {top.pctOfJourney.toFixed(0)}%
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-xs font-medium text-neutral-500">
                    자주 등장한 문제 키워드
                  </div>
                  <KeywordBars keywords={top.keywords} />
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-neutral-500">
                  감정 어휘
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {top.emotions.length === 0 ? (
                    <span className="text-xs text-neutral-400">
                      집계된 감정 어휘 없음
                    </span>
                  ) : (
                    top.emotions.map((e) => (
                      <span
                        key={e.keyword}
                        className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                      >
                        {e.keyword} <span className="opacity-60">{e.count}</span>
                      </span>
                    ))
                  )}
                </div>

                {active.secondaryIssues.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs font-medium text-neutral-500">
                      같이 자주 나타나는 추가 이슈
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {active.secondaryIssues.map((issue) => (
                        <span
                          key={`${issue.l1}|${issue.l2}`}
                          className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700"
                        >
                          {issue.l2}{" "}
                          <span className="text-neutral-400">{issue.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {representative && (
              <div className="mt-5 border-t border-neutral-100 pt-4">
                <div className="mb-2 text-xs font-medium text-neutral-500">
                  대표 리뷰
                </div>
                <blockquote className="border-l-2 border-neutral-300 pl-3 text-sm leading-relaxed text-neutral-700">
                  <div className="mb-1 text-xs text-neutral-400">
                    ★{representative.rating} · 좋아요 {representative.thumbs_up}
                  </div>
                  {representative.cleaned_text.length > 260
                    ? `${representative.cleaned_text.slice(0, 260).trimEnd()}...`
                    : representative.cleaned_text}
                </blockquote>
              </div>
            )}

            <div className="mt-5 rounded-lg bg-amber-50 p-4">
              <div className="text-xs font-medium text-amber-900">
                {top.action.team}
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

  const selectedReviews = useMemo(() => {
    if (!selectedCell) return [];
    return reviews
      .filter(
        (r) =>
          r.journey_stage === selectedCell.journey &&
          r.problem_type_l1 === selectedCell.l1 &&
          r.sentiment_label === "부정",
      )
      .sort(
        (a, b) =>
          b.thumbs_up - a.thumbs_up ||
          (b.problem_type_confidence ?? 0) - (a.problem_type_confidence ?? 0),
      )
      .slice(0, 5);
  }, [reviews, selectedCell]);

  const activeInsight = priorities[activeRank] ?? priorities[0];

  return (
    <article className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-orange-700">
            개선 우선순위 보드
          </div>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            토스 VOC 대시보드
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
            부정 리뷰가 어디에 몰리는지, 어떤 문제부터 제품팀 백로그로
            가져가야 하는지 한 화면에서 판단합니다.
          </p>
        </div>
        <div className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-500">
          Google Play 리뷰 스냅샷
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="전체 리뷰"
          value={stats.total.toLocaleString()}
          hint="LLM 분류 완료 리뷰"
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

      <JourneyDetailSection
        journeys={journeys}
        activeJourney={activeJourney}
        reviews={reviews}
        onSelectJourney={setActiveJourney}
        onSelectCell={setSelectedCell}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                여정 × 문제 유형
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                셀은 부정 리뷰 건수입니다. 클릭하면 대표 리뷰를 확인합니다.
              </p>
            </div>
            <div className="text-xs text-neutral-400">
              진할수록 개선 우선순위 높음
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
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
                </tr>
              </thead>
              <tbody>
                {JOURNEY_STAGES.filter((j) => j !== "_미상").map((journey) => {
                  const journeyMeta = journeys.find((j) => j.journey === journey);
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
                              onClick={() =>
                                setSelectedCell(
                                  isSelected ? null : { journey, l1 },
                                )
                              }
                              className={`h-16 w-full rounded-md px-2 text-center transition ${heatClass(
                                count,
                                pivot.max,
                                isSelected,
                              )} ${
                                total > 0
                                  ? "cursor-pointer hover:scale-[1.02]"
                                  : "cursor-default"
                              }`}
                            >
                              <div className="text-lg font-semibold tabular-nums">
                                {count}
                              </div>
                              <div className="text-[11px] opacity-70">
                                {pct(count, stats.negative)}
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <HeatmapSelectionPanel
          selectedCell={selectedCell}
          selectedReviews={selectedReviews}
          onClose={() => setSelectedCell(null)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Top 개선 과제
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                부정 빈도 기준으로 정렬했습니다.
              </p>
            </div>
          </div>
          {priorities.map((item, idx) => (
            <PriorityItem
              key={`${item.l1}|${item.l2}`}
              insight={item}
              active={idx === activeRank}
              onSelect={() => setActiveRank(idx)}
            />
          ))}
        </aside>

        <EvidencePanel insight={activeInsight} />
      </section>
    </article>
  );
}
