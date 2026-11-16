import { redirect } from "next/navigation";
import { member } from "@/lib/auth";
import Workspace from "@/components/workspace";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await member();
  } catch {
    redirect("/login");
  }
  return <Workspace>{children}</Workspace>;
}
