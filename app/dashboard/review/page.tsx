import { loadClassifiedReviews } from "../../lib/data";

import ReviewClient from "./ReviewClient";

export default async function ManualReviewPage() {
  const reviews = await loadClassifiedReviews();
  const queue = reviews.filter(
    (r) => r.needs_review || r.problem_type_l1 === "_미분류",
  );

  if (queue.length === 0) {
    return (
      <article className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">수동 분류</h2>
        <div className="border border-dashed border-neutral-300 rounded-lg p-8 text-center text-sm text-neutral-500">
          모호 리뷰가 없습니다.
        </div>
      </article>
    );
  }

  return <ReviewClient queue={queue} />;
}
