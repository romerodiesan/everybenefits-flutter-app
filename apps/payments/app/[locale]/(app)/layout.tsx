import { PaymentsShell } from "@/components/chrome/payments-shell";

export default function PaymentsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PaymentsShell>{children}</PaymentsShell>;
}
