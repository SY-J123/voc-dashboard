import {
  JOURNEY_STAGES,
  PROBLEM_TYPES_L1,
  type ClassifiedReview,
  type Sentiment,
} from "./types";

export type FilterState = {
  query: string;
  sentiments: Set<Sentiment>;
  ratings: Set<number>;
  minConfidence: number;
};

export const DEFAULT_FILTER: FilterState = {
  query: "",
  sentiments: new Set<Sentiment>(["긍정", "부정", "중립"]),
  ratings: new Set<number>([1, 2, 3, 4, 5]),
  minConfidence: 0,
};

export function applyFilter(
  reviews: ClassifiedReview[],
  filter: FilterState,
): ClassifiedReview[] {
  const q = filter.query.trim().toLowerCase();
  return reviews.filter((r) => {
    if (!filter.sentiments.has(r.sentiment_label)) return false;
    if (!filter.ratings.has(r.rating)) return false;
    if ((r.problem_type_confidence ?? 0) < filter.minConfidence) return false;
    if (q && !r.cleaned_text.toLowerCase().includes(q)) return false;
    return true;
  });
}

export type PivotCounts = Record<string, Record<string, number>>;

export function buildPivot(reviews: ClassifiedReview[]) {
  const neg: PivotCounts = {};
  const pos: PivotCounts = {};
  for (const j of JOURNEY_STAGES) {
    neg[j] = {};
    pos[j] = {};
    for (const l1 of PROBLEM_TYPES_L1) {
      neg[j][l1] = 0;
      pos[j][l1] = 0;
    }
  }
  for (const r of reviews) {
    const journey = (JOURNEY_STAGES as readonly string[]).includes(
      r.journey_stage,
    )
      ? r.journey_stage
      : "_미상";
    const l1 = (PROBLEM_TYPES_L1 as readonly string[]).includes(
      r.problem_type_l1,
    )
      ? r.problem_type_l1
      : "_미분류";
    if (r.sentiment_label === "부정") neg[journey][l1] += 1;
    else if (r.sentiment_label === "긍정") pos[journey][l1] += 1;
  }
  let max = 0;
  for (const j of JOURNEY_STAGES)
    for (const l1 of PROBLEM_TYPES_L1)
      if (neg[j][l1] > max) max = neg[j][l1];
  return { neg, pos, max };
}

export type L2Row = {
  l1: string;
  l2: string;
  neg: number;
  pos: number;
  neutral: number;
  total: number;
};

export function buildL2Ranking(reviews: ClassifiedReview[]): L2Row[] {
  const counts = new Map<string, L2Row>();
  for (const r of reviews) {
    const key = `${r.problem_type_l1}|${r.problem_type_l2}`;
    if (!counts.has(key))
      counts.set(key, {
        l1: r.problem_type_l1,
        l2: r.problem_type_l2,
        neg: 0,
        pos: 0,
        neutral: 0,
        total: 0,
      });
    const slot = counts.get(key)!;
    slot.total += 1;
    if (r.sentiment_label === "부정") slot.neg += 1;
    else if (r.sentiment_label === "긍정") slot.pos += 1;
    else slot.neutral += 1;
  }
  return [...counts.values()].sort((a, b) => b.neg - a.neg);
}

export type Insight = {
  kind: "weakness" | "strength" | "ambiguous";
  headline: string;
  detail: string;
};

export function computeInsights(reviews: ClassifiedReview[]): Insight[] {
  if (reviews.length === 0) return [];
  const insights: Insight[] = [];

  const { neg, pos } = buildPivot(reviews);

  let topWeakness = { journey: "", l1: "", count: 0 };
  let topStrength = { journey: "", l1: "", count: 0 };
  for (const j of JOURNEY_STAGES) {
    for (const l1 of PROBLEM_TYPES_L1) {
      if (l1 === "_미분류") continue;
      if (neg[j][l1] > topWeakness.count)
        topWeakness = { journey: j, l1, count: neg[j][l1] };
      if (l1 !== "긍정" && pos[j][l1] > topStrength.count)
        topStrength = { journey: j, l1, count: pos[j][l1] };
    }
  }

  const total = reviews.length;
  if (topWeakness.count > 0) {
    const pct = ((topWeakness.count / total) * 100).toFixed(1);
    insights.push({
      kind: "weakness",
      headline: `최대 약점: ${topWeakness.journey} × ${topWeakness.l1}`,
      detail: `부정 리뷰 ${topWeakness.count}건 (전체의 ${pct}%) — 최우선 개선 영역`,
    });
  }
  if (topStrength.count > 0) {
    insights.push({
      kind: "strength",
      headline: `최대 강점: ${topStrength.journey} × ${topStrength.l1}`,
      detail: `긍정 리뷰 ${topStrength.count}건 — 강화·확장 가능한 영역`,
    });
  }

  const ambByJourney = new Map<string, number>();
  for (const r of reviews) {
    if (r.problem_type_l1 === "_미분류" || r.needs_review) {
      ambByJourney.set(
        r.journey_stage,
        (ambByJourney.get(r.journey_stage) ?? 0) + 1,
      );
    }
  }
  const sortedAmb = [...ambByJourney.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedAmb.length > 0 && sortedAmb[0][1] >= 5) {
    insights.push({
      kind: "ambiguous",
      headline: `모호 리뷰 집중: ${sortedAmb[0][0]}`,
      detail: `${sortedAmb[0][1]}건 — 정성 인터뷰 또는 분류 체계 보완 후보`,
    });
  }

  return insights;
}

