import {
  JOURNEY_STAGES,
  PROBLEM_TYPES_L1,
  type ClassifiedReview,
  type Sentiment,
} from "./types";

const L2_BY_L1: Record<string, string[]> = {
  "UI·안내": ["화면 혼란/어포던스", "피드백 부재", "안내·메시지 부족"],
  "기능·성능": ["기능 오류", "성능·안정성", "업데이트 회귀"],
  "인증·보안": ["인증 실패", "절차·빈도 과다"],
  "정책·CS": ["광고·알림 과다", "수수료·한도", "CS 불만"],
  긍정: ["만족·칭찬"],
  _미분류: ["_근거부족·다중가설"],
};

const SAMPLE_TEXTS: Record<string, string[]> = {
  "화면 혼란/어포던스": [
    "버튼이 어디 있는지 모르겠어요",
    "메뉴 구조가 너무 복잡해요",
    "어디를 눌러야 할지 헷갈립니다",
  ],
  "피드백 부재": [
    "송금 누르고 아무 반응이 없어요",
    "결제 됐는지 안 됐는지 모르겠음",
    "로딩만 뜨고 끝이 안 나요",
  ],
  "안내·메시지 부족": [
    "에러 메시지가 무슨 뜻인지 모르겠어요",
    "왜 거절됐는지 설명이 없어요",
    "안내 문구가 부족합니다",
  ],
  "기능 오류": [
    "앱이 자꾸 튕겨요",
    "로그인이 안 됩니다",
    "송금 시 오류 발생",
    "결제 버튼이 안 눌려요",
  ],
  "성능·안정성": [
    "앱이 너무 느려요",
    "실행하면 한참 기다려야 해요",
    "버벅거림이 심합니다",
  ],
  "업데이트 회귀": [
    "업데이트 후 더 이상해졌어요",
    "전 버전이 더 나았는데",
    "최근 업데이트 후 오류 잦음",
  ],
  "인증 실패": [
    "지문 인증이 자꾸 실패해요",
    "OTP가 안 와요",
    "인증번호 입력해도 계속 오류",
  ],
  "절차·빈도 과다": [
    "왜 이렇게 자주 인증을 요구하나요",
    "단계가 너무 많아요",
    "매번 본인확인 짜증나요",
  ],
  "광고·알림 과다": [
    "광고 알림이 너무 많이 와요",
    "푸시가 하루에 수십 번",
    "광고 좀 그만 보내주세요",
  ],
  "수수료·한도": [
    "수수료가 너무 비싸요",
    "한도가 왜 이렇게 낮나요",
    "수수료 정책이 불투명해요",
  ],
  "CS 불만": [
    "고객센터 연결이 안 돼요",
    "문의 답변이 너무 늦어요",
    "상담사 응대가 별로",
  ],
  "만족·칭찬": [
    "송금 진짜 빨라요 최고",
    "디자인 깔끔하고 편해요",
    "토스 덕분에 편하게 씁니다",
    "UI가 직관적이라 좋아요",
  ],
  "_근거부족·다중가설": [
    "그냥 별로예요",
    "이상함",
    "안 돼요",
    "별로",
  ],
};

const PROBLEM_KEYWORDS: Record<string, string[]> = {
  "화면 혼란/어포던스": ["메뉴", "버튼", "구조"],
  "피드백 부재": ["반응", "로딩", "상태"],
  "안내·메시지 부족": ["에러", "안내", "메시지"],
  "기능 오류": ["오류", "튕김", "안됨"],
  "성능·안정성": ["느림", "버벅", "지연"],
  "업데이트 회귀": ["업데이트", "이전", "회귀"],
  "인증 실패": ["지문", "OTP", "인증"],
  "절차·빈도 과다": ["인증", "단계", "본인확인"],
  "광고·알림 과다": ["광고", "푸시", "알림"],
  "수수료·한도": ["수수료", "한도", "비용"],
  "CS 불만": ["상담", "문의", "고객센터"],
  "만족·칭찬": ["빠름", "편함", "만족"],
  "_근거부족·다중가설": [],
};

const EMOTION_BY_SENTIMENT: Record<Sentiment, string[]> = {
  긍정: ["만족", "좋음", "최고"],
  부정: ["짜증", "불편", "화남"],
  중립: [],
};

