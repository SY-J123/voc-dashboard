import Link from "next/link";

import MermaidDiagram from "./components/MermaidDiagram";
import { loadClassifiedReviews } from "./lib/data";

const ANALYSIS_FLOW = `%%{init: {"flowchart": {"htmlLabels": true, "useMaxWidth": true, "curve": "basis", "padding": 4, "nodeSpacing": 25, "rankSpacing": 30}, "themeVariables": {"fontSize": "12px"}}}%%
flowchart TD
    A["1. 분류 기준 수립<br/>가이드라인 .md + JSON Schema"] --> B["2. 리뷰 수집·전처리<br/>욕설·중복·길이 필터"]
    B --> C["3. 검증 표본 추출<br/>층화 100 + 불확실 50 = 150건"]
    C --> D["4. 3-way LLM 라벨링<br/>Sonnet 4.6 · Haiku 4.5 · GPT-5.4 mini"]
    D --> E["5. 불일치 항목 수동 라벨링"]
    E --> G["6. Haiku 평가<br/>정확도 · 혼동행렬 · calibration"]
    G --> H{"7. 합격선?"}
    H -- "미달" --> I["8. LLM이 가이드라인 수정안<br/>사람 검수 → Haiku 재분류 (최대 4라운드)"]
    I --> G
    H -- "도달" --> J["9. 전체 데이터 재분류"]
    J --> K{"10. 신뢰도 분기"}
    K -- "≥ 0.5" --> L["본 분석<br/>차원별 집계·우선순위"]
    K -- "< 0.5" --> M["_미분류<br/>사람 검토"]
    L --> N["11. 대시보드"]
    M --> N
    classDef step fill:#fff,stroke:#d4d4d4,color:#171717
    classDef branch fill:#fafafa,stroke:#a3a3a3,color:#171717
    classDef good fill:#ecfdf5,stroke:#a7f3d0,color:#065f46
    classDef warn fill:#fffbeb,stroke:#fde68a,color:#92400e
    classDef loop fill:#eff6ff,stroke:#bfdbfe,color:#1e40af
    class A,B,C,D,E,G,J,N step
    class H,K branch
    class L good
    class M warn
    class I loop
`;

const journeyStages = [
  { name: "가입·로그인", desc: "회원가입, 로그인, 재로그인" },
  { name: "송금·이체", desc: "계좌 송금, 토스페이 송금" },
  { name: "결제", desc: "토스페이 결제, 가맹점 결제" },
  { name: "금융상품", desc: "계좌·카드·대출·투자·보험" },
  { name: "프로모션·이벤트", desc: "키우기, 뽑기, 만보기, 행운퀴즈 등" },
  { name: "앱 전반·CS", desc: "홈, 설정, 알림, 고객센터" },
  { name: "_미상", desc: "어느 단계인지 단서가 없는 경우" },
];