export type ProblemInsight = {
  rank: number;
  l1: string;
  l2: string;
  negCount: number;
  totalCount: number;
  pctOfAll: number;
  topJourneys: { journey: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  topEmotions: { keyword: string; count: number }[];
  representatives: {
    review_id: string;
    text: string;
    rating: number;
    thumbs_up: number;
  }[];
  action: { team: string; suggestion: string };
};

const ACTION_MAP: Record<string, { team: string; suggestion: string }> = {
  "광고·알림 과다": {
    team: "PM · 디자인",
    suggestion: "알림 설정 UI 세분화, 광고 노출 정책·빈도 재검토",
  },
  "기능 오류": {
    team: "엔지니어링 · QA",
    suggestion: "오류 패턴 분류, 회귀 테스트 강화, 에러 추적 보강",
  },
  "화면 혼란/어포던스": {
    team: "디자인 · UX 리서치",
    suggestion: "정보 위계 재설계, 사용자 테스트로 어포던스 검증",
  },
  "성능·안정성": {
    team: "엔지니어링",
    suggestion: "성능 프로파일링, 앱 사이즈·메모리 최적화",
  },
  "업데이트 회귀": {
    team: "QA · 릴리즈",
    suggestion: "릴리즈 전 회귀 테스트 자동화, 점진적 배포 도입",
  },
  "인증 실패": {
    team: "보안 · QA",
    suggestion: "지문/OTP 폴백 플로우 안정화, 실패 케이스 추적",
  },
  "절차·빈도 과다": {
    team: "PM · 보안",
    suggestion: "인증 빈도/단계 정책 재검토, 마찰 측정 도입",
  },
  "안내·메시지 부족": {
    team: "콘텐츠 · 디자인",
    suggestion: "오류 메시지·정책 사전 고지·도움말 카피 보강",
  },
  "수수료·한도": {
    team: "비즈 · PM",
    suggestion: "정책 재검토 또는 사전 고지·근거 설명 강화",
  },
  "CS 불만": {
    team: "CS · UX",
    suggestion: "CS 채널 접근성 개선, 응대 품질 모니터링",
  },
  "피드백 부재": {
    team: "디자인 · 엔지니어링",
    suggestion: "처리·성공·실패 상태 표시 추가, 로딩 인디케이터 보강",
  },
  "만족·칭찬": {
    team: "PM · 마케팅",
    suggestion: "강점 영역 사례 발굴, 마케팅·리포트 활용",
  },
  "_근거부족·다중가설": {
    team: "리서치",
    suggestion: "정성 인터뷰 후보 / 분류 체계 보완 검토",
  },
};

export function extractInsights(
  reviews: ClassifiedReview[],
  topN = 5,
): ProblemInsight[] {
  const negative = reviews.filter((r) => r.sentiment_label === "부정");
  const buckets = new Map<string, ClassifiedReview[]>();
  for (const r of negative) {
    if (r.problem_type_l1 === "_미분류") continue;
    if (r.problem_type_l1 === "긍정") continue;
    const key = `${r.problem_type_l1}|${r.problem_type_l2}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }
  const sorted = [...buckets.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  return sorted.slice(0, topN).map(([key, items], idx) => {
    const [l1, l2] = key.split("|");
    const journeyCount = new Map<string, number>();
    const kwCount = new Map<string, number>();
    const emCount = new Map<string, number>();
    for (const r of items) {
      journeyCount.set(
        r.journey_stage,
        (journeyCount.get(r.journey_stage) ?? 0) + 1,
      );
      for (const k of r.problem_keywords ?? [])
        kwCount.set(k, (kwCount.get(k) ?? 0) + 1);
      for (const k of r.emotion_keywords ?? [])
        emCount.set(k, (emCount.get(k) ?? 0) + 1);
    }
    const topJourneys = [...journeyCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([journey, count]) => ({ journey, count }));
    const topKeywords = [...kwCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([keyword, count]) => ({ keyword, count }));
    const topEmotions = [...emCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));

    const representatives = [...items]
      .sort(
        (a, b) =>
          b.thumbs_up - a.thumbs_up || b.cleaned_text.length - a.cleaned_text.length,
      )
      .slice(0, 3)
      .map((r) => ({
        review_id: r.review_id,
        text: r.cleaned_text,
        rating: r.rating,
        thumbs_up: r.thumbs_up,
      }));

    return {
      rank: idx + 1,
      l1,
      l2,
      negCount: items.length,
      totalCount: reviews.length,
      pctOfAll: (items.length / reviews.length) * 100,
      topJourneys,
      topKeywords,
      topEmotions,
      representatives,
      action: ACTION_MAP[l2] ?? {
        team: "PM",
        suggestion: "추가 분석 후 액션 정의 필요",
      },
    };
  });
}

export type JourneyInsight = {
  rank: number;
  journey: string;
  totalNeg: number;
  totalAll: number;
  topIssue: {
    l1: string;
    l2: string;
    count: number;
    pctOfJourney: number;
    keywords: { keyword: string; count: number }[];
    emotions: { keyword: string; count: number }[];
    action: { team: string; suggestion: string };
  } | null;
  secondaryIssues: { l1: string; l2: string; count: number }[];
};

export function extractJourneyInsights(
  reviews: ClassifiedReview[],
): JourneyInsight[] {
  const byJourneyAll = new Map<string, ClassifiedReview[]>();
  const byJourneyNeg = new Map<string, ClassifiedReview[]>();
  for (const r of reviews) {
    if (!byJourneyAll.has(r.journey_stage))
      byJourneyAll.set(r.journey_stage, []);
    byJourneyAll.get(r.journey_stage)!.push(r);
    if (r.sentiment_label === "부정") {
      if (!byJourneyNeg.has(r.journey_stage))
        byJourneyNeg.set(r.journey_stage, []);
      byJourneyNeg.get(r.journey_stage)!.push(r);
    }
  }

  const sortedJourneys = (JOURNEY_STAGES as readonly string[])
    .map((j) => ({
      journey: j,
      neg: byJourneyNeg.get(j) ?? [],
      all: byJourneyAll.get(j) ?? [],
    }))
    .filter((x) => x.all.length > 0)
    .sort((a, b) => b.neg.length - a.neg.length);

  return sortedJourneys.map((entry, idx) => {
    const issueCounts = new Map<string, ClassifiedReview[]>();
    for (const r of entry.neg) {
      if (r.problem_type_l1 === "_미분류") continue;
      if (r.problem_type_l1 === "긍정") continue;
      const key = `${r.problem_type_l1}|${r.problem_type_l2}`;
      if (!issueCounts.has(key)) issueCounts.set(key, []);
      issueCounts.get(key)!.push(r);
    }
    const sortedIssues = [...issueCounts.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    );

    let topIssue: JourneyInsight["topIssue"] = null;
    if (sortedIssues.length > 0) {
      const [key, items] = sortedIssues[0];
      const [l1, l2] = key.split("|");
      const kwCount = new Map<string, number>();
      const emCount = new Map<string, number>();
      for (const r of items) {
        for (const k of r.problem_keywords ?? [])
          kwCount.set(k, (kwCount.get(k) ?? 0) + 1);
        for (const k of r.emotion_keywords ?? [])
          emCount.set(k, (emCount.get(k) ?? 0) + 1);
      }
      topIssue = {
        l1,
        l2,
        count: items.length,
        pctOfJourney:
          entry.neg.length > 0 ? (items.length / entry.neg.length) * 100 : 0,
        keywords: [...kwCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([keyword, count]) => ({ keyword, count })),
        emotions: [...emCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([keyword, count]) => ({ keyword, count })),
        action: ACTION_MAP[l2] ?? {
          team: "PM",
          suggestion: "추가 분석 후 액션 정의 필요",
        },
      };
    }

    const secondaryIssues = sortedIssues.slice(1, 4).map(([key, items]) => {
      const [l1, l2] = key.split("|");
      return { l1, l2, count: items.length };
    });

    return {
      rank: idx + 1,
      journey: entry.journey,
      totalNeg: entry.neg.length,
      totalAll: entry.all.length,
      topIssue,
      secondaryIssues,
    };
  });
}

export type SentimentRatingCell = {
  rating: number;
  sentiment: Sentiment;
  count: number;
};

export function buildSentimentRating(reviews: ClassifiedReview[]) {
  const grid: SentimentRatingCell[] = [];
  const sentiments: Sentiment[] = ["긍정", "중립", "부정"];
  for (let r = 5; r >= 1; r--) {
    for (const s of sentiments) {
      grid.push({ rating: r, sentiment: s, count: 0 });
    }
  }
  for (const rev of reviews) {
    const cell = grid.find(
      (c) => c.rating === rev.rating && c.sentiment === rev.sentiment_label,
    );
    if (cell) cell.count += 1;
  }
  let agree = 0;
  let disagree = 0;
  for (const rev of reviews) {
    if (rev.rating >= 4 && rev.sentiment_label === "긍정") agree += 1;
    else if (rev.rating <= 2 && rev.sentiment_label === "부정") agree += 1;
    else if (rev.rating >= 4 && rev.sentiment_label === "부정") disagree += 1;
    else if (rev.rating <= 2 && rev.sentiment_label === "긍정") disagree += 1;
  }
  const decisive = agree + disagree;
  const agreementRate = decisive > 0 ? agree / decisive : 0;

  return { grid, agree, disagree, agreementRate, decisive };
}
