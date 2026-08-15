import { MemberProfile } from "@/components/profile/member-profile";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <MemberProfile handle={uid} />;
}
