import { TablePageSkeleton } from "@/components/ui/data-table-skeleton";

export default function ApprovalsLoading() {
  return <TablePageSkeleton columns={4} withToolbar={false} />;
}
