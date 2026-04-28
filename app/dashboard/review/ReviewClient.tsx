"use client";

import { useEffect, useMemo, useState } from "react";

import {
  JOURNEY_STAGES,
  L2_BY_L1,
  PROBLEM_TYPES_L1,
  type ClassifiedReview,
  type Sentiment,
} from "../../lib/types";

const STORAGE_KEY = "voc.manualReview.v1";

type Decision = {
  journey: string;
  l1: string;
  l2: string;
  sentiment: Sentiment;
  decidedAt: string;
};

type Decisions = Record<string, Decision>;

const SENTIMENTS: Sentiment[] = ["부정", "중립", "긍정"];

function loadDecisions(): Decisions {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Decisions) : {};
  } catch {
    return {};
  }
}

function saveDecisions(d: Decisions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
}

function ChipGroup({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
  size?: "sm" | "xs";
}) {
  const padding = size === "xs" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`${padding} rounded-md border transition-colors ${
              active
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewClient({
  queue,
}: {
  queue: ClassifiedReview[];
}) {
  const [decisions, setDecisions] = useState<Decisions>({});
  const [activeId, setActiveId] = useState<string>(queue[0]?.review_id ?? "");
  const [draft, setDraft] = useState<{
    journey: string | null;
    l1: string | null;
    l2: string | null;
    sentiment: Sentiment | null;
  }>({ journey: null, l1: null, l2: null, sentiment: null });

  // hydrate localStorage on mount
  useEffect(() => {
    setDecisions(loadDecisions());
  }, []);

  const active = useMemo(
    () => queue.find((r) => r.review_id === activeId) ?? queue[0],
    [queue, activeId],
  );

  // load draft from existing decision OR AI guess on active change
  useEffect(() => {
    if (!active) return;
    const existing = decisions[active.review_id];
    if (existing) {
      setDraft({
        journey: existing.journey,
        l1: existing.l1,
        l2: existing.l2,
        sentiment: existing.sentiment,
      });
    } else {
      setDraft({
        journey: active.journey_stage || null,
        l1:
          active.problem_type_l1 === "_미분류" ? null : active.problem_type_l1,
        l2:
          active.problem_type_l2 === "_근거부족·다중가설"
            ? null
            : active.problem_type_l2,
        sentiment: active.sentiment_label,
      });
    }
  }, [active, decisions]);

  const reviewedCount = Object.keys(decisions).length;
  const total = queue.length;
  const remaining = total - reviewedCount;

  const l2Options = draft.l1 ? L2_BY_L1[draft.l1] ?? [] : [];

  const canSave =
    draft.journey && draft.l1 && draft.l2 && draft.sentiment !== null;

  const goToIndex = (offset: number) => {
    if (!active) return;
    const idx = queue.findIndex((r) => r.review_id === active.review_id);
    const nextIdx = (idx + offset + queue.length) % queue.length;
    setActiveId(queue[nextIdx].review_id);
  };

  const goToNextUnreviewed = (current: Decisions) => {
    if (!active) return;
    const idx = queue.findIndex((r) => r.review_id === active.review_id);
    for (let i = 1; i <= queue.length; i++) {
      const target = queue[(idx + i) % queue.length];
      if (!current[target.review_id]) {
        setActiveId(target.review_id);
        return;
      }
    }
  };

  const save = () => {
    if (!active || !canSave) return;
    const next: Decisions = {
      ...decisions,
      [active.review_id]: {
        journey: draft.journey!,
        l1: draft.l1!,
        l2: draft.l2!,
        sentiment: draft.sentiment!,
        decidedAt: new Date().toISOString(),
      },
    };
    setDecisions(next);
    saveDecisions(next);
    goToNextUnreviewed(next);
  };

  const skip = () => goToIndex(1);

  const reset = () => {
    if (!confirm("저장된 분류 결정을 모두 초기화합니다. 진행하시겠습니까?"))
      return;
    setDecisions({});
    saveDecisions({});
    setActiveId(queue[0]?.review_id ?? "");
  };

  const removeDecision = () => {
    if (!active) return;
    const next = { ...decisions };
    delete next[active.review_id];
    setDecisions(next);
    saveDecisions(next);
  };

  if (!active) return null;

  const isReviewed = !!decisions[active.review_id];
  const journeyOptions = JOURNEY_STAGES.filter((j) => j !== "_미상");
  const l1Options = PROBLEM_TYPES_L1.filter((l) => l !== "_미분류");

  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">수동 분류</h2>
          <p className="mt-1 text-xs text-neutral-500">
            모호 리뷰를 분석가가 직접 검토·분류합니다. 결정은 이 브라우저에만
            저장됩니다 (데모).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs tabular-nums text-neutral-500">
            <span className="font-semibold text-neutral-900">
              {reviewedCount}
            </span>{" "}
            / {total} 검토 ·{" "}
            <span className="font-semibold text-amber-700">{remaining}</span>{" "}
            남음
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-400"
          >
            초기화
          </button>
        </div>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${total > 0 ? (reviewedCount / total) * 100 : 0}%` }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3 text-xs font-medium text-neutral-500">
            큐 ({queue.length})
          </div>
          <div className="max-h-[36rem] overflow-y-auto p-2">
            {queue.map((r) => {
              const reviewed = !!decisions[r.review_id];
              const isActive = r.review_id === active.review_id;
              return (
                <button
                  key={r.review_id}
                  type="button"
                  onClick={() => setActiveId(r.review_id)}
                  className={`mb-1 w-full rounded-md border p-2 text-left transition-colors ${
                    isActive
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-transparent hover:border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        reviewed ? "bg-emerald-500" : "bg-neutral-300"
                      }`}
                    />
                    <span className="font-mono">{r.review_id}</span>
                    <span>·</span>
                    <span>★{r.rating}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-snug text-neutral-700">
                    {r.cleaned_text}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <span className="font-mono">{active.review_id}</span>
                <span>·</span>
                <span>★{active.rating}</span>
                {active.thumbs_up > 0 && (
                  <>
                    <span>·</span>
                    <span>좋아요 {active.thumbs_up}</span>
                  </>
                )}
                <span>·</span>
                <span>신뢰도 {active.problem_type_confidence ?? 0}</span>
                {isReviewed && (
                  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    검토 완료
                  </span>
                )}
              </div>
              <p className="mt-2 text-base leading-relaxed text-neutral-900">
                {active.cleaned_text}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => goToIndex(-1)}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:border-neutral-400"
              >
                ← 이전
              </button>
              <button
                type="button"
                onClick={() => goToIndex(1)}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:border-neutral-400"
              >
                다음 →
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
            <span className="font-medium text-neutral-500">AI 추정 — </span>
            여정: {active.journey_stage || "-"} · 문제:{" "}
            {active.problem_type_l1} / {active.problem_type_l2} · 감정:{" "}
            {active.sentiment_label}
            {active.alternative_hypotheses?.length > 0 && (
              <>
                <br />
                <span className="font-medium text-neutral-500">대안 가설 — </span>
                {active.alternative_hypotheses.join(" / ")}
              </>
            )}
          </div>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="mb-2 text-xs font-medium text-neutral-500">
                여정 단계
              </dt>
              <dd>
                <ChipGroup
                  options={journeyOptions}
                  value={draft.journey}
                  onChange={(v) => setDraft((d) => ({ ...d, journey: v }))}
                />
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-xs font-medium text-neutral-500">
                문제 타입 L1
              </dt>
              <dd>
                <ChipGroup
                  options={l1Options}
                  value={draft.l1}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, l1: v, l2: null }))
                  }
                />
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-xs font-medium text-neutral-500">
                문제 타입 L2
              </dt>
              <dd>
                {l2Options.length === 0 ? (
                  <div className="text-[11px] text-neutral-400">
                    L1을 먼저 선택하세요.
                  </div>
                ) : (
                  <ChipGroup
                    options={l2Options}
                    value={draft.l2}
                    onChange={(v) => setDraft((d) => ({ ...d, l2: v }))}
                    size="xs"
                  />
                )}
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-xs font-medium text-neutral-500">감정</dt>
              <dd>
                <ChipGroup
                  options={SENTIMENTS}
                  value={draft.sentiment}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, sentiment: v as Sentiment }))
                  }
                />
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              저장 후 다음
            </button>
            <button
              type="button"
              onClick={skip}
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400"
            >
              건너뛰기
            </button>
            {isReviewed && (
              <button
                type="button"
                onClick={removeDecision}
                className="ml-auto rounded-md border border-red-200 bg-white px-3 py-2 text-xs text-red-600 hover:border-red-400"
              >
                이 리뷰 결정 삭제
              </button>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}
