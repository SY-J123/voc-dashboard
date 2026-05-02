import Link from "next/link";

import MermaidDiagram from "./components/MermaidDiagram";
import { loadClassifiedReviews } from "./lib/data";

const ANALYSIS_FLOW = `%%{init: {"flowchart": {"htmlLabels": true, "useMaxWidth": true, "curve": "basis", "padding": 4, "nodeSpacing": 25, "rankSpacing": 30}, "themeVariables": {"fontSize": "12px"}}}%%
flowchart TD
    A["1. 분류 기준 수립"] --> B["2. 리뷰 수집·전처리"]
    B --> C["3. 검증 표본 추출"]
    C --> D["4. 같은 리뷰를 모델 3개가 각자 분류"]
    D --> E["5. 불일치 항목 수동 라벨링"]
    E --> G["6. Haiku 평가"]
    G --> H{"7. 정확도 합격선 도달?"}
    H -- "미달" --> I["8. 가이드라인 수정"]
    I --> G
    H -- "도달" --> J["9. 전체 데이터 재분류"]
    J --> N["10. 대시보드"]
    classDef step fill:#fff,stroke:#d4d4d4,color:#171717
    classDef branch fill:#fafafa,stroke:#a3a3a3,color:#171717
    classDef loop fill:#eff6ff,stroke:#bfdbfe,color:#1e40af
    class A,B,C,D,E,G,J,N step
    class H branch
    class I loop
`;

const problemSolutions = [
  {
    problem: "LLM으로 VOC를 분류하려면 먼저 일관된 분류 기준이 필요하다.",
    solution: "사용자 여정, 문제 유형, 감정 기준의 분류 가이드를 설계했다.",
  },
  {
    problem: "LLM이 실제로 얼마나 정확하게 분류하는지 수치로 확인할 방법이 없다.",
    solution: "3개 모델이 의견이 다른 항목은 수동으로 레이블링해 정답 데이터를 만들고, 정확도를 측정하며 가이드라인을 반복 개선했다.",
  },
  {
    problem: "분류 데이터만으로는 다음에 무엇을 해야 하는지 알기 어렵다.",
    solution: "대시보드를 구축해 고객 불만이 집중되는 영역과 대표 리뷰, 개선 방향을 한눈에 볼 수 있게 했다.",
  },
];

const journeyStages = [
  { name: "가입·로그인", desc: "회원가입, 로그인, 재로그인" },
  { name: "송금·이체", desc: "계좌 송금, 토스페이 송금" },
  { name: "결제", desc: "토스페이 결제, 가맹점 결제" },
  { name: "금융상품", desc: "계좌·카드·대출·투자·보험" },
  { name: "프로모션·이벤트", desc: "키우기, 뽑기, 만보기, 행운퀴즈 등" },
  { name: "앱 전반·CS", desc: "홈, 설정, 알림, 고객센터" },
  { name: "_미상", desc: "어느 단계인지 단서가 없는 경우" },
];

const problemTypes = [
  {
    l1: "UI·안내",
    l2: "화면 혼란, 피드백 부재, 안내 부족",
    meaning: "보면 알 수 있어야 할 것이 보이지 않거나 헷갈리는 경우",
  },
  {
    l1: "기능·성능",
    l2: "기능 오류, 성능·안정성, 업데이트 회귀",
    meaning: "동작이 되지 않거나, 느리거나, 앱이 꺼지는 경우",
  },
  {
    l1: "인증·보안",
    l2: "인증 실패, 절차·빈도 과다",
    meaning: "보안 절차가 사용성을 해치는 경우",
  },
  {
    l1: "정책·CS",
    l2: "광고·알림 과다, 수수료·한도, CS 불만, 기능 요청, 기능 제약",
    meaning: "정책 결정에 대한 불만·요구",
  },
  {
    l1: "긍정",
    l2: "만족·칭찬",
    meaning: "구체적인 단서 없이 표현된 일반적인 칭찬",
  },
  {
    l1: "_미분류",
    l2: "_근거부족·다중가설",
    meaning: "단서가 부족하거나 가설이 여러 갈래라 분류를 보류한 경우",
  },
];

