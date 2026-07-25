import { Suspense } from "react";
import { ForumsHome } from "@/components/forums/forums-home";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ForumsHome />
    </Suspense>
  );
}
