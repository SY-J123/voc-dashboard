"use client";

import { useMemo, useState } from "react";

import {
  buildPivot,
  buildSentimentRating,
  extractJourneyInsights,
  type JourneyInsight,
} from "../lib/analytics";
import {
  JOURNEY_STAGES,
  PROBLEM_TYPES_L1,
  type ClassifiedReview,
  type Sentiment,
} from "../lib/types";

type Selected = { journey: string; l1: string } | null;

const REVIEW_MAX_CHARS = 200;

function colorForCount(count: number, max: number, selected: boolean): string {
  const ring = selected ? " ring-2 ring-neutral-900 ring-inset" : "";
  if (count === 0) return "bg-white text-neutral-300" + ring;
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.66) return "bg-red-600 text-white font-semibold" + ring;
  if (ratio > 0.33) return "bg-red-300 text-red-900" + ring;
  return "bg-red-100 text-red-800" + ring;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border border-neutral-200 rounded-md bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}

function KeywordBar({
  keyword,
  count,
  max,
}: {
  keyword: string;
  count: number;
  max: number;
}) {
  const ratio = max > 0 ? count / max : 0;
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <div className="w-20 text-right text-neutral-700 truncate" title={keyword}>
        {keyword}
      </div>
      <div className="flex-1 h-2.5 bg-neutral-100 rounded relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-neutral-900"
          style={{ width: `${Math.max(2, ratio * 100)}%` }}
        />
      </div>
      <div className="w-6 text-right tabular-nums text-neutral-500">{count}</div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

function JourneyDetailView({
  insight,
  bucket,
}: {
  insight: JourneyInsight;
  bucket: ClassifiedReview[];
}) {
  const sortedBucket = useMemo(
    () =>
      [...bucket].sort(
        (a, b) =>
          b.thumbs_up - a.thumbs_up ||
          b.cleaned_text.length - a.cleaned_text.length,
      ),
    [bucket],
  );

  const [randIdx, setRandIdx] = useState<number | null>(null);

  const rep = useMemo(() => {
    if (sortedBucket.length === 0) return null;
    if (randIdx === null) return sortedBucket[0];
    return sortedBucket[randIdx];
  }, [sortedBucket, randIdx]);

  const refresh = () => {
    if (sortedBucket.length <= 1) return;
    let next = randIdx;
    let attempts = 0;
    while ((next === randIdx || (randIdx === null && next === 0)) && attempts < 8) {
      next = Math.floor(Math.random() * sortedBucket.length);
      attempts += 1;
    }
    setRandIdx(next);
  };

  const top = insight.topIssue;
  const maxKw = top?.keywords[0]?.count ?? 1;

  if (!top) {
    return (
      <div className="border border-neutral-200 rounded-lg bg-white p-8 text-center text-sm text-neutral-400">
        {insight.journey} 여정에는 분류된 부정 리뷰가 없습니다.
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
      <div className="bg-neutral-900 text-white px-5 py-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs text-neutral-400 mb-0.5">
            #{insight.rank} 여정
          </div>
          <h3 className="text-xl font-semibold">{insight.journey}</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-400">부정 / 전체</div>
          <div className="text-lg font-semibold tabular-nums">
            {insight.totalNeg}
            <span className="text-neutral-400 font-normal"> / </span>
            {insight.totalAll}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <div className="text-xs text-neutral-500 mb-1">주된 문제</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-semibold text-neutral-900">
              {top.l2}
            </span>
            <span className="text-sm text-neutral-500">{top.l1}</span>
            <span className="text-sm text-neutral-500 tabular-nums">
              · 부정 {top.count}건 (이 여정의 {top.pctOfJourney.toFixed(0)}%)
            </span>
          </div>
        </div>

        {top.keywords.length > 0 && (
          <div>
            <div className="text-xs text-neutral-500 mb-2">
              자주 등장한 문제 키워드
            </div>
            <div className="space-y-1.5">
              {top.keywords.map((k) => (
                <KeywordBar
                  key={k.keyword}
                  keyword={k.keyword}
                  count={k.count}
                  max={maxKw}
                />
              ))}
            </div>
          </div>
        )}

        {top.emotions.length > 0 && (
          <div>
            <div className="text-xs text-neutral-500 mb-1.5">감정 어휘</div>
            <div className="flex flex-wrap gap-1.5">
              {top.emotions.map((e) => (
                <span
                  key={e.keyword}
                  className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700"
                >
                  {e.keyword} <span className="opacity-70">{e.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {insight.secondaryIssues.length > 0 && (
          <div>
            <div className="text-xs text-neutral-500 mb-1.5">
              같이 자주 나타나는 추가 이슈
            </div>
            <div className="flex flex-wrap gap-1.5">
              {insight.secondaryIssues.map((s) => (
                <span
                  key={`${s.l1}|${s.l2}`}
                  className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700"
                >
                  {s.l2}{" "}
                  <span className="text-neutral-500">· {s.count}건</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-neutral-500">대표 리뷰</div>
            {sortedBucket.length > 1 && (
              <button
                type="button"
                onClick={refresh}
                className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
                title="다른 리뷰 무작위로 보기"
              >
                <span aria-hidden>↻</span> 다른 리뷰
              </button>
            )}
          </div>
          {rep && (
            <div className="text-sm border-l-2 border-neutral-300 pl-3 text-neutral-700 leading-relaxed">
              <div className="text-xs text-neutral-400 mb-0.5">
                ★{rep.rating} · 좋아요 {rep.thumbs_up}
              </div>
              {truncate(rep.cleaned_text, REVIEW_MAX_CHARS)}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-neutral-100 flex items-start gap-3">
          <div className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 font-medium whitespace-nowrap">
            {top.action.team}
          </div>
          <div className="text-sm text-neutral-700 leading-snug">
            {top.action.suggestion}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({
  reviews,
}: {
  reviews: ClassifiedReview[];
}) {
  const [selected, setSelected] = useState<Selected>(null);
  const [activeJourney, setActiveJourney] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = reviews.length;
    const counts = { 긍정: 0, 부정: 0, 중립: 0 } as Record<Sentiment, number>;
    let ambiguous = 0;
    for (const r of reviews) {
      counts[r.sentiment_label] += 1;
      if (r.problem_type_l1 === "_미분류" || r.needs_review) ambiguous += 1;
    }
    return { total, ...counts, ambiguous };
  }, [reviews]);

  const insights = useMemo(() => extractJourneyInsights(reviews), [reviews]);
  const pivot = useMemo(() => buildPivot(reviews), [reviews]);
  const sentimentRating = useMemo(
    () => buildSentimentRating(reviews),
    [reviews],
  );

  // 여정 + topIssue (l1, l2) 기준으로 부정 리뷰 버킷 (대표 리뷰 풀)
  const bucketByJourneyKey = useMemo(() => {
    const m = new Map<string, ClassifiedReview[]>();
    for (const r of reviews) {
      if (r.sentiment_label !== "부정") continue;
      const key = `${r.journey_stage}|${r.problem_type_l1}|${r.problem_type_l2}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [reviews]);

  const drilldownReviews = useMemo(() => {
    if (!selected) return [];
    return reviews
      .filter(
        (r) =>
          r.journey_stage === selected.journey &&
          r.problem_type_l1 === selected.l1,
      )
      .sort(
        (a, b) =>
          (b.problem_type_confidence ?? 0) - (a.problem_type_confidence ?? 0),
      );
  }, [reviews, selected]);

  const ambiguous = useMemo(
    () =>
      reviews.filter(
        (r) => r.problem_type_l1 === "_미분류" || r.needs_review,
      ),
    [reviews],
  );

  return (
    <article className="space-y-12">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">분석 결과</h2>
        <p className="text-neutral-600">
          전체 {reviews.length.toLocaleString()}건 분류
        </p>
      </div>

      {insights.length > 0 && (
        <section className="border-l-4 border-neutral-900 pl-4 py-1">
          <div className="text-xs text-neutral-500 mb-1">한 줄 결론</div>
          <p className="text-lg font-medium text-neutral-900 leading-snug">
            가장 큰 마찰: {[0, 1, 2]
              .map((i) => insights[i])
              .filter((x): x is JourneyInsight => Boolean(x?.topIssue))
              .map((ins, idx) => (
                <span key={ins.journey}>
                  {idx > 0 && ", "}
                  <span className="bg-yellow-100 px-1">
                    {ins.journey}
                  </span>
                  의{" "}
                  <span className="font-semibold">{ins.topIssue!.l2}</span>{" "}
                  ({ins.topIssue!.count}건)
                </span>
              ))}
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="분류 리뷰" value={stats.total.toLocaleString()} />
        <StatCard
          label="부정"
          value={stats.부정.toLocaleString()}
          hint={
            stats.total > 0
              ? `${((stats.부정 / stats.total) * 100).toFixed(1)}%`
              : "—"
          }
        />
        <StatCard
          label="긍정"
          value={stats.긍정.toLocaleString()}
          hint={
            stats.total > 0
              ? `${((stats.긍정 / stats.total) * 100).toFixed(1)}%`
              : "—"
          }
        />
        <StatCard
          label="모호 / 검수 필요"
          value={stats.ambiguous.toLocaleString()}
          hint={
            stats.total > 0
              ? `${((stats.ambiguous / stats.total) * 100).toFixed(1)}%`
              : "—"
          }
        />
      </section>

      {/* === 교차 피벗 + 드릴다운 (인사이트 카드보다 먼저) === */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">
            교차 피벗 — 여정 × 문제 타입 (부정 리뷰)
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            셀을 클릭하면 해당 영역의 리뷰가 펼쳐집니다. 색이 진할수록 문제
            집중도 높음.
          </p>
        </div>
        <div className="overflow-x-auto border border-neutral-200 rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-neutral-600">
                  여정 \ L1
                </th>
                {PROBLEM_TYPES_L1.map((l1) => (
                  <th
                    key={l1}
                    className="text-center px-3 py-2 font-medium text-neutral-600"
                  >
                    {l1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JOURNEY_STAGES.map((j) => (
                <tr key={j} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-neutral-700 whitespace-nowrap">
                    {j}
                  </td>
                  {PROBLEM_TYPES_L1.map((l1) => {
                    const neg = pivot.neg[j][l1];
                    const pos = pivot.pos[j][l1];
                    const isSel =
                      selected?.journey === j && selected?.l1 === l1;
                    const total = neg + pos;
                    return (
                      <td
                        key={l1}
                        onClick={() =>
                          total > 0
                            ? setSelected(isSel ? null : { journey: j, l1 })
                            : null
                        }
                        className={`text-center px-3 py-2 ${colorForCount(neg, pivot.max, isSel)} ${total > 0 ? "cursor-pointer" : ""}`}
                      >
                        <span>{neg}</span>
                        {pos > 0 && (
                          <span className="text-xs ml-1 opacity-70">
                            (+{pos})
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="border border-neutral-300 rounded-lg bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500">선택된 영역</div>
                <div className="font-semibold">
                  {selected.journey} × {selected.l1}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  총 {drilldownReviews.length}건 (신뢰도 내림차순)
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-neutral-500 hover:text-neutral-900"
              >
                닫기 ✕
              </button>
            </div>
            <ul className="space-y-2 max-h-[480px] overflow-y-auto">
              {drilldownReviews.slice(0, 30).map((r) => (
                <li
                  key={r.review_id}
                  className="border-l-2 border-neutral-300 pl-3 py-1"
                >
                  <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                    <span>★{r.rating}</span>
                    <span>·</span>
                    <span>{r.problem_type_l2}</span>
                    <span>·</span>
                    <span>conf={r.problem_type_confidence?.toFixed(2)}</span>
                    <span>·</span>
                    <span
                      className={
                        r.sentiment_label === "부정"
                          ? "text-red-600"
                          : r.sentiment_label === "긍정"
                            ? "text-emerald-600"
                            : ""
                      }
                    >
                      {r.sentiment_label}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-800">{r.cleaned_text}</div>
                </li>
              ))}
              {drilldownReviews.length > 30 && (
                <li className="text-xs text-neutral-500 text-center py-2">
                  ... 외 {drilldownReviews.length - 30}건
                </li>
              )}
            </ul>
          </div>
        )}
      </section>

      {/* === 여정별 핵심 이슈 (탭으로 전환) === */}
      <section className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            여정별 핵심 이슈
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            여정 탭을 선택하면 해당 여정의 주된 문제·키워드·대표 리뷰·추천
            액션이 나옵니다. 여정은 부정 리뷰 많은 순.
          </p>
        </div>
        {insights.length === 0 ? (
          <div className="border border-dashed border-neutral-300 rounded-lg p-6 text-center text-sm text-neutral-500">
            부정 리뷰가 없습니다.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 pb-2">
              {insights.map((ins) => {
                const isActive =
                  activeJourney === ins.journey ||
                  (activeJourney === null && ins.rank === 1);
                return (
                  <button
                    key={ins.journey}
                    type="button"
                    onClick={() => setActiveJourney(ins.journey)}
                    className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                      isActive
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <span>{ins.journey}</span>
                    <span
                      className={`ml-2 text-xs tabular-nums ${
                        isActive ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      {ins.totalNeg}
                    </span>
                  </button>
                );
              })}
            </div>
            {(() => {
              const active =
                insights.find((i) => i.journey === activeJourney) ?? insights[0];
              const key = active.topIssue
                ? `${active.journey}|${active.topIssue.l1}|${active.topIssue.l2}`
                : active.journey;
              return (
                <JourneyDetailView
                  insight={active}
                  bucket={bucketByJourneyKey.get(key) ?? []}
                />
              );
            })()}
          </>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">메타 정보</h3>
          <p className="text-sm text-neutral-500 mt-1">
            분류 자체의 신뢰성 검증과 검수 후보군.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-neutral-200 rounded-lg bg-white p-4">
            <div className="text-xs text-neutral-500 mb-1">
              별점-감정 일치율
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {sentimentRating.decisive > 0
                ? `${(sentimentRating.agreementRate * 100).toFixed(1)}%`
                : "—"}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {sentimentRating.agree}/{sentimentRating.decisive} (★1~2↔부정,
              ★4~5↔긍정 케이스만)
            </div>
            <div className="text-xs text-neutral-600 mt-2 leading-relaxed">
              일치율이 낮으면 분류 프롬프트 보완이 필요. 80%↑면 LLM 분류가
              별점과 잘 정합.
            </div>
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white p-4">
            <div className="text-xs text-neutral-500 mb-1">
              모호 리뷰 (검수·인터뷰 후보)
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {ambiguous.length}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              _미분류 또는 신뢰도 0.5 미만
            </div>
            <details className="text-xs mt-2">
              <summary className="cursor-pointer text-neutral-600 hover:text-neutral-900">
                여정별 분포 펼치기
              </summary>
              <ul className="mt-2 space-y-0.5 text-neutral-700">
                {(() => {
                  const m = new Map<string, number>();
                  for (const r of ambiguous)
                    m.set(r.journey_stage, (m.get(r.journey_stage) ?? 0) + 1);
                  return [...m.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([j, c]) => (
                      <li key={j}>
                        {j}: <span className="tabular-nums">{c}</span>
                      </li>
                    ));
                })()}
              </ul>
            </details>
          </div>
        </div>
      </section>
    </article>
  );
}