const accuracyRows = [
  { label: "여정", before: "87%", after: "90%" },
  { label: "문제유형 L1", before: "75%", after: "86%" },
  { label: "문제유형 L2", before: "69%", after: "82%" },
  { label: "감정", before: "90%", after: "93%" },
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
      <div className="space-y-3 text-sm leading-relaxed text-black">
        {children}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const reviews = await loadClassifiedReviews();
  const totalCount = reviews.length;
  const negativeCount = reviews.filter(
    (review) => review.sentiment_label === "부정",
  ).length;
  const needsReviewCount = reviews.filter((review) => review.needs_review).length;
  const negativeRate =
    totalCount > 0 ? ((negativeCount / totalCount) * 100).toFixed(1) : "0.0";
  const needsReviewRate =
    totalCount > 0 ? ((needsReviewCount / totalCount) * 100).toFixed(1) : "0.0";

  return (
    <article className="mx-auto max-w-4xl space-y-10 break-keep">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">프로젝트 소개</h2>
      </div>

      {/* 개요 */}
      <Section title="개요">
        <p>
          신뢰할 만한 LLM VOC 분류 가이드를 만들고, 정제된 데이터를 바탕으로 개선 우선순위와 후속 액션을 제시하는 대시보드 프로젝트이다.
          혼동행렬로 오분류 패턴을 파악하고 분류 가이드라인을 4라운드 반복 수정해 정확도를 높였다.
          여정 <strong>87% → 90%</strong>, 문제유형 L1 <strong>75% → 86%</strong>, L2 <strong>69% → 82%</strong>, 감정 <strong>90% → 93%</strong>.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-1/2 border border-neutral-200 px-3 py-2 text-left font-medium">문제</th>
                <th className="w-1/2 border border-neutral-200 px-3 py-2 text-left font-medium">해결</th>
              </tr>
            </thead>
            <tbody>
              {problemSolutions.map((row) => (
                <tr key={row.problem}>
                  <td className="border border-neutral-200 px-3 py-2 align-top">{row.problem}</td>
                  <td className="border border-neutral-200 px-3 py-2 align-top">{row.solution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 분석 방식 */}
      <Section title="분석 방식">
        <ul className="list-disc space-y-2 pl-5">
          <li>리뷰를 수집한 뒤 짧은 리뷰, 욕설, 비아냥, 중복 리뷰를 제외했다.</li>
          <li>VOC를 여정, 문제 유형, 감정 기준으로 분류하는 가이드를 만들었다.</li>
          <li>골든셋과 경계 케이스로 LLM 분류 결과를 검증했다.</li>
          <li>오분류 패턴을 반영해 가이드라인을 반복 개선했다.</li>
          <li>확정된 기준으로 전체 데이터를 분류하고 대시보드에 연결했다.</li>
        </ul>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <MermaidDiagram chart={ANALYSIS_FLOW} />
        </div>
      </Section>

      {/* 분류 체계 */}
      <Section title="분류 체계">
        <p>각 리뷰를 여정, 문제 유형, 감정 3가지 기준으로 동시에 분류한다. 세 기준은 서로 독립적이어서 조합해서 볼 수 있다.</p>

        <h3 className="text-base font-semibold text-black">여정 단계 (7개)</h3>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-40 border border-neutral-200 px-3 py-2 text-left font-medium">단계</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">포함 범위</th>
              </tr>
            </thead>
            <tbody>
              {journeyStages.map((s) => (
                <tr key={s.name}>
                  <td className="border border-neutral-200 px-3 py-2 font-medium align-top">{s.name}</td>
                  <td className="border border-neutral-200 px-3 py-2 align-top">{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-black pt-2">문제 유형 (L1 6개 / L2 14개)</h3>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-32 border border-neutral-200 px-3 py-2 text-left font-medium">L1</th>
                <th className="w-52 border border-neutral-200 px-3 py-2 text-left font-medium">의미</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">L2 세부 항목</th>
              </tr>
            </thead>
            <tbody>
              {problemTypes.map((p) => (
                <tr key={p.l1}>
                  <td className="border border-neutral-200 px-3 py-2 font-medium align-top">{p.l1}</td>
                  <td className="border border-neutral-200 px-3 py-2 align-top">{p.meaning}</td>
                  <td className="border border-neutral-200 px-3 py-2 align-top">{p.l2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-black pt-2">감정 (3개)</h3>
        <p>긍정, 부정, 중립</p>
      </Section>

      {/* 데이터 전처리 */}
      <Section title="데이터 전처리">
        <p>분석에 적합하지 않은 리뷰를 사전에 제외해 분류 품질을 높였다.</p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-32 border border-neutral-200 px-3 py-2 text-left font-medium">항목</th>
                <th className="border border-neutral-200 px-3 py-2 text-left font-medium">제외 기준</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">욕설·비방</td>
                <td className="border border-neutral-200 px-3 py-2 align-top">분석 가치가 낮고 통계를 흐릴 수 있어 제외했다.</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">중복</td>
                <td className="border border-neutral-200 px-3 py-2 align-top">동일한 내용이 반복되는 리뷰는 한 건만 남겼다.</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">짧은 리뷰</td>
                <td className="border border-neutral-200 px-3 py-2 align-top">단서가 부족할 정도로 짧은 리뷰는 제외했다.</td>
              </tr>
              <tr>
                <td className="border border-neutral-200 px-3 py-2 font-medium align-top">언어</td>
                <td className="border border-neutral-200 px-3 py-2 align-top">한국어가 아닌 리뷰는 제외했다.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* 정답 데이터 구축 */}
      <Section title="정답 데이터 구축">
        <p>LLM 분류 정확도를 측정하려면 먼저 정답 데이터가 필요하다. 정답 데이터를 만드는 과정은 다음과 같다.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>전체 리뷰에서 층화 샘플링으로 100건, 경계 케이스 50건을 추가해 총 150건의 검증 표본을 만들었다.</li>
          <li>Claude Sonnet 4.6, Claude Haiku 4.5, GPT-4o mini 3개 모델이 같은 리뷰를 각자 분류했다.</li>
          <li>3개 모델의 결과가 일치하면 정답으로 확정했다.</li>
          <li>결과가 다르면 사람이 직접 검토해 정답을 결정했다.</li>
        </ul>
      </Section>

      {/* 정확도 검증·개선 */}
      <Section title="정확도 검증·개선">
        <p>
          Claude Haiku 4.5로 전체 정확도를 측정하고, 혼동행렬로 어떤 항목을 자주 틀리는지 파악했다.
          오분류 패턴에 따라 분류 가이드라인을 수정하고 다시 측정하는 과정을 최대 4라운드 반복했다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-36 border border-neutral-200 px-3 py-2 text-left font-medium">기준</th>
                <th className="w-24 border border-neutral-200 px-3 py-2 text-left font-medium">초기 정확도</th>
                <th className="w-24 border border-neutral-200 px-3 py-2 text-left font-medium">최종 정확도</th>
              </tr>
            </thead>
            <tbody>
              {accuracyRows.map((row) => (
                <tr key={row.label}>
                  <td className="border border-neutral-200 px-3 py-2 font-medium align-top">{row.label}</td>
                  <td className="border border-neutral-200 px-3 py-2 align-top">{row.before}</td>
                  <td className="border border-neutral-200 px-3 py-2 align-top font-semibold">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 대시보드 */}
      <Section title="대시보드">
        <p>최종 확정된 가이드라인으로 전체 {totalCount.toLocaleString("ko-KR")}건을 재분류하고 대시보드로 제공했다.</p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse border border-neutral-200 bg-white">
            <tbody>
              <tr>
                <th className="w-44 border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-medium">전체 리뷰</th>
                <td className="border border-neutral-200 px-3 py-2">{totalCount.toLocaleString("ko-KR")}건</td>
              </tr>
              <tr>
                <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-medium">부정 리뷰</th>
                <td className="border border-neutral-200 px-3 py-2">{negativeCount.toLocaleString("ko-KR")}건 ({negativeRate}%)</td>
              </tr>
              <tr>
                <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-medium">검수 필요</th>
                <td className="border border-neutral-200 px-3 py-2">{needsReviewCount.toLocaleString("ko-KR")}건 ({needsReviewRate}%)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-2 pl-5">
          <li>부정 리뷰가 집중되는 여정 단계와 문제 유형을 확인할 수 있다.</li>
          <li>각 문제에 대해 대표 리뷰와 개선 방향을 함께 볼 수 있다.</li>
        </ul>
        <p className="pt-2">
          <Link
            href="/dashboard/decision"
            className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            대시보드 보기 →
          </Link>
        </p>
      </Section>
    </article>
  );
}
