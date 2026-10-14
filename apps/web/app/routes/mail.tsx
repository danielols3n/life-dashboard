import { MailWidget } from "@/components/widgets/MailWidget";

export const meta = () => [{ title: "E-post · Life Dashboard" }];

export default function Mail() {
  return (
    <main className="page">
      <MailWidget count={20} />
    </main>
  );
}
