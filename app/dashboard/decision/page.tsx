import { loadClassifiedReviews } from "../../lib/data";

import DecisionDashboardClient from "./DecisionDashboardClient";

function EmptyState() {
  return (
    <article className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">대시보드</h2>
      <div className="border border-dashed border-neutral-300 rounded-lg p-8 text-center text-sm text-neutral-500">
        <p className="font-medium text-neutral-700 mb-1">
          분류 데이터가 없습니다
        </p>
        <p>
          <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">
            data/classified_reviews.json
          </code>
          을 생성한 뒤 다시 열어주세요.
        </p>
      </div>
    </article>
  );
}

export default async function DecisionDashboardPage() {
  const reviews = await loadClassifiedReviews();
  if (reviews.length === 0) return <EmptyState />;
  return <DecisionDashboardClient reviews={reviews} />;
}
