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