const problemTypes: {
  l1: string;
  l2: { name: string; examples: string[] }[];
  meaning: string;
}[] = [
  {
    l1: "UI·안내",
    l2: [
      {
        name: "화면 혼란/어포던스",
        examples: [
          "버튼이 어디 있는지 모르겠어요",
          "메뉴 구조가 너무 복잡해요",
        ],
      },
      {
        name: "피드백 부재",
        examples: [
          "송금 누르고 아무 반응이 없어요",
          "결제가 됐는지 안 됐는지 모르겠어요",
        ],
      },
      {
        name: "안내·메시지 부족",
        examples: [
          "에러 메시지가 무슨 뜻인지 모르겠어요",
          "왜 거절됐는지 설명이 없어요",
        ],
      },
    ],
    meaning: "보면 알 수 있어야 할 것이 보이지 않거나 헷갈리는 경우",
  },
  {
    l1: "기능·성능",
    l2: [
      {
        name: "기능 오류",
        examples: ["로그인이 안 됩니다", "송금 시 오류가 발생합니다"],
      },
      {
        name: "성능·안정성",
        examples: ["앱이 너무 느려요", "앱이 자꾸 튕겨요"],
      },
      {
        name: "업데이트 회귀",
        examples: [
          "업데이트 후 송금이 안 돼요",
          "업데이트 이후 화면이 깨져 보여요",
        ],
      },
    ],
    meaning: "동작이 되지 않거나, 느리거나, 앱이 꺼지는 경우",
  },
  {
    l1: "인증·보안",
    l2: [
      {
        name: "인증 실패",
        examples: ["지문 인증이 자꾸 실패해요", "OTP 인증이 진행되지 않아요"],
      },
      {
        name: "절차·빈도 과다",
        examples: [
          "인증을 매번 받아야 해서 번거로워요",
          "본인 인증 단계가 너무 많아요",
        ],
      },
    ],
    meaning: "보안 절차가 사용성을 해치는 경우",
  },
  {
    l1: "정책·CS",
    l2: [
      {
        name: "광고·알림 과다",
        examples: [
          "광고 알림이 너무 많이 와요",
          "푸시 알림을 꺼도 계속 옵니다",
        ],
      },
      {
        name: "수수료·한도",
        examples: ["수수료가 너무 비쌉니다", "송금 한도가 너무 낮아요"],
      },
      {
        name: "CS 불만",
        examples: ["고객센터에 연락이 안 돼요", "상담사 응대가 미흡합니다"],
      },
      {
        name: "기능 요청",
        examples: [
          "토스증권 전용 앱 만들어주세요",
          "주식창에 메모 기능 넣어주세요",
        ],
      },
      {
        name: "기능 제약",
        examples: [
          "충전이 천원 단위로만 됩니다",
          "모바일 신분증으로는 인증이 안 되네요",
        ],
      },
    ],
    meaning: "정책 결정에 대한 불만·요구",
  },
  {
    l1: "긍정",
    l2: [
      {
        name: "만족·칭찬",
        examples: ["정말 편리하고 좋아요", "디자인이 깔끔해서 마음에 듭니다"],
      },
    ],
    meaning: "구체적인 단서 없이 표현된 일반적인 칭찬",
  },
  {
    l1: "_미분류",
    l2: [
      {
        name: "_근거부족·다중가설",
        examples: ["안 돼요", "이상해요"],
      },
    ],
    meaning: "단서가 부족하거나 가설이 여러 갈래라 분류를 보류한 경우",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="text-sm text-black leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const reviews = await loadClassifiedReviews();
  const dates = reviews
    .map((r) => r.review_date.slice(0, 10))
    .sort();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const monthsSpan =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
    (1000 * 60 * 60 * 24 * 30.44);
  const totalCount = reviews.length;
  const needsReview = reviews.filter((r) => r.needs_review).length;
  const autoClassified = totalCount - needsReview;
  const reviewPct = ((needsReview / totalCount) * 100).toFixed(1);
  const fmt = (n: number) => n.toLocaleString("ko-KR");

  const dataSummary: { label: string; value: React.ReactNode }[] = [
    { label: "출처", value: "Google Play 스토어 토스 앱 리뷰" },
    {
      label: "수집 기간",
      value: `${startDate} ~ ${endDate} (약 ${monthsSpan.toFixed(1)}개월)`,
    },
    { label: "수집 건수", value: `${fmt(totalCount)}건` },
    {
      label: "자동 분류 / 미분류",
      value: `${fmt(autoClassified)}건 / ${fmt(needsReview)}건 (검수 대기 ${reviewPct}%)`,
    },
  ];

  return (
    <article className="mx-auto max-w-4xl space-y-10 break-keep">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          프로젝트 소개
        </h2>
      </div>

      <Section title="목적">
        <ol className="list-decimal pl-5 space-y-2">
          <li>모델의 분류 정확도를 향상시킨다.</li>
          <li>분류된 데이터를 대시보드로 제공한다.</li>
        </ol>
      </Section>

      <Section title="개요">
        <h3 className="text-base font-semibold text-black">문제 정의</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            키워드나 메타데이터(별점 등) 기반 분석은 리뷰의 문맥을 반영하지
            못해 결과의 정확도가 떨어집니다. 반면 분석자가 직접 읽고 분류하는
            방식은 소요 시간이 길고, 분류자에 따라 기준이 일관되지 않을 수
            있습니다.
          </li>
          <li>
            문제를 정확히 진단하려면 세분화된 분류 기준이 필요합니다. 동일한
            UX 문제처럼 보여도 &quot;버튼을 잘못 누른다&quot;는 어포던스나 접근성
            영역의 문제이며, &quot;위치를 찾기 어렵다&quot;는 정보 구조 영역의
            문제입니다. 두 사례는 서로 다른 범주로 구분되어야 정확한 원인 파악
            및 개선 방향 도출이 가능합니다.
          </li>
        </ol>

        <h3 className="text-base font-semibold text-black pt-2">해결 방안</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            발표된 논문에 따르면 LLM 자동 분류 역시 실무에서 신뢰할 만한
            정확도를 확보할 수 있습니다.
            <sup>
              <a href="#fn-1" className="text-blue-600 hover:underline ml-0.5">
                1)
              </a>
            </sup>{" "}
            이에 본 프로젝트는 AI 자동 분류 방식을 채택합니다. 분류와 함께
            신뢰도 값을 산출하여, 신뢰도가 낮은 리뷰는 강제로 분류하지 않고
            미분류 상태로 남겨두어 담당자가 직접 검토·레이블링할 수 있도록
            합니다.
          </li>
          <li>
            분류 기준은 UX 리서치 논문
            <sup>
              <a href="#fn-2" className="text-blue-600 hover:underline ml-0.5">
                2)
              </a>
            </sup>
            을 참고하여 <strong>여정 / 문제 타입(L1·L2) / 감정</strong> 세
            축으로 구성했습니다.
          </li>
        </ol>
        <p>
          두 요소를 결합함으로써, 별도의 수기 검수 없이도 일관된 기준 위에서
          분류된 결과를 확보할 수 있으며, 이를 토대로 어느 영역의 어떤 문제가
          가장 시급한지를 비교·평가할 수 있습니다.
        </p>

        <h3 className="text-base font-semibold text-black pt-2">분석 흐름</h3>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <MermaidDiagram chart={ANALYSIS_FLOW} />
        </div>
      </Section>

      <Section title="데이터 소개">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <tbody>
              {dataSummary.map((row) => (
                <tr key={row.label}>
                  <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-medium align-top w-44">
                    {row.label}
                  </th>
                  <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="분석 기준">
        <p>각 리뷰를 다음 세 가지 기준으로 동시에 분류합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>어디서 발생한 문제인가 (여정 단계)</li>
          <li>어떤 종류의 문제인가 (문제 타입)</li>
          <li>사용자가 어떻게 느꼈는가 (감정)</li>
        </ul>
        <p>
          위 세 가지 기준은 토스 앱에 맞게 재구성했습니다.
        </p>

        <h3 className="text-base font-semibold text-black pt-2">
          기준 A — 여정 단계 (7개)
        </h3>
        <p className="text-black">
          사용자 여정 중 어느 단계에서 발생한 문제인지 보여줍니다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-40">
                  단계
                </th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">
                  설명
                </th>
              </tr>
            </thead>
            <tbody>
              {journeyStages.map((s) => (
                <tr key={s.name}>
                  <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                    {s.name}
                  </td>
                  <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                    {s.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-black pt-2">
          기준 B — 문제 타입 (L1 6개 / L2 14개)
        </h3>
        <p className="text-black">
          어떤 종류의 문제인지 보여줍니다. L1은 요약 단위이며, L2는 액션
          단위입니다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-32">
                  L1
                </th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-64">
                  의미
                </th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-44">
                  L2
                </th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">
                  예시 리뷰
                </th>
              </tr>
            </thead>
            <tbody>
              {problemTypes.map((p) =>
                p.l2.map((l2, idx) => (
                  <tr key={`${p.l1}-${l2.name}`}>
                    {idx === 0 && (
                      <>
                        <td
                          rowSpan={p.l2.length}
                          className="border border-neutral-200 px-3 py-2 font-semibold align-top"
                        >
                          {p.l1}
                        </td>
                        <td
                          rowSpan={p.l2.length}
                          className="border border-neutral-200 px-3 py-2 text-black align-top"
                        >
                          {p.meaning}
                        </td>
                      </>
                    )}
                    <td className="border border-neutral-200 px-3 py-2 align-top">
                      {l2.name}
                    </td>
                    <td className="border border-neutral-200 px-3 py-2 text-black align-top italic">
                      <ul className="list-disc pl-4 space-y-0.5 not-italic">
                        {l2.examples.map((ex) => (
                          <li key={ex} className="italic">
                            &ldquo;{ex}&rdquo;
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-black pt-2">
          기준 C — 감정 (3개)
        </h3>
        <p className="text-black">
          사용자가 어떻게 느꼈는지 보여줍니다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-32">
                  감정
                </th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">
                  설명
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  긍정
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  만족·칭찬이 드러나는 표현
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  부정
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  불만·문제가 드러나는 표현
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  중립
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  사실 진술이나 단순 의견
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="분석 방법">
        <h3 className="text-base font-semibold text-black">사용 모델</h3>
        <p>
          실제 분류 작업에는 Anthropic의 <strong>Claude Haiku 4.5</strong>를
          사용합니다. 비용과 분류 품질의 균형을 고려해 선정했습니다. 다만
          가이드라인 품질을 검증하는 단계에서는{" "}
          <strong>Claude Sonnet 4.6</strong>과 <strong>GPT-5.4 mini</strong>
          를 추가로 호출해, 서로 다른 회사의 모델 세 개가 합의한 라벨을 정답으로
          사용합니다.
        </p>

        <h3 className="text-base font-semibold text-black pt-2">전처리</h3>
        <p>수집한 리뷰는 분류 전에 다음 항목을 기준으로 정제합니다.</p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-32">
                  항목
                </th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">
                  처리 내용
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  욕설·비방
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  분석 가치가 낮고 통계를 흐릴 수 있어 제외합니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  중복
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  동일한 내용이 반복되는 리뷰는 한 건만 남깁니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  길이
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  단서가 부족할 정도로 짧은 리뷰는 제외합니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  언어
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  한국어가 아닌 리뷰는 제외합니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-black pt-2">분류 가이드라인</h3>
        <p>
          AI 분류의 정확도는 모델 성능보다 *어떤 지시를 주는가*에 더 크게
          좌우됩니다. 본 프로젝트에서는 다음 장치들을 누적 적용해 분류 결과의
          신뢰도를 끌어올렸습니다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-44">
                  장치
                </th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">
                  목적과 효과
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  카테고리 정의서
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  L1·L2 각각의 의미, 포함 예시 5~6개, 제외 예시, 경계 사례를
                  함께 제공해 카테고리 간 혼동을 줄였습니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  분류 근거 동반 출력
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  단순 라벨이 아니라 분류의 근거가 된 리뷰 표현을 함께 출력하도록
                  지시해, 추후 사람이 검토할 때 판단 근거를 빠르게 확인할 수
                  있습니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  출력 포맷 고정
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  Anthropic Structured Outputs(JSON Schema 강제) 기능을 사용해
                  신뢰도 점수(0~1)와 대안 가설을 정해진 형식으로만 출력하도록
                  묶었습니다. 디코딩 단계에서 양식 위반 토큰을 차단하므로 파싱
                  실패가 원천 제거되며, 후속 집계·검증을 자동화할 수 있습니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  신뢰도 임계값
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  0.5 미만은 강제 분류 대신 미분류로 표시하도록 명시. 통계
                  오염을 막고 사람의 검토 대상을 명확히 분리합니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  생성 다양성 통제
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  Temperature를 낮게 설정해 같은 리뷰에 대한 분류 결과가 흔들리지
                  않도록 했습니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  도메인 컨텍스트 명시
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  토스 앱·금융 서비스라는 전제와 한국어 리뷰의 톤을 시스템
                  프롬프트에 못박아, 일반적 해석으로 빠지지 않도록 했습니다.
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">
                  반복 개선 루프
                </td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">
                  오분류 사례를 모아 정의서와 예시를 보강하고, 자주 헷갈리는
                  카테고리 페어는 별도 가이드라인을 추가했습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-black pt-2">
          정확도 검증 (반복 개선 루프)
        </h3>
        <p>
          분류 가이드라인이 충분히 좋은지 확인하려면 정답과 비교해야 합니다.
          사람이 전수 라벨링하는 비용을 줄이기 위해, 서로 다른 회사의 LLM 세
          개가 합의한 결과를 정답으로 사용하고, 합의가 불일치한 케이스만
          사람이 수동 라벨링하는 방식을 채택했습니다.
          <sup>
            <a href="#fn-3" className="text-blue-600 hover:underline ml-0.5">
              3)
            </a>
          </sup>
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <strong>가이드라인 정비</strong> — 기존 분류 기준에 각 예시별
            &quot;왜 이 라벨인가&quot; 한 줄 주석과 Structured Outputs용 JSON
            Schema를 추가합니다.
          </li>
          <li>
            <strong>표본 추출</strong> — 층화 100건과 불확실성(신뢰도 0.6 미만
            또는 검수 대기) 50건을 합쳐 총 150건을 검증용으로 추출합니다.
          </li>
          <li>
            <strong>3-way 자동 라벨링</strong> — Claude Sonnet 4.6, Claude
            Haiku 4.5, GPT-5.4 mini 세 모델이 동일 표본을 각자 분류합니다.
          </li>
          <li>
            <strong>합의 자동 채택 / 불일치 수동 라벨링</strong> — 세 모델이
            모두 같은 라벨을 낸 경우는 정답으로 자동 채택하고, 한 모델이라도
            다르게 분류한 케이스만 사람이 수동 라벨링합니다.
          </li>
          <li>
            <strong>평가</strong> — Haiku 결과를 정확도·혼동행렬·calibration으로
            평가합니다.
          </li>
          <li>
            <strong>반복 개선 루프</strong> — 합격선 미달 시 LLM이 혼동행렬을
            입력으로 받아 가이드라인 수정안을 직접 작성하고, 사람 검수 후 동일
            표본을 재분류합니다. 최대 4라운드까지 반복합니다.
            <sup>
              <a href="#fn-4" className="text-blue-600 hover:underline ml-0.5">
                4)
              </a>
            </sup>
          </li>
          <li>
            <strong>전체 재분류</strong> — 확정 가이드라인으로 전체 데이터를
            다시 분류해 대시보드에 반영합니다.
          </li>
        </ol>
        <p className="pt-2">
          <strong>종료 조건</strong>은 셋 중 하나입니다 — 합격선 도달 (L1
          정확도 85% · L2 70% · 감정 90% · 여정 85%), 라운드 4 도달, 또는
          macro-F1 변동이 1pp 미만으로 2회 연속 유지.
        </p>

        <h3 className="text-base font-semibold text-black pt-2">
          실제 검증 진행 결과
        </h3>
        <p>
          본 프로젝트에서 4라운드를 실제로 수행한 결과입니다. 자동 가이드라인
          미세조정의 한계와, 사람의 분류 체계 재설계가 정확도 돌파에 결정적이었던
          과정을 그대로 기록합니다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-32">라운드</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">변경 내용</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium w-28">합격 차원</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">결과</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">r0 (원본)</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">초기 가이드라인 — 6 L1 / 12 L2</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">3/4</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">L1만 5.7%p 미달, 다른 차원은 합격</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">r1, r2</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">Sonnet이 혼동행렬을 보고 작성한 가이드라인 수정안 자동 반영 (신뢰도 임계값 상향, 경계 케이스 보강 등)</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">1/4</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">회귀 — 미세조정만으로는 한계 못 넘음. 한 차원 잡으면 다른 차원이 깎임.</td>
              </tr>
              <tr className="bg-emerald-50">
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">r3 (분류 체계 확장)</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">사람이 수동 라벨링 도중 표본의 13.3%가 기존 체계에 안 맞음을 발견 (기능 추가 요청, 비-금전적 기능 정책 제약 등). <strong>정책·CS</strong> 산하에 신규 L2 두 개 추가 — <strong>기능 요청</strong>, <strong>기능 제약</strong></td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top font-semibold">4/4 ★</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">편향 보정 후 평가에서 합격선 통과. 모델 간 만장일치 비율 16% → 33%로 두 배.</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">r4</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">r3에서 발견된 &quot;기능 요청 과사용&quot; 잡는 함정 패턴 5종 추가</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">—</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">함정 패턴 효과 없어 r3 상태로 부분 롤백.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-black pt-2">
          Ground Truth 편향 보정
        </h3>
        <p>
          초기 ground_truth는 r0 시기 모델 합의 + 사람 수동 라벨로 구축했는데,
          신규 카테고리(기능 요청·기능 제약)를 모르던 시점이라 r3 평가 결과가
          편향됐습니다. r3 모델 두 개(Sonnet 4.6, GPT-5.4 mini)의 독립 합의 71건을
          참조 정답으로 사용해 Haiku 4.5를 재평가하면 다음과 같습니다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">차원</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">목표</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">편향 GT</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">편향 보정 후</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 align-top">여정</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">≥85%</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">87.3% ✓</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top font-semibold">90.1% ✓</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 align-top">문제 타입 L1</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">≥85%</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">75.3% ✗</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top font-semibold">85.9% ✓</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 align-top">문제 타입 L2</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">≥70%</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">69.3% ✗</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top font-semibold">81.7% ✓</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 align-top">감정</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">≥90%</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">90.0% ✓</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top font-semibold">93.0% ✓</td>
              </tr>
              <tr className="bg-neutral-50">
                <td className="border border-neutral-200 px-3 py-2 align-top font-medium">합격</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">4</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top">2/4</td>
                <td className="border border-neutral-200 px-3 py-2 text-black align-top font-bold">4/4</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-600 pt-1">
          예: &quot;홈화면 설정에 토스페이좀 추가해주세요&quot; — 편향 GT는 옛 스키마
          기준 &quot;UI·안내 / 안내·메시지 부족&quot;으로 라벨됐지만, r3 모델 둘은
          정확히 &quot;정책·CS / 기능 요청&quot;으로 잡음. 이런 케이스 13건이
          편향의 정체.
        </p>

        <h3 className="text-base font-semibold text-black pt-2">
          LLM 기반 노이즈 필터
        </h3>
        <p>
          키워드 기반 욕설·중복·길이 필터로는 잡히지 않는 의미 없는 리뷰
          (농담·조롱·단서 없는 일반 불만 등)는 분류 단계에서 _미분류로 빠지며
          신호를 흐립니다. 키워드 필터 통과 후 추가로 LLM에 &quot;이 리뷰가 UX
          분석에 사용 가치가 있는가?&quot;를 물어 노이즈를 사전에 분리합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>검증 표본 150건 기준: Precision 71% · Recall 67% · Accuracy 88%</li>
          <li>오탐 8건 중 다수는 토스와 무관한 리뷰(예: &quot;사장님이 친절하시고 빵 커피 맛있어용&quot;) 또는 비꼬기 — 사람 라벨이 오히려 의문이고 LLM 판단이 더 타당</li>
          <li>노이즈로 분류된 리뷰는 분석 풀에서 제외, 검수 위젯에서는 별도 확인 가능</li>
        </ul>

        <h3 className="text-base font-semibold text-black pt-2">
          중요도 정의
        </h3>
        <p>
          <strong>중요도는 부정 리뷰의 빈도</strong>로 정의합니다. 긍정
          리뷰는 같은 표에서 강점 지표로 별도 집계되며, 부정 빈도가 높은
          순서가 곧 개선 우선순위가 됩니다.
        </p>
      </Section>

      <Section title="한계·주의사항">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            LLM 분류는 100% 정확하지 않으므로, 해석할 때 신뢰도 점수를 가중치로
            함께 보아야 합니다. 신뢰도 [0.5, 0.7) 구간은 실제 정확도가 더 낮은
            과신 구간이라 별도 검수 권장.
          </li>
          <li>
            <strong>자동 가이드라인 미세조정의 한계</strong> — LLM이 혼동행렬을
            보고 작성하는 가이드라인 수정안은 모델 자체의 분류 능력보다는 분류
            체계의 표현력에 막혔을 때는 회귀를 유발했습니다. 실제 정확도 돌파는
            사람이 신규 카테고리(기능 요청·기능 제약)를 추가했을 때 발생.
          </li>
          <li>
            <strong>Ground Truth 편향</strong> — 분류 체계가 진화하면 그에 맞춰
            정답셋도 재라벨링되어야 합니다. 본 프로젝트는 r3 신규 카테고리 도입
            후 일부만 사후 갱신했고, r3 모델 독립 합의 기준의 보정된 평가만
            합격선을 통과합니다.
          </li>
          <li>
            Google Play 리뷰는 부정 의견이 과대 표집되는 경향이 있습니다 (만족한
            사용자는 리뷰를 잘 작성하지 않습니다).
          </li>
          <li>
            욕설·비방·비아냥성 리뷰는 키워드 필터 + LLM 노이즈 필터로 제거됩니다.
            이 과정에서 일부 강한 감정 신호가 손실될 수 있습니다.
          </li>
          <li>
            본 분석은 스냅샷 기반이므로 시계열 추세 분석은 제공하지 않습니다.
          </li>
          <li>
            본 데모는 비용 문제로 실제 LLM 분류를 매번 수행하지 않고, 미리
            생성한 정적 분류 결과를 사용합니다. 실제 운영 환경에서는 주기적
            재분류가 필요합니다.
          </li>
        </ul>
      </Section>

      <Section title="대시보드 사용 가이드">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>교차 피벗 표</strong>: 여정 × L1 매트릭스이며, 색이 진한
            셀일수록 문제가 집중된 영역입니다.
          </li>
          <li>
            <strong>L2 빈도 랭킹</strong>: 부정 리뷰를 기준으로 한 액션
            우선순위입니다.
          </li>
          <li>
            <strong>모호 리뷰 위젯</strong>: 검수 후보와 인터뷰 후보의
            풀입니다.
          </li>
        </ul>
        <p className="pt-2">
          <Link
            href="/dashboard/decision"
            className="inline-block px-4 py-2 rounded-md bg-neutral-900 text-white text-sm hover:bg-neutral-700"
          >
            대시보드 보기 →
          </Link>
        </p>
      </Section>

      <Section title="참고 문헌">
        <ol className="text-xs text-black space-y-1 list-none pl-0">
          <li id="fn-1" className="scroll-mt-20">
            1) Gunathilaka, S., &amp; de Silva, N. (2025). Automatic Analysis
            of App Reviews Using LLMs. <em>Proceedings of ICAART 2025</em>,
            Vol. 2, 828–839.
          </li>
          <li id="fn-2" className="scroll-mt-20">
            2) 최세나, 박세은, 최단비 외 1명 (2025).{" "}
            <em>
              사용자 경험 문제 발견을 위한 생성형 AI 기반 앱 리뷰 데이터 분석
              도구 개발 및 유용성 검증
            </em>
            . Journal of Integrated Design Research, 24(3), 95–112.
          </li>
          <li id="fn-3" className="scroll-mt-20">
            3) Zheng, L., et al. (2023). Judging LLM-as-a-Judge with MT-Bench
            and Chatbot Arena. <em>NeurIPS 2023</em>.{" "}
            <a
              href="https://arxiv.org/abs/2306.05685"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              arxiv.org/abs/2306.05685
            </a>
          </li>
          <li id="fn-4" className="scroll-mt-20">
            4) Efficient Prompt Optimization for Relevance Evaluation via
            LLM-Based Confusion Matrix Feedback (APO-CF) (2025).{" "}
            <em>MDPI Applied Sciences</em>, 15(9), 5198.{" "}
            <a
              href="https://www.mdpi.com/2076-3417/15/9/5198"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              mdpi.com/2076-3417/15/9/5198
            </a>
          </li>
        </ol>
      </Section>
    </article>
  );
}
