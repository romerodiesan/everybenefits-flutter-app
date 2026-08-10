import {
  OrgTreeSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/data-table-skeleton";

export default function OrganizationsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeaderSkeleton withActions />
      <div className="flex gap-2">
        <div className="h-9 w-20 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-9 w-24 animate-pulse rounded-xl bg-white/[0.06]" />
      </div>
      <OrgTreeSkeleton rows={8} />
    </div>
  );
}
