"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import ButtonEditor from "./buttons";
import {
  Plus,
  Trash2,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  Send,
  Sparkles,
  Clock,
  RefreshCw,
  PanelsTopLeft as Facebook,
  ExternalLink,
  Check,
  AlertCircle,
  Link2,
  Copy,
  Pause,
  Play,
} from "lucide-react";
import type { Settings, Question, FAQ, Meeting, Contact } from "@/lib/types";
export { Campaigns, Advertising, SettingsPage } from "./connections";
type Props = {
  data: Record<string, any>;
  action: (name: string, data?: any, message?: string) => Promise<any>;
  busy: boolean;
};
const fmt = (date: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(date).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    ...(options || {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  });
function Panel({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Sparkles size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function SettingsSave({
  cfg,
  action,
  busy,
}: {
  cfg: Settings;
  action: Props["action"];
  busy: boolean;
}) {
  return (
    <div className="savebar">
      <span>
        <span className="dot" />
        {cfg.automation_enabled ? "Automation enabled" : "Automation paused"} ·
        Changes apply after saving
      </span>
      <button
        className="btn primary"
        disabled={busy}
        onClick={() => action("settings.save", cfg, "Playbook saved")}
      >
        {busy ? "Saving…" : "Save playbook"}
        <Check size={16} />
      </button>
    </div>
  );
}
export function Playbook({
  data,
  action,
  busy,
  section,
}: Props & { section: string }) {
  const [cfg, setCfg] = useState<Settings>(data.settings[0]);
  const [viewJobs, setViewJobs] = useState(false);
  const update = (p: Partial<Settings>) => setCfg((c) => ({ ...c, ...p }));
  return (
    <div className="editor-layout">
      <div className="editor-main">
        {section === "questionnaire" && (
          <Panel
            title="The conversation flow"
            sub="Questions are asked in order. All configured questions are collected; required answers must be present for qualification."
            action={
              <button
                className="btn small"
                onClick={() =>
                  update({
                    questions: [
                      ...cfg.questions,
                      {
                        id: crypto.randomUUID(),
                        label: "",
                        required: true,
                        kind: "text",
                      },
                    ],
                  })
                }
              >
                <Plus size={14} />
                Add question
              </button>
            }
          >
            {cfg.questions.length ? (
              cfg.questions.map((q, i) => (
                <div className="question-card" key={q.id}>
                  <div className="question-number">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="question-fields">
                    <Field label="Question">
                      <input
                        placeholder="e.g. What relevant experience do you have?"
                        value={q.label}
                        onChange={(e) =>
                          update({
                            questions: cfg.questions.map((x) =>
                              x.id === q.id
                                ? { ...x, label: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <div className="form-row">
                      <Field label="Answer type">
                        <select
                          value={q.kind}
                          onChange={(e) =>
                            update({
                              questions: cfg.questions.map((x) =>
                                x.id === q.id
                                  ? {
                                      ...x,
                                      kind: e.target.value as Question["kind"],
                                    }
                                  : x,
                              ),
                            })
                          }
                        >
                          {["text", "number", "email", "choice"].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </Field>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) =>
                            update({
                              questions: cfg.questions.map((x) =>
                                x.id === q.id
                                  ? { ...x, required: e.target.checked }
                                  : x,
                              ),
                            })
                          }
                        />
                        Required for review
                      </label>
                    </div>
                    {q.kind === "choice" && (
                      <Field label="Choices" hint="One choice per line">
                        <textarea
                          value={q.options?.join("\n") || ""}
                          onChange={(e) =>
                            update({
                              questions: cfg.questions.map((x) =>
                                x.id === q.id
                                  ? {
                                      ...x,
                                      options: e.target.value.split("\n"),
                                    }
                                  : x,
                              ),
                            })
                          }
                        />
                      </Field>
                    )}
                  </div>
                  <div className="question-controls">
                    <button
                      className="icon-btn"
                      title="Move question up"
                      disabled={i === 0}
                      onClick={() => {
                        const qs = [...cfg.questions];
                        [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
                        update({ questions: qs });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      className="icon-btn danger"
                      title="Remove question"
                      onClick={() =>
                        update({
                          questions: cfg.questions.filter((x) => x.id !== q.id),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="Every great conversation starts somewhere"
                text="Add your first question to start building a Messenger questionnaire."
              />
            )}
            <Field label="Completion message">
              <textarea
                value={cfg.completion_text}
                onChange={(e) => update({ completion_text: e.target.value })}
              />
            </Field>
          </Panel>
        )}
        {section === "faq" && (
          <Panel
            title="Approved answer library"
            sub="Jev selects a matching answer. It does not invent a response."
            action={
              <button
                className="btn small"
                onClick={() =>
                  update({
                    faqs: [
                      ...cfg.faqs,
                      { id: crypto.randomUUID(), question: "", answer: "" },
                    ],
                  })
                }
              >
                <Plus size={14} />
                Add answer
              </button>
            }
          >
            {cfg.faqs.length ? (
              cfg.faqs.map((f, i) => (
                <div className="faq-card" key={f.id}>
                  <div className="card-top">
                    <span className="eyebrow">
                      SAVED ANSWER {String(i + 1).padStart(2, "0")}
                    </span>
                    <button
                      className="icon-btn danger"
                      title="Remove answer"
                      onClick={() =>
                        update({ faqs: cfg.faqs.filter((x) => x.id !== f.id) })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label="When they ask…">
                    <input
                      placeholder="e.g. What does the role involve?"
                      value={f.question}
                      onChange={(e) =>
                        update({
                          faqs: cfg.faqs.map((x) =>
                            x.id === f.id
                              ? { ...x, question: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="Your approved answer">
                    <textarea
                      value={f.answer}
                      onChange={(e) =>
                        update({
                          faqs: cfg.faqs.map((x) =>
                            x.id === f.id
                              ? { ...x, answer: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <ButtonEditor
                    value={f.buttons}
                    onChange={(buttons) =>
                      update({
                        faqs: cfg.faqs.map((x) =>
                          x.id === f.id ? { ...x, buttons } : x,
                        ),
                      })
                    }
                  />
                  <div className="form-row">
                    <Field label="Media URL (optional)">
                      <input
                        type="url"
                        placeholder="https://…"
                        value={f.media_url || ""}
                        onChange={(e) =>
                          update({
                            faqs: cfg.faqs.map((x) =>
                              x.id === f.id
                                ? { ...x, media_url: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Media type">
                      <select
                        value={f.media_type || "image"}
                        onChange={(e) =>
                          update({
                            faqs: cfg.faqs.map((x) =>
                              x.id === f.id
                                ? { ...x, media_type: e.target.value }
                                : x,
                            ),
                          })
                        }
                      >
                        {["image", "video", "audio", "file"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="Your knowledge, ready to share"
                text="Add questions your contacts often ask, along with the exact answers you want sent."
              />
            )}
          </Panel>
        )}
        {section === "qualification" && (
          <>
            <Panel
              title="Your qualification standards"
              sub="Describe clear, job-related requirements. Missing evidence goes to human review."
            >
              <Field
                label="Criteria and rules"
                hint="Avoid criteria based on protected characteristics. Jev’s result is advisory; the administrator confirms qualification."
              >
                <textarea
                  className="large-textarea"
                  placeholder={
                    "Example:\n• Must have at least one year of relevant customer support experience.\n• Must be available for the stated shift.\n• If experience is unclear, flag for human review."
                  }
                  value={cfg.rules}
                  onChange={(e) => update({ rules: e.target.value })}
                />
              </Field>
              <div className="notice">
                <Sparkles size={18} />
                <div>
                  Recommendations stay explainable.
                  <small>
                    Each recommendation includes the answers used and the rule
                    version applied.
                  </small>
                </div>
              </div>
              <Field
                label={`Decision threshold · ${Math.round(cfg.confidence_threshold * 100)}%`}
                hint="Decisions below this probability require a person to review."
              >
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.01"
                  value={cfg.confidence_threshold}
                  onChange={(e) =>
                    update({ confidence_threshold: Number(e.target.value) })
                  }
                />
              </Field>
            </Panel>
            <Panel
              title="Waiting for your judgment"
              sub="Confirm the final status from a contact’s detail panel."
            >
              {data.contacts.filter((c: Contact) => c.status === "review")
                .length ? (
                data.contacts
                  .filter((c: Contact) => c.status === "review")
                  .map((c: Contact) => (
                    <Link
                      key={c.id}
                      className="review-row"
                      href={`/contacts?contact=${c.id}`}
                    >
                      <span>
                        {c.name}
                        <small>
                          Jev:{" "}
                          {String(c.recommendation?.decision || "Needs review")}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </Link>
                  ))
              ) : (
                <p className="muted">No contacts awaiting review.</p>
              )}
            </Panel>
          </>
        )}
        {section === "followups" && (
          <>
            <Panel
              title="A thoughtful nudge"
              sub="No lifetime attempt cap. Each send requires an eligible window and a fresh conversation check."
            >
              <Field label="Follow-up message">
                <textarea
                  value={cfg.followup_text}
                  onChange={(e) => update({ followup_text: e.target.value })}
                />
              </Field>
              <ButtonEditor
                value={cfg.followup_buttons}
                onChange={(buttons) => update({ followup_buttons: buttons })}
              />
              <div className="form-row">
                <Field label="Media URL (optional)">
                  <input
                    type="url"
                    placeholder="https://…"
                    value={cfg.followup_media_url || ""}
                    onChange={(e) =>
                      update({ followup_media_url: e.target.value })
                    }
                  />
                </Field>
                <Field label="Media type">
                  <select
                    value={cfg.followup_media_type || "image"}
                    onChange={(e) =>
                      update({ followup_media_type: e.target.value })
                    }
                  >
                    {["image", "video", "audio", "file"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="form-row">
                <Field label="Minimum hours between attempts">
                  <input
                    type="number"
                    min="0.25"
                    max="168"
                    step="0.25"
                    value={cfg.min_gap_hours}
                    onChange={(e) =>
                      update({ min_gap_hours: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Quiet hours begin">
                  <select
                    value={cfg.quiet_start}
                    onChange={(e) =>
                      update({ quiet_start: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quiet hours end">
                  <select
                    value={cfg.quiet_end}
                    onChange={(e) =>
                      update({ quiet_end: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="notice">
                <Clock size={18} />
                <div>
                  Timing learns from each contact.
                  <small>
                    Recent inbound activity ranks five suggested hours. With
                    little data, times stay close to the first inquiry.
                    Messaging-window rules always apply.
                  </small>
                </div>
              </div>
            </Panel>
            <Panel
              title="Automation queue"
              sub="Blocked and uncertain sends remain visible for review."
              action={
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() => action("jobs.run", {}, "Queue processed")}
                >
                  <Play size={14} />
                  Run due jobs
                </button>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TYPE</th>
                      <th>STATUS</th>
                      <th>DUE</th>
                      <th>DETAIL</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.slice(0, 30).map((j: any) => (
                      <tr key={j.id}>
                        <td>{j.kind}</td>
                        <td>
                          <span className={"badge " + j.status}>
                            {j.status}
                          </span>
                        </td>
                        <td>{fmt(j.due_at)}</td>
                        <td className="job-error">{j.last_error || "—"}</td>
                        <td>
                          {["blocked", "failed"].includes(j.status) && (
                            <button
                              className="btn small"
                              disabled={busy}
                              onClick={() => action("jobs.retry", { id: j.id })}
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.jobs.length && (
                  <p className="muted">No scheduled jobs yet.</p>
                )}
              </div>
            </Panel>
          </>
        )}
        <SettingsSave cfg={cfg} action={action} busy={busy} />
      </div>
      <aside className="editor-aside">
        <div className="guide-card">
          <span className="guide-icon">
            <Sparkles size={24} />
          </span>
          <h3>
            Your playbook.
            <br />
            Jev’s next move.
          </h3>
          <p>
            You set the questions, answers, and standards. Jev reads the
            conversation and chooses the next approved action.
          </p>
          <ol>
            <li>Collect the right details</li>
            <li>Respond with your saved answers</li>
            <li>Recommend the next step</li>
            <li>Leave the final call to you</li>
          </ol>
        </div>
        <div className="panel aside-status">
          <span className="eyebrow">AUTOMATION STATUS</span>
          <h3>
            {cfg.automation_enabled
              ? "Ready to connect."
              : "Paused, by design."}
          </h3>
          <p>
            Add your questions, saved answers, and rules before switching on.
          </p>
          <label className="switch-label">
            <input
              type="checkbox"
              checked={cfg.automation_enabled}
              onChange={(e) => update({ automation_enabled: e.target.checked })}
            />{" "}
            Enable playbook
          </label>
          <small>Save your playbook to apply this change.</small>
        </div>
      </aside>
    </div>
  );
}
export function Meetings({ data, action, busy }: Props) {
  const blank = {
    title: "",
    starts_at: "",
    timezone: "Asia/Manila",
    url: "",
    capacity: 100,
    notes: "",
    reminder_minutes: [1440, 60],
    reminder_offsets: "1440, 60",
    reminder_text: "Reminder: {{title}} starts at {{date}}. {{notes}}",
  };
  const [form, setForm] = useState<any>(blank),
    [open, setOpen] = useState(false),
    [tag, setTag] = useState(""),
    [page, setPage] = useState("");
  const tags = Array.from(
    new Set((data.contacts as Contact[]).flatMap((c) => c.tags)),
  );
  const meetings = data.meetings as Meeting[];
  return (
    <>
      <div className="section-toolbar">
        <span className="muted">
          {meetings.filter((m) => !m.canceled).length} meetings · your next
          opportunity to connect
        </span>
        <button
          className="btn primary"
          onClick={() => {
            setForm(blank);
            setOpen(true);
          }}
        >
          <Plus size={16} />
          Create meeting
        </button>
      </div>
      <div className="meeting-grid">
        {meetings.length ? (
          meetings.map((m) => {
            const invites = data.invitations.filter(
              (i: any) => i.meeting_id === m.id,
            );
            return (
              <section
                className={
                  "panel meeting-card " + (m.canceled ? "canceled" : "")
                }
                key={m.id}
              >
                <div className="card-top">
                  <div className="date-tile">
                    <small>{fmt(m.starts_at, { month: "short" })}</small>
                    <strong>{fmt(m.starts_at, { day: "numeric" })}</strong>
                  </div>
                  <span
                    className={
                      "badge " + (m.canceled ? "blocked" : "qualified")
                    }
                  >
                    {m.canceled
                      ? "Canceled"
                      : new Date(m.starts_at) > new Date()
                        ? "Upcoming"
                        : "Past"}
                  </span>
                </div>
                <h3>{m.title}</h3>
                <p>
                  {fmt(m.starts_at)} · {m.timezone}
                </p>
                <p className="meeting-notes">
                  {m.notes || "Good conversations, new possibilities."}
                </p>
                <a
                  className="text-link"
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Meeting link <ExternalLink size={13} />
                </a>
                <div className="meeting-stats">
                  <div>
                    <strong>{invites.length}</strong>
                    <small>Invited</small>
                  </div>
                  <div>
                    <strong>
                      {invites.filter((i: any) => i.rsvp === "yes").length}/
                      {m.capacity}
                    </strong>
                    <small>Confirmed</small>
                  </div>
                  <div>
                    <strong>
                      {invites.filter((i: any) => i.clicked_at).length}
                    </strong>
                    <small>Clicked</small>
                  </div>
                </div>
                <div className="meeting-controls">
                  <select
                    aria-label="Invite tag filter"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                  >
                    <option value="">All qualified tags</option>
                    {tags.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Invite Page filter"
                    value={page}
                    onChange={(e) => setPage(e.target.value)}
                  >
                    <option value="">All Pages</option>
                    {data.pages.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <button
                    className="btn primary small"
                    disabled={busy || m.canceled}
                    onClick={() =>
                      action(
                        "meeting.invite",
                        { id: m.id, tag, page_id: page },
                        "Eligible invitations queued",
                      )
                    }
                  >
                    <Send size={13} />
                    Invite qualified leads
                  </button>
                  <button
                    className="btn small"
                    disabled={m.canceled}
                    onClick={() => {
                      setForm({
                        ...m,
                        reminder_offsets: m.reminder_minutes.join(", "),
                        starts_at: new Date(
                          new Date(m.starts_at).getTime() -
                            new Date(m.starts_at).getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16),
                      });
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Cancel meeting"
                    disabled={m.canceled || busy}
                    onClick={() =>
                      action("meeting.cancel", { id: m.id }, "Meeting canceled")
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {invites.length > 0 && (
                  <details className="attendance">
                    <summary>RSVPs & attendance</summary>
                    {invites.map((i: any) => (
                      <div className="review-row" key={i.id}>
                        <span>
                          {
                            data.contacts.find(
                              (c: Contact) => c.id === i.contact_id,
                            )?.name
                          }
                          <small>
                            {i.rsvp} ·{" "}
                            {i.clicked_at
                              ? "link clicked"
                              : "no recorded click"}
                          </small>
                        </span>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={Boolean(i.attended)}
                            disabled={busy}
                            onChange={(e) =>
                              action("invitation.attendance", {
                                id: i.id,
                                attended: e.target.checked,
                              })
                            }
                          />
                          Attended
                        </label>
                      </div>
                    ))}
                  </details>
                )}
              </section>
            );
          })
        ) : (
          <Panel title="A seat at the table">
            <Empty
              title="Plan your first group meeting"
              text="Set a date, add your meeting link, and invite the people you’ve confirmed qualified."
            />
          </Panel>
        )}
      </div>
      {open && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await action(
                "meeting.save",
                {
                  ...form,
                  starts_at: new Date(form.starts_at).toISOString(),
                  reminder_minutes: form.reminder_offsets.trim()
                    ? form.reminder_offsets
                        .split(",")
                        .map((v: string) => Number(v.trim()))
                    : [],
                },
                "Meeting saved",
              );
              if (result) setOpen(false);
            }}
          >
            <div className="panel-heading">
              <div>
                <h3>{form.id ? "Edit meeting" : "Make the next connection"}</h3>
                <p>All the details, in one invitation.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="panel-body">
              <Field label="Meeting title">
                <input
                  required
                  maxLength={80}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <div className="form-row">
                <Field
                  label="Date & time"
                  hint="Uses your browser’s local timezone for entry."
                >
                  <input
                    required
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm({ ...form, starts_at: e.target.value })
                    }
                  />
                </Field>
                <Field label="Display timezone">
                  <input
                    required
                    value={form.timezone}
                    onChange={(e) =>
                      setForm({ ...form, timezone: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Meeting or venue link">
                <input
                  required
                  type="url"
                  placeholder="https://meet.google.com/…"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </Field>
              <Field label="Capacity">
                <input
                  required
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Notes for your guests">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
              <Field
                label="Reminder offsets (minutes before)"
                hint="Comma separated; 1440 = one day, 60 = one hour."
              >
                <input
                  value={form.reminder_offsets}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reminder_offsets: e.target.value,
                    })
                  }
                />
              </Field>
              <Field
                label="Reminder message"
                hint="Use {{title}}, {{date}}, and {{notes}}."
              >
                <textarea
                  value={form.reminder_text}
                  onChange={(e) =>
                    setForm({ ...form, reminder_text: e.target.value })
                  }
                />
              </Field>
              <div className="notice">
                <Clock size={17} />
                Reminders send only through an eligible messaging route.
              </div>
              <button className="btn primary" disabled={busy}>
                Save meeting <Check size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
export function Calendar({ data }: Props) {
  const [month, setMonth] = useState(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [day, setDay] = useState("");
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const local = (s: string) =>
    new Date(s).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const start = new Date(month);
  start.setDate(1 - start.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const selected = data.contacts.filter(
    (c: Contact) => local(c.first_inquiry_at) === day,
  );
  return (
    <>
      <Panel
        title={month.toLocaleDateString("en", {
          month: "long",
          year: "numeric",
        })}
        sub="Daily inquiry cohorts and meeting activity · Asia/Manila"
        action={
          <div className="form-row">
            <button
              className="icon-btn"
              title="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="btn small"
              onClick={() =>
                setMonth(
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                )
              }
            >
              Today
            </button>
            <button
              className="icon-btn"
              title="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      >
        <div className="calendar-grid">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((w) => (
            <div className="calendar-weekday" key={w}>
              {w}
            </div>
          ))}
          {cells.map((d) => {
            const k = key(d);
            const contacts = data.contacts.filter(
              (c: Contact) => local(c.first_inquiry_at) === k,
            );
            const meetings = data.meetings.filter(
              (m: Meeting) => !m.canceled && local(m.starts_at) === k,
            );
            return (
              <button
                key={k}
                className={
                  "calendar-cell " +
                  (d.getMonth() !== month.getMonth() ? "other-month " : "") +
                  (k === day ? "selected " : "") +
                  (k === key(new Date()) ? "today" : "")
                }
                onClick={() => setDay(k)}
              >
                <span className="calendar-date">{d.getDate()}</span>
                {contacts.length > 0 && (
                  <span className="calendar-event">
                    {contacts.length} new inquiries
                  </span>
                )}
                {meetings.map((m: Meeting) => (
                  <span className="calendar-event purple" key={m.id}>
                    {m.title}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </Panel>
      {day && (
        <Panel
          title={`The day in detail · ${day}`}
          sub="Contact statuses reflect their current state; the date groups their first inquiry."
        >
          <div className="metric-grid compact">
            {[
              ["Total inquiries", selected.length],
              [
                "Unanswered",
                selected.filter((c: Contact) => !Object.keys(c.answers).length)
                  .length,
              ],
              [
                "Incomplete",
                selected.filter((c: Contact) => c.status === "incomplete")
                  .length,
              ],
              [
                "Qualified",
                selected.filter((c: Contact) => c.status === "qualified")
                  .length,
              ],
              [
                "Unqualified",
                selected.filter((c: Contact) => c.status === "unqualified")
                  .length,
              ],
              [
                "In review",
                selected.filter((c: Contact) => c.status === "review").length,
              ],
            ].map(([label, n]) => (
              <div key={label} className="mini-metric">
                <strong>{n}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div>
            {selected.map((c: Contact) => (
              <Link
                href={`/contacts?contact=${c.id}`}
                key={c.id}
                className="review-row"
              >
                {c.name}
                <span className={"badge " + c.status}>{c.status}</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
