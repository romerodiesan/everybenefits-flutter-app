import { PageContentSkeleton } from "@/components/ui/skeleton";

/** Content-only; AppShell (nav) stays mounted in the parent layout. */
export default function AppLoading() {
  return <PageContentSkeleton />;
}
