import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "overview",
      "inbox",
      "contacts",
      "questionnaire",
      "faq",
      "qualification",
      "followups",
      "meetings",
      "calendar",
      "campaigns",
      "advertising",
      "settings",
    ].includes(section)
  )
    notFound();
  return <Dashboard section={section} />;
}
