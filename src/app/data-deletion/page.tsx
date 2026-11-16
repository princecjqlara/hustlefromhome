import Link from "next/link";
export default function Deletion() {
  return (
    <main className="public-document">
      <Link className="text-link" href="/">
        ← Hustle From Home
      </Link>
      <h1>Request data deletion</h1>
      <p>
        Email princecjqlara@gmail.com with the subject “Recruiting data
        deletion”. Include the Facebook Page you messaged and the name used in
        your inquiry. Please do not send your Facebook password.
      </p>
      <p>
        The business administrator will verify the request and remove the
        matching contact, conversation history, answers, invitations, and
        tracked links from this workspace. Records held independently by
        Facebook are managed through Facebook’s own controls.
      </p>
      <p>
        Reply STOP in Messenger if you want to stop outreach while your request
        is being handled.
      </p>
      <Link href="/privacy" className="text-link">
        How this workspace handles data →
      </Link>
    </main>
  );
}
