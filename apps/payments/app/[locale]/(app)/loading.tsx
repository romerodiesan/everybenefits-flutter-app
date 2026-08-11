import { TablePageSkeleton } from "@/components/ui/data-table-skeleton";

/** Content-only; AdminShell (menu) stays mounted in the parent layout. */
export default function AppLoading() {
  return <TablePageSkeleton />;
}
