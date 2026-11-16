"use client";
import { useState } from "react";
import { RefreshCw, Send, Plus } from "lucide-react";
type Props = {
  data: Record<string, any>;
  action: (name: string, data?: any, message?: string) => Promise<any>;
  busy: boolean;
};
export function UtilityComposer({
  contact,
  action,
  busy,
}: Omit<Props, "data"> & { contact: any }) {
  const [templates, setTemplates] = useState<any[]>([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [body, setBody] = useState(""),
    [header, setHeader] = useState("");
  return (
    <details className="utility-composer">
      <summary>Send an approved utility update · outside 24 hours</summary>
      <p className="muted">
        For requested application or meeting updates. Promotional follow-ups
        cannot use this route.
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={Boolean(contact.utility_requested_at)}
          disabled={busy}
          onChange={(e) =>
            action("contact.utility_request", {
              id: contact.id,
              requested: e.target.checked,
              note: "Administrator recorded the contact’s request for application or meeting updates.",
            })
          }
        />
        Contact explicitly requested these updates
      </label>
      <div className="form-row">
        <button
          className="btn small"
          type="button"
          onClick={async () => {
            setError("");
            const r = await fetch("/api/templates?page_id=" + contact.page_id);
            const d = await r.json();
            if (!r.ok) setError(d.error);
            else
              setTemplates(
                d.templates.filter(
                  (t: any) =>
                    t.status === "APPROVED" && t.category === "UTILITY",
                ),
              );
          }}
        >
          <RefreshCw size={13} />
          Load approved templates
        </button>
        <select
          aria-label="Approved utility template"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Choose approved template</option>
          {templates.map((t) => (
            <option value={t.id} key={t.id}>
              {t.name} · {t.language}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="notice error">{error}</p>}
      <label className="field">
        <span>Header values (one per line, if required)</span>
        <textarea value={header} onChange={(e) => setHeader(e.target.value)} />
      </label>
      <label className="field">
        <span>Body values (one per line, if required)</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <button
        className="btn small"
        disabled={busy || !selected || !contact.utility_requested_at}
        onClick={() => {
          const t = templates.find((t) => t.id === selected);
          action(
            "utility.send",
            {
              contact_id: contact.id,
              name: t.name,
              language: t.language,
              header: header ? header.split("\n") : [],
              body: body ? body.split("\n") : [],
            },
            "Utility update sent",
          );
        }}
      >
        <Send size={13} />
        Send requested update
      </button>
    </details>
  );
}
export function UtilityTemplates({ data, action, busy }: Props) {
  const [page, setPage] = useState(""),
    [name, setName] = useState(""),
    [text, setText] = useState(""),
    [language, setLanguage] = useState("en_US"),
    [templates, setTemplates] = useState<any[]>([]),
    [error, setError] = useState("");
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Utility templates</h3>
          <p>
            Requested account, application, and meeting updates. Meta reviews
            each template.
          </p>
        </div>
      </div>
      <div className="panel-body">
        <label className="field">
          <span>Facebook Page</span>
          <select value={page} onChange={(e) => setPage(e.target.value)}>
            <option value="">Choose a Page</option>
            {data.pages.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn small"
          disabled={!page}
          onClick={async () => {
            const r = await fetch("/api/templates?page_id=" + page);
            const d = await r.json();
            if (!r.ok) setError(d.error);
            else {
              setTemplates(d.templates);
              setError("");
            }
          }}
        >
          <RefreshCw size={13} />
          Refresh template status
        </button>
        {error && <div className="notice error">{error}</div>}
        {templates.map((t) => (
          <div className="review-row" key={t.id}>
            <span>
              {t.name}
              <small>
                {t.language} · {t.category}
              </small>
            </span>
            <span className="badge">{t.status}</span>
          </div>
        ))}
        <details className="utility-composer">
          <summary>Submit a new utility template</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await action(
                "template.create",
                { page_id: page, name, language, text },
                "Template submitted to Meta for review",
              );
              if (r) {
                setName("");
                setText("");
              }
            }}
          >
            <label className="field">
              <span>Template name</span>
              <input
                required
                pattern="[a-z0-9_]+"
                placeholder="application_status_update"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Language</span>
              <input
                required
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Exact message text</span>
              <textarea
                required
                placeholder="A factual update requested by the contact. This basic editor submits fixed text without variables."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="btn small" disabled={!page || busy}>
              <Plus size={13} />
              Submit for approval
            </button>
          </form>
        </details>
        <p className="muted" style={{ fontSize: 10, marginTop: 15 }}>
          Send approved templates from a contact’s conversation panel.
          Availability depends on Meta’s Page, region, and recipient
          eligibility.
        </p>
      </div>
    </section>
  );
}
