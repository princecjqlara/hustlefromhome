import Link from "next/link";
export default function Privacy() {
  return (
    <main className="public-document">
      <Link className="text-link" href="/">
        ← Hustle From Home
      </Link>
      <h1>How this workspace handles data</h1>
      <p>
        This recruiting workspace stores conversations received by connected
        Facebook Pages, questionnaire answers, contact details, tags,
        application review decisions, meeting RSVPs, and messaging activity.
      </p>
      <h2>Who uses the information</h2>
      <p>
        Authorized members of the business use these records to answer
        inquiries, assess job-related requirements, arrange meetings, and
        measure recruiting activity. Supabase hosts the records, Vercel runs the
        application, Meta delivers Messenger messages, and OpenRouter routes
        conversation context to Jev for structured recommendations.
      </p>
      <h2>Your choices</h2>
      <p>
        Reply STOP to stop automated outreach. You can ask the business to
        correct or delete your recruiting records by contacting
        princecjqlara@gmail.com. Include the Page you contacted and enough
        information to identify the conversation.
      </p>
      <h2>Facebook connection</h2>
      <p>
        Page access is authorized by a Page manager. Access tokens are stored
        encrypted on the server. Disconnecting a Page pauses messaging from this
        workspace. Contact records remain available to the administrator until
        deleted.
      </p>
      <p>
        <Link className="text-link" href="/data-deletion">
          Data deletion instructions →
        </Link>
      </p>
    </main>
  );
}
