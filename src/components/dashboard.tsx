"use client";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Users,
  UserCheck,
  MessageSquare,
  ListChecks,
  CalendarDays,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RefreshCw,
  Send,
  ExternalLink,
  Trash2,
  AlertCircle,
  Link2,
  PanelsTopLeft as Facebook,
  Activity,
  Sparkles,
  X,
  Settings as SettingsIcon,
  Tag,
  MoreHorizontal,
} from "lucide-react";
import { bestTimes, eligibility } from "@/lib/policy";
import type { Contact, Settings, Question, FAQ, Meeting } from "@/lib/types";
import ContactFields from "./contact-fields";
import { UtilityComposer } from "./utility";
import {
  Playbook,
  Meetings,
  Calendar,
  Campaigns,
  Advertising,
  SettingsPage,
} from "./editors";
type Data = Record<string, any>;
const titles: Record<string, [string, string]> = {
  overview: [
    "A little clarity. A lot of possibility.",
    "Your conversations, people, and next steps — all in one place.",
  ],
  inbox: [
    "Every hello has potential.",
    "Follow the conversation. Help the right people take the next step.",
  ],
  contacts: [
    "Good people. All together.",
    "Your growing network, organized around what matters.",
  ],
  questionnaire: [
    "Start with the right questions.",
    "Collect the details you need, one Messenger conversation at a time.",
  ],
  faq: [
    "Your answers. Right on time.",
    "Give Jev an approved library to choose from when a contact has a question.",
  ],
  qualification: [
    "Define your kind of qualified.",
    "Set job-related criteria. Jev recommends; your team makes the decision.",
  ],
  followups: [
    "Keep the conversation moving.",
    "Thoughtful timing, approved messages, and room for a human touch.",
  ],
  meetings: [
    "Make room for what’s next.",
    "Bring qualified people together, with the details taken care of.",
  ],
  calendar: [
    "Your days, at a glance.",
    "Every new connection and upcoming meeting in one calendar.",
  ],
  campaigns: [
    "A message with a purpose.",
    "Reach an eligible audience with something worth sharing.",
  ],
  advertising: [
    "See where good leads begin.",
    "Connect conversations to ads, spend, and confirmed qualifications.",
  ],
  settings: [
    "Make this workspace yours.",
    "Connect your Pages and keep your recruiting engine running.",
  ],
};
const fmt = (d: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    ...(options || {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  });
const initials = (s: string) =>
  s
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.replaceAll(" ", "-")}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Empty({
  icon: Icon = Users,
  title,
  text,
  action,
}: {
  icon?: any;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Panel({
  title,
  sub,
  action,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export default function Dashboard({ section }: { section: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/data");
      if (r.status === 401) {
        location.href = "/login";
        return;
      }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);
  async function action(
    name: string,
    payload: any = {},
    success = "Saved successfully",
  ) {
    setBusy(true);
    try {
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, data: payload }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (success) setToast(success);
      await load();
      return d;
    } catch (e) {
      setToast("Error: " + (e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const props = { data: data!, action, busy };
  return (
    <main className="content">
      {toast && (
        <div
          className={"toast " + (toast.startsWith("Error") ? "error" : "")}
          role="status"
        >
          {toast.startsWith("Error") ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toast}</span>
          <button className="icon-btn" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {section === "overview"
              ? "THE BIG PICTURE"
              : section === "settings"
                ? "WORKSPACE SETTINGS"
                : "YOUR RECRUITING WORKSPACE"}
          </div>
          <h1>{titles[section][0]}</h1>
          <p>{titles[section][1]}</p>
        </div>
        <button
          className="btn small refresh"
          onClick={load}
          title="Refresh data"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {error ? (
        <div className="notice error">
          {error}
          <button className="btn small" onClick={load}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="loading">
          <RefreshCw className="spin" /> Opening your workspace…
        </div>
      ) : (
        <>
          {section === "overview" ? (
            <Overview {...props} />
          ) : section === "contacts" || section === "inbox" ? (
            <Contacts {...props} inbox={section === "inbox"} />
          ) : ["questionnaire", "faq", "qualification", "followups"].includes(
              section,
            ) ? (
            <Playbook {...props} section={section} />
          ) : section === "meetings" ? (
            <Meetings {...props} />
          ) : section === "calendar" ? (
            <Calendar {...props} />
          ) : section === "campaigns" ? (
            <Campaigns {...props} />
          ) : section === "advertising" ? (
            <Advertising {...props} />
          ) : (
            <SettingsPage {...props} />
          )}
        </>
      )}
    </main>
  );
}
type Props = {
  data: Data;
  action: (name: string, data?: any, message?: string) => Promise<any>;
  busy: boolean;
};
function Overview({ data }: Props) {
  const contacts = data.contacts as Contact[];
  const qualified = contacts.filter((c) => c.status === "qualified").length;
  const incomplete = contacts.filter((c) =>
    ["new", "incomplete"].includes(c.status),
  ).length;
  const upcoming = data.meetings.filter(
    (m: Meeting) => !m.canceled && new Date(m.starts_at) > new Date(),
  );
  const counts = [
    {
      name: "Total contacts",
      value: contacts.length,
      icon: Users,
      note: "Every connection counts",
      color: "green",
    },
    {
      name: "Qualified leads",
      value: qualified,
      icon: UserCheck,
      note: "Reviewed and ready for the next step",
      color: "lime",
    },
    {
      name: "Awaiting answers",
      value: incomplete,
      icon: MessageSquare,
      note: "A conversation in progress",
      color: "peach",
    },
    {
      name: "Upcoming meetings",
      value: upcoming.length,
      icon: CalendarDays,
      note: "New opportunities on the calendar",
      color: "lavender",
    },
  ];
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  });
  const daily = dates.map(
    (day) =>
      contacts.filter(
        (c) =>
          new Date(c.first_inquiry_at).toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila",
          }) === day,
      ).length,
  );
  const max = Math.max(1, ...daily);
  const funnel = [
    ["New inquiries", contacts.length],
    [
      "Questionnaire complete",
      contacts.filter((c) => !["new", "incomplete"].includes(c.status)).length,
    ],
    ["Qualified", qualified],
    [
      "Meeting confirmed",
      data.invitations.filter((i: any) => i.rsvp === "yes").length,
    ],
  ];
  return (
    <>
      <div className="overview-banner">
        <div className="banner-art">
          <Sparkles size={26} />
        </div>
        <div>
          <span className="eyebrow">A WORKFLOW THAT WORKS WITH YOU</span>
          <h2>Less chasing. More connecting.</h2>
          <p>
            Your playbook keeps the next step clear, from first inquiry to first
            meeting.
          </p>
        </div>
        <Link href="/questionnaire" className="btn white">
          Build your playbook <ArrowUpRight size={17} />
        </Link>
        <span className="banner-ring ring-one" />
        <span className="banner-ring ring-two" />
      </div>
      <div className="metric-grid">
        {counts.map((m) => (
          <div className="metric" key={m.name}>
            <div className="metric-top">
              <span>{m.name}</span>
              <span className={"metric-icon " + m.color}>
                <m.icon size={18} />
              </span>
            </div>
            <strong>{m.value.toLocaleString()}</strong>
            <small>{m.note}</small>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <Panel
          title="Connections over time"
          sub="New inquiries · last 14 days"
          action={
            <span className="chart-legend">
              <span className="dot" /> New contacts
            </span>
          }
        >
          <div className="chart">
            <div className="chart-y">
              <span>{max}</span>
              <span>{Math.round(max / 2)}</span>
              <span>0</span>
            </div>
            <div className="chart-plot">
              <div className="gridline top" />
              <div className="gridline middle" />
              <div className="gridline bottom" />
              <div className="bars">
                {daily.map((n, i) => (
                  <div
                    className="bar-column"
                    key={dates[i]}
                    title={`${dates[i]}: ${n} contacts`}
                  >
                    <div
                      className="bar"
                      style={{
                        height: n ? `${Math.max(3, (n / max) * 100)}%` : "2px",
                        opacity: n ? 1 : 0.25,
                      }}
                    />
                    {i % 3 === 0 && (
                      <span>
                        {new Date(dates[i] + "T12:00:00").toLocaleDateString(
                          "en",
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-foot">
            <span>Every conversation is a new possibility.</span>
            <Link href="/calendar">
              Explore activity <ArrowUpRight size={13} />
            </Link>
          </div>
        </Panel>
        <Panel
          title="Your recruiting funnel"
          sub="From a first hello to a confirmed seat"
        >
          <div className="funnel">
            {funnel.map(([label, n], i) => (
              <div className="funnel-row" key={label}>
                <div>
                  <span className="step-num">0{i + 1}</span>
                  <span>{label}</span>
                  <strong>{n}</strong>
                </div>
                <div className="funnel-track">
                  <span
                    style={{
                      width: contacts.length
                        ? `${Math.max(2, (Number(n) / contacts.length) * 100)}%`
                        : "0%",
                      opacity: 1 - i * 0.18,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="funnel-note">
            <Sparkles size={14} />
            {contacts.length
              ? `${Math.round((qualified / contacts.length) * 100)}% of your contacts are confirmed qualified.`
              : "Your funnel will grow with your first conversation."}
          </div>
        </Panel>
        <Panel
          title="Recent connections"
          sub="The people behind the pipeline"
          action={
            <Link className="text-link" href="/contacts">
              View all <ArrowRight size={14} />
            </Link>
          }
        >
          {contacts.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CONTACT</th>
                    <th>STATUS</th>
                    <th>FIRST HELLO</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {contacts.slice(0, 5).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="person">
                          <span className="avatar soft">
                            {initials(c.name)}
                          </span>
                          <div>
                            {c.name}
                            <small>
                              {
                                data.pages.find((p: any) => p.id === c.page_id)
                                  ?.name
                              }
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge value={c.status} />
                      </td>
                      <td>
                        {fmt(c.first_inquiry_at, {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>
                        <Link
                          className="icon-btn"
                          href={`/contacts?contact=${c.id}`}
                        >
                          <ArrowUpRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Your next connection starts here"
              text="Connect a Facebook Page to bring your first conversations into the workspace."
              action={
                <Link href="/settings" className="btn small">
                  <Plus size={14} /> Connect a Page
                </Link>
              }
            />
          )}
        </Panel>
        <Panel
          title="Up next"
          sub="Keep good things on the calendar"
          action={
            <Link className="icon-btn" href="/meetings">
              <Plus size={18} />
            </Link>
          }
        >
          {upcoming.length ? (
            <div className="meeting-list">
              {upcoming.slice(0, 3).map((m: Meeting) => (
                <div className="mini-meeting" key={m.id}>
                  <div className="date-tile">
                    <small>{fmt(m.starts_at, { month: "short" })}</small>
                    <strong>{fmt(m.starts_at, { day: "numeric" })}</strong>
                  </div>
                  <div>
                    <h4>{m.title}</h4>
                    <small>
                      {fmt(m.starts_at, { hour: "numeric", minute: "2-digit" })}{" "}
                      · {m.timezone}
                    </small>
                    <span>
                      <Users size={12} />{" "}
                      {
                        data.invitations.filter(
                          (i: any) => i.meeting_id === m.id && i.rsvp === "yes",
                        ).length
                      }{" "}
                      confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={CalendarDays}
              title="A little space for possibility"
              text="Create a group meeting and invite your qualified leads."
              action={
                <Link href="/meetings" className="text-link">
                  Plan a meeting <ArrowRight size={14} />
                </Link>
              }
            />
          )}
        </Panel>
      </div>
      <div className="bottom-insights">
        <span>
          <span className="dot" />
          {data.pages.filter((p: any) => p.connected).length} Pages connected
        </span>
        <span>
          <Sparkles size={14} />
          {data.settings[0]?.automation_enabled
            ? "Jev automation is active"
            : "Your playbook is paused"}
        </span>
        <Link href="/settings">
          Manage workspace <ArrowUpRight size={13} />
        </Link>
      </div>
    </>
  );
}
function Contacts({ data, action, busy, inbox }: Props & { inbox: boolean }) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [tag, setTag] = useState(""),
    [page, setPage] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [sort, setSort] = useState("newest"),
    [selected, setSelected] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("contact");
    if (id) setSelected(id);
  }, []);
  const contacts = (data.contacts as Contact[])
    .filter(
      (c) =>
        (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
        (!status || c.status === status) &&
        (!tag || c.tags.includes(tag)) &&
        (!page || c.page_id === page) &&
        (!from || c.first_inquiry_at >= from) &&
        (!to || c.first_inquiry_at <= to + "T23:59:59Z"),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "oldest"
          ? a.first_inquiry_at.localeCompare(b.first_inquiry_at)
          : b.first_inquiry_at.localeCompare(a.first_inquiry_at),
    );
  const tags = Array.from(
    new Set((data.contacts as Contact[]).flatMap((c) => c.tags)),
  );
  const c =
    (data.contacts as Contact[]).find((c) => c.id === selected) ||
    (inbox ? contacts[0] : null);
  function exportCSV() {
    const escape = (v: any) => {
      const text = String(v ?? "");
      return (
        '"' +
        (/^[=+@-]/.test(text) ? "'" : "") +
        text.replaceAll('"', '""') +
        '"'
      );
    };
    const content = [
      [
        "Name",
        "Page",
        "Status",
        "Tags",
        "First inquiry",
        "Last inbound",
        "Opted out",
        "Answers",
        "Details",
        "Notes",
      ],
      ...contacts.map((c) => [
        c.name,
        c.page_id,
        c.status,
        c.tags.join(", "),
        c.first_inquiry_at,
        c.last_inbound_at,
        c.opted_out,
        JSON.stringify(c.answers),
        JSON.stringify(c.details),
        c.notes,
      ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "hustle-contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="filterbar">
        <div className="search-input">
          <Search size={16} />
          <input
            placeholder="Search people by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["new", "incomplete", "review", "qualified", "unqualified"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
        <select
          aria-label="Page"
          value={page}
          onChange={(e) => setPage(e.target.value)}
        >
          <option value="">All Pages</option>
          {data.pages.map((p: any) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
        </select>
        <button className="btn small" onClick={exportCSV}>
          <Download size={14} />
          Export
        </button>
      </div>
      <div className="date-filters">
        <label>
          First inquiry from{" "}
          <input
            aria-label="From date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          to{" "}
          <input
            aria-label="To date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <span>{contacts.length} contacts</span>
      </div>
      <div className={inbox ? "inbox-layout" : "contacts-layout"}>
        <Panel
          title={inbox ? "Conversations" : "Your people"}
          sub={`${contacts.length} connections in this view`}
        >
          {!contacts.length ? (
            <Empty
              title="Meet your future pipeline"
              text="Contacts appear automatically when someone messages a connected Page."
            />
          ) : inbox ? (
            <div className="conversation-list">
              {contacts.map((c) => (
                <button
                  className={
                    "conversation " + (c.id === selected ? "selected" : "")
                  }
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                >
                  <span className="avatar soft">{initials(c.name)}</span>
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      {data.messages.find((m: any) => m.contact_id === c.id)
                        ?.text || "Open conversation"}
                    </small>
                  </div>
                  <span className={"status-dot " + c.status} />
                </button>
              ))}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>STATUS</th>
                    <th>TAGS</th>
                    <th>FIRST INQUIRY</th>
                    <th>LAST MESSAGE</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c.id)}
                      className="clickable"
                    >
                      <td>
                        <div className="person">
                          <span className="avatar soft">
                            {initials(c.name)}
                          </span>
                          <div>
                            {c.name}
                            <small>
                              {
                                data.pages.find((p: any) => p.id === c.page_id)
                                  ?.name
                              }
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge value={c.opted_out ? "opted out" : c.status} />
                      </td>
                      <td>
                        {c.tags.slice(0, 2).map((t) => (
                          <span className="tag" key={t}>
                            {t}
                          </span>
                        ))}
                      </td>
                      <td>
                        {fmt(c.first_inquiry_at, {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>
                        {c.last_inbound_at ? fmt(c.last_inbound_at) : "—"}
                      </td>
                      <td>
                        <ArrowUpRight size={15} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        {c && (
          <div
            className={inbox ? "conversation-detail" : "drawer-backdrop"}
            onClick={!inbox ? () => setSelected("") : undefined}
          >
            <div
              className={!inbox ? "contact-drawer" : ""}
              onClick={(e) => e.stopPropagation()}
            >
              <ContactDetail
                key={
                  c.id +
                  ":" +
                  c.status +
                  ":" +
                  c.human_takeover +
                  ":" +
                  c.opted_out
                }
                contact={c}
                data={data}
                action={action}
                busy={busy}
                close={() => setSelected("")}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
function ContactDetail({
  contact: c,
  data,
  action,
  busy,
  close,
}: Props & { contact: Contact; close: () => void }) {
  const [notes, setNotes] = useState(c.notes),
    [tags, setTags] = useState(c.tags.join(", ")),
    [details, setDetails] = useState(JSON.stringify(c.details, null, 2)),
    [text, setText] = useState(""),
    [media, setMedia] = useState(""),
    [type, setType] = useState("image"),
    [mode, setMode] = useState("standard");
  const messages = data.messages
    .filter((m: any) => m.contact_id === c.id)
    .sort((a: any, b: any) => a.sent_at.localeCompare(b.sent_at));
  const times = bestTimes(
    messages
      .filter((m: any) => m.direction === "in")
      .map((m: any) => m.sent_at),
    c.timezone,
    c.first_inquiry_at,
  );
  return (
    <>
      <div className="detail-header">
        <span className="avatar soft">{initials(c.name)}</span>
        <div>
          <h3>{c.name}</h3>
          <small>{data.pages.find((p: any) => p.id === c.page_id)?.name}</small>
        </div>
        <button className="icon-btn" onClick={close} aria-label="Close contact">
          <X size={18} />
        </button>
      </div>
      <div className="contact-detail-body">
        <div className="contact-status">
          <Badge value={c.status} />
          {c.opted_out && <Badge value="opted out" />}
          <span className="muted">
            {eligibility(c, "standard", false) || "24-hour window open"}
          </span>
        </div>
        <div className="detail-actions">
          <button
            className="btn small"
            disabled={busy}
            onClick={() =>
              action("contact.update", {
                id: c.id,
                human_takeover: !c.human_takeover,
              })
            }
          >
            {c.human_takeover ? <Play size={13} /> : <Pause size={13} />}{" "}
            {c.human_takeover ? "Resume automation" : "Take over"}
          </button>
          <button
            className="btn small danger"
            disabled={busy}
            onClick={() =>
              action("contact.update", { id: c.id, opted_out: !c.opted_out })
            }
          >
            {c.opted_out ? "Restore contact consent" : "Suppress outreach"}
          </button>
        </div>
        <div className="messages">
          {messages.length ? (
            messages.map((m: any) => (
              <div key={m.id} className={"message " + m.direction}>
                <p>{m.text}</p>
                {m.media?.map((a: any, i: number) => (
                  <div key={i}>
                    <span className="media-caption">{a.type || "Media"}</span>
                    {a.payload?.url && (
                      <a href={a.payload.url} target="_blank" rel="noreferrer">
                        Open attachment <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
                <small>
                  {fmt(m.sent_at)} · {m.status}
                </small>
              </div>
            ))
          ) : (
            <p className="muted">No messages yet.</p>
          )}
        </div>
        <form
          className="composer"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await action(
              "message.send",
              {
                contact_id: c.id,
                text,
                media_url: media,
                media_type: type,
                mode,
              },
              "Message sent",
            );
            if (r) {
              setText("");
              setMedia("");
            }
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a personal reply…"
            maxLength={2000}
          />
          <div className="form-row">
            <input
              placeholder="HTTPS media URL (optional)"
              value={media}
              onChange={(e) => setMedia(e.target.value)}
            />
            <select
              aria-label="Media type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {["image", "video", "audio", "file"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="composer-bottom">
            <select
              aria-label="Message route"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="standard">Standard · 24 hours</option>
              <option value="human_agent">Human reply · 7 days</option>
            </select>
            <button
              className="btn primary small"
              disabled={busy || c.opted_out}
            >
              <Send size={14} />
              Send reply
            </button>
          </div>
        </form>
        <UtilityComposer contact={c} action={action} busy={busy} />
        <h4 className="detail-section-title">Qualification review</h4>
        {c.recommendation && (
          <div className="notice">
            <Sparkles size={16} />
            <div>
              Jev recommends:{" "}
              <strong>{String(c.recommendation.decision)}</strong>
              <small>
                Rule version {String(c.recommendation.rule_version)} · Confirm
                after reviewing the answers.
              </small>
            </div>
          </div>
        )}
        <dl className="answer-list">
          {Object.entries(c.answers).map(([key, v]) => (
            <div key={key}>
              <dt>
                {data.settings[0].questions.find((q: Question) => q.id === key)
                  ?.label || key}
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="form-row">
          <button
            className="btn primary small"
            disabled={busy}
            onClick={() =>
              action("contact.update", { id: c.id, status: "qualified" })
            }
          >
            <Check size={14} />
            Confirm qualified
          </button>
          <button
            className="btn small"
            disabled={busy}
            onClick={() =>
              action("contact.update", { id: c.id, status: "unqualified" })
            }
          >
            Mark unqualified
          </button>
        </div>
        <h4 className="detail-section-title">
          Best times to connect{" "}
          <span className="badge">
            {times.confidence === "low" ? "Low data" : "Observed"}
          </span>
        </h4>
        <div className="time-slots">
          {times.slots.map((s) => (
            <span key={s.hour}>{String(s.hour).padStart(2, "0")}:00</span>
          ))}
        </div>
        <small className="muted">
          {times.observations} inbound messages across {times.days} days ·{" "}
          {c.timezone}
        </small>
        <h4 className="detail-section-title">Button activity</h4>
        {(data.tracked_links || [])
          .filter((link: any) => link.contact_id === c.id)
          .map((link: any) => (
            <div className="review-row" key={link.id}>
              <span>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.url}
                </a>
                <small>
                  {link.last_clicked_at
                    ? fmt(link.last_clicked_at)
                    : "No click recorded"}
                </small>
              </span>
              <span className="badge">{link.clicks} clicks</span>
            </div>
          ))}
        <h4 className="detail-section-title">Contact details</h4>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const parsed = JSON.parse(details);
              if (
                !parsed ||
                Array.isArray(parsed) ||
                typeof parsed !== "object"
              )
                throw new Error();
              action("contact.update", {
                id: c.id,
                notes,
                tags: tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                details: parsed,
              });
            } catch {
              alert("Details must be a JSON object with text values.");
            }
          }}
        >
          <Field label="Tags" hint="Separate custom tags with commas">
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <ContactFields
            value={JSON.parse(details)}
            onChange={(value) => setDetails(JSON.stringify(value))}
          />
          <button className="btn small" disabled={busy}>
            Save contact details
          </button>
        </form>
      </div>
    </>
  );
}
