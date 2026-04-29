import Link from "next/link";

import MermaidDiagram from "./components/MermaidDiagram";
import { loadClassifiedReviews } from "./lib/data";

const ANALYSIS_FLOW = `flowchart LR
    Z["1. 분석 기준 수립<br/>여정 / 문제 타입 / 감정 정의"] --> A["2. 리뷰 수집<br/>Google Play 토스 앱 리뷰"]
    A --> B["3. 전처리<br/>욕설·중복·길이 필터"]
    B --> C["4. 샘플링<br/>비용·일관성 고려, 최신 리뷰 일부"]
    C --> D["5. AI 분류<br/>여정 / 문제 타입 / 감정 + 신뢰도·대안 가설"]
    D --> E{"6. 신뢰도 분기"}
    E -- "≥ 50%" --> F["본 분석<br/>차원별 집계·우선순위"]
    E -- "< 50%" --> G["_미분류<br/>사람이 직접 분류"]
    F --> H["7. 대시보드"]
    G --> H
    classDef step fill:#fff,stroke:#d4d4d4,color:#171717
    classDef branch fill:#fafafa,stroke:#a3a3a3,color:#171717
    classDef good fill:#ecfdf5,stroke:#a7f3d0,color:#065f46
    classDef warn fill:#fffbeb,stroke:#fde68a,color:#92400e
    class Z,A,B,C,D,H step
    class E branch
    class F good
    class G warn
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
    ],
    meaning: "정책 결정에 대한 불만",
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
          기준 B — 문제 타입 (L1 6개 / L2 12개)
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
          분류 작업에는 Anthropic의 Claude Haiku 4.5 모델을 사용합니다. 비용과
          분류 품질의 균형을 고려해 선정했습니다.
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
          AI에게는 세 분류 기준 각각의 카테고리 정의와 포함·제외 예시를 함께
          제공합니다. 또한 분류 결과마다 신뢰도 점수와 대안 가설을 함께
          기록하도록 하며, 신뢰도가 낮은 경우에는 강제로 분류하지 않고
          미분류 항목으로 표시하도록 안내합니다.
        </p>

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
            함께 보아야 합니다.
          </li>
          <li>
            Google Play 리뷰는 부정 의견이 과대 표집되는 경향이 있습니다 (만족한
            사용자는 리뷰를 잘 작성하지 않습니다).
          </li>
          <li>
            욕설·비방·비아냥성 리뷰는 전처리 단계에서 제거되었으며, 이 과정에서
            일부 강한 감정 신호가 손실될 수 있습니다.
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
        </ol>
      </Section>
    </article>
  );
}
