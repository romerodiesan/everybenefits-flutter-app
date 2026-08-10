import { Suspense } from "react";
import { ForumsHome } from "@/components/forums/forums-home";
import { FeedPageSkeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <Suspense fallback={<FeedPageSkeleton />}>
      <ForumsHome />
    </Suspense>
  );
}
