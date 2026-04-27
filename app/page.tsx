import Link from "next/link";

const journeyStages = [
  { name: "가입·로그인", desc: "회원가입, 로그인, 재로그인" },
  { name: "송금·이체", desc: "계좌 송금, 토스페이 송금" },
  { name: "결제", desc: "토스페이 결제, 가맹점 결제" },
  { name: "금융상품", desc: "계좌·카드·대출·투자·보험" },
  { name: "프로모션·이벤트", desc: "키우기, 뽑기, 만보기, 행운퀴즈 등" },
  { name: "앱 전반·CS", desc: "홈, 설정, 알림, 고객센터" },
  { name: "_미상", desc: "어느 단계인지 단서 없음" },
];

const problemTypes: { l1: string; l2: string[]; meaning: string }[] = [
  {
    l1: "UI·안내",
    l2: ["화면 혼란/어포던스", "피드백 부재", "안내·메시지 부족"],
    meaning: "보면 알 수 있어야 할 것이 안 보이거나 헷갈림",
  },
  {
    l1: "기능·성능",
    l2: ["기능 오류", "성능·안정성", "업데이트 회귀"],
    meaning: "동작 자체가 안 됨, 느림, 죽음",
  },
  {
    l1: "인증·보안",
    l2: ["인증 실패", "절차·빈도 과다"],
    meaning: "보안 절차가 사용성을 해침",
  },
  {
    l1: "정책·CS",
    l2: ["광고·알림 과다", "수수료·한도", "CS 불만"],
    meaning: "정책 결정 사항에 대한 불만",
  },
  {
    l1: "긍정",
    l2: ["만족·칭찬"],
    meaning: "차원 단서 없는 일반 칭찬",
  },
  {
    l1: "_미분류",
    l2: ["_근거부족·다중가설"],
    meaning: "단서 부족·다중 가설로 결정 보류",
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
      <div className="text-sm text-neutral-700 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <article className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          토스 VOC 대시보드
        </h2>
        <p className="text-neutral-600">
          모호한 사용자 리뷰를 분류 가능한 차원으로 구조화해 UX 문제의 발생
          지점·유형·중요도를 드러냅니다.
        </p>
      </div>

      <Section title="개요">
        <p>
          VOC(Voice of Customer)는 보통 모호합니다. &quot;안 돼요&quot;,
          &quot;이상해요&quot; 같은 표면적 표현 뒤에 실제 UX 문제가 숨어있죠. 이
          대시보드는 사용자 리뷰를{" "}
          <strong>여정 단계 × 문제 타입 × 감정</strong> 3차원으로 분류해
          디자인·개선 작업의 우선순위를 도출합니다.
        </p>
      </Section>

      <Section title="데이터 출처·범위">
        <ul className="list-disc pl-5 space-y-1">
          <li>출처: Google Play 토스 앱 리뷰 (최신순)</li>
          <li>수집량: 2,600건</li>
          <li>전처리 후 유효: 약 2,300건</li>
          <li>LLM 분류 대상: 최신 1,000건 (비용·일관성 고려)</li>
          <li>분석 주기: 스냅샷 (1회성)</li>
        </ul>
      </Section>

      <Section title="분석 방법론">
        <p>
          각 리뷰는 <strong>3개 직교 차원</strong>으로 분류됩니다. 직교란 세
          차원이 독립적이라는 뜻 — 같은 문제 타입이 여러 여정에서 등장할 수
          있습니다 (예: &quot;피드백 부재&quot;가 결제·송금·인증 모두에서
          나타남).
        </p>
      </Section>

      <Section title="차원 A — 여정 단계 (7개)">
        <p className="text-neutral-600">어느 사용자 여정에서 발생한 문제인가</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {journeyStages.map((s) => (
            <div
              key={s.name}
              className="border border-neutral-200 rounded-md px-3 py-2 bg-white"
            >
              <div className="font-medium text-sm">{s.name}</div>
              <div className="text-xs text-neutral-500">{s.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="차원 B — 문제 타입 (L1 6개 / L2 12개)">
        <p className="text-neutral-600">
          어떤 종류의 문제인가. L1은 요약 뷰, L2는 액션 단위.
        </p>
        <div className="space-y-2">
          {problemTypes.map((p) => (
            <div
              key={p.l1}
              className="border border-neutral-200 rounded-md p-3 bg-white"
            >
              <div className="flex items-baseline justify-between mb-1">
                <div className="font-semibold">{p.l1}</div>
                <div className="text-xs text-neutral-500">{p.meaning}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.l2.map((l2) => (
                  <span
                    key={l2}
                    className="inline-block text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700"
                  >
                    {l2}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="차원 C — 감정 (3개)">
        <p>
          <span className="font-medium">긍정 / 부정 / 중립</span>. 구체적 차원
          단서가 있는 칭찬은 해당 L1·L2 그대로 두고 sentiment만 긍정으로 분류
          → 강점·약점 교차 분석이 가능합니다 (예: &quot;송금 빨라요&quot; →
          기능·성능 / 성능·안정성 / 긍정).
        </p>
      </Section>

      <Section title="모호한 리뷰는 강제 분류하지 않습니다">
        <p>
          &quot;결제 안 넘어가요&quot; 같은 단서 부족 리뷰는 무리하게 분류하면
          통계를 오염시킵니다. LLM이 신뢰도 0.5 미만으로 분류한 경우{" "}
          <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">
            _미분류
          </code>{" "}
          버킷으로 보내고{" "}
          <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">
            needs_review
          </code>{" "}
          플래그를 부여합니다. 분포 자체가 신호 — 모호 리뷰가 많은 영역은 사용자
          인터뷰 후보가 됩니다.
        </p>
      </Section>

      <Section title="중요도 정의">
        <p>
          <strong>중요도 = 부정 리뷰 빈도</strong>. 긍정 리뷰는 같은 표에서
          강점 지표로 따로 집계됩니다. 부정 빈도 내림차순이 곧 개선
          우선순위입니다.
        </p>
      </Section>

      <Section title="한계·주의사항">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            LLM 분류는 100% 정확하지 않습니다. 신뢰도 점수로 가중치를 줘서
            해석하세요.
          </li>
          <li>
            Google Play 리뷰는 부정 의견이 과대표집됩니다 (만족 사용자는 리뷰를
            잘 쓰지 않음).
          </li>
          <li>
            욕설·비방·비아냥 리뷰는 전처리에서 제거됐습니다. 강한 감정 신호 일부
            손실이 있을 수 있습니다.
          </li>
          <li>
            스냅샷 분석이라 트렌드(시계열) 분석은 제공하지 않습니다.
          </li>
        </ul>
      </Section>

      <Section title="대시보드 사용 가이드">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>교차 피벗 표</strong>: 여정 × L1 매트릭스. 색이 진한 셀이
            문제 집중 영역.
          </li>
          <li>
            <strong>L2 빈도 랭킹</strong>: 부정 리뷰 기준 액션 우선순위.
          </li>
          <li>
            <strong>모호 리뷰 위젯</strong>: 검수 후보 / 인터뷰 후보 풀.
          </li>
        </ul>
        <p className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 rounded-md bg-neutral-900 text-white text-sm hover:bg-neutral-700"
          >
            분석 결과 보기 →
          </Link>
        </p>
      </Section>
    </article>
  );
}
