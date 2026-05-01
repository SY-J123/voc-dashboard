export type Sentiment = "긍정" | "부정" | "중립";

export type ClassifiedReview = {
  review_id: string;
  app_name: string;
  platform: string;
  review_date: string;
  rating: number;
  original_text: string;
  cleaned_text: string;
  char_count: number;
  passed_filter: boolean;
  filter_reason: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  app_version: string | null;
  thumbs_up: number;
  reply_content: string | null;
  user_name: string | null;

  journey_stage: string;
  journey_confidence: number | null;
  journey_evidence: string | null;
  problem_type_l1: string;
  problem_type_l2: string;
  problem_type_confidence: number | null;
  alternative_hypotheses: string[];
  sentiment_label: Sentiment;
  sentiment_score: number | null;
  emotion_keywords: string[];
  problem_keywords: string[];
  needs_review: boolean;
  reviewed_by_human: boolean;
};

export const JOURNEY_STAGES = [
  "가입·로그인",
  "송금·이체",
  "결제",
  "금융상품",
  "프로모션·이벤트",
  "앱 전반·CS",
  "_미상",
] as const;

export const PROBLEM_TYPES_L1 = [
  "UI·안내",
  "기능·성능",
  "인증·보안",
  "정책·CS",
  "긍정",
  "_미분류",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];
export type ProblemTypeL1 = (typeof PROBLEM_TYPES_L1)[number];

export const L2_BY_L1: Record<string, string[]> = {
  "UI·안내": ["화면 혼란/어포던스", "피드백 부재", "안내·메시지 부족"],
  "기능·성능": ["기능 오류", "성능·안정성", "업데이트 회귀"],
  "인증·보안": ["인증 실패", "절차·빈도 과다"],
  "정책·CS": ["광고·알림 과다", "수수료·한도", "CS 불만", "기능 요청", "기능 제약"],
  긍정: ["만족·칭찬"],
  _미분류: ["_근거부족·다중가설"],
};