// L1 × Sentiment 분포 가중치 (대략적인 현실 분포)
const L1_WEIGHTS: { l1: string; weight: number }[] = [
  { l1: "기능·성능", weight: 28 },
  { l1: "UI·안내", weight: 22 },
  { l1: "정책·CS", weight: 18 },
  { l1: "인증·보안", weight: 12 },
  { l1: "긍정", weight: 12 },
  { l1: "_미분류", weight: 8 },
];

const JOURNEY_WEIGHTS: { journey: string; weight: number }[] = [
  { journey: "송금·이체", weight: 22 },
  { journey: "결제", weight: 18 },
  { journey: "가입·로그인", weight: 16 },
  { journey: "앱 전반·CS", weight: 16 },
  { journey: "금융상품", weight: 12 },
  { journey: "프로모션·이벤트", weight: 10 },
  { journey: "_미상", weight: 6 },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rng: () => number, items: { weight: number }[] & T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickSentiment(rng: () => number, l1: string): Sentiment {
  if (l1 === "긍정") return "긍정";
  if (l1 === "_미분류") return rng() < 0.5 ? "부정" : "중립";
  // 일반 문제 카테고리: 부정 우세, 약간의 중립/긍정
  const r = rng();
  if (r < 0.78) return "부정";
  if (r < 0.92) return "중립";
  return "긍정";
}

function pickRating(rng: () => number, sentiment: Sentiment): number {
  if (sentiment === "긍정") return rng() < 0.7 ? 5 : 4;
  if (sentiment === "부정") {
    const r = rng();
    if (r < 0.55) return 1;
    if (r < 0.85) return 2;
    return 3;
  }
  return rng() < 0.5 ? 3 : 4;
}

function dateNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function generateMockReviews(count = 220): ClassifiedReview[] {
  const rng = mulberry32(42);
  const reviews: ClassifiedReview[] = [];

  for (let i = 0; i < count; i++) {
    const l1Pick = pickWeighted(rng, L1_WEIGHTS as never) as { l1: string };
    const l1 = l1Pick.l1;
    const l2 = pick(rng, L2_BY_L1[l1]);
    const journeyPick =
      l1 === "_미분류"
        ? { journey: rng() < 0.5 ? "_미상" : pick(rng, JOURNEY_STAGES) }
        : (pickWeighted(rng, JOURNEY_WEIGHTS as never) as { journey: string });
    const journey = journeyPick.journey;
    const sentiment = pickSentiment(rng, l1);
    const rating = pickRating(rng, sentiment);

    const text = pick(rng, SAMPLE_TEXTS[l2] ?? ["리뷰 내용"]);
    const confidence =
      l1 === "_미분류"
        ? 0.2 + rng() * 0.25
        : 0.55 + rng() * 0.4;
    const journeyConfidence =
      journey === "_미상" ? 0.2 + rng() * 0.3 : 0.5 + rng() * 0.45;
    const needsReview = confidence < 0.5 || l1 === "_미분류";
    const thumbsUp =
      rng() < 0.7 ? 0 : Math.floor(rng() * (sentiment === "부정" ? 40 : 12));

    reviews.push({
      review_id: `mock_${String(i + 1).padStart(4, "0")}`,
      app_name: "토스",
      platform: "google_play",
      review_date: dateNDaysAgo(Math.floor(rng() * 90)),
      rating,
      original_text: text,
      cleaned_text: text,
      char_count: text.length,
      passed_filter: true,
      filter_reason: null,
      is_duplicate: false,
      duplicate_of: null,
      app_version: rng() < 0.6 ? `5.${Math.floor(rng() * 30)}.0` : null,
      thumbs_up: thumbsUp,
      reply_content: null,
      user_name: null,

      journey_stage: journey,
      journey_confidence: Number(journeyConfidence.toFixed(2)),
      journey_evidence: null,
      problem_type_l1: l1,
      problem_type_l2: l2,
      problem_type_confidence: Number(confidence.toFixed(2)),
      alternative_hypotheses: [],
      sentiment_label: sentiment,
      sentiment_score:
        sentiment === "긍정"
          ? 0.6 + rng() * 0.4
          : sentiment === "부정"
          ? -(0.6 + rng() * 0.4)
          : (rng() - 0.5) * 0.3,
      emotion_keywords: EMOTION_BY_SENTIMENT[sentiment].slice(
        0,
        Math.floor(rng() * 3),
      ),
      problem_keywords: (PROBLEM_KEYWORDS[l2] ?? []).slice(
        0,
        Math.floor(rng() * 3) + 1,
      ),
      needs_review: needsReview,
      reviewed_by_human: false,
    });
  }

  return reviews;
}
