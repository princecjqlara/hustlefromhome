"use client";
import { useState } from "react";
import Link from "next/link";
import ButtonEditor, { type MessageButton } from "./buttons";
import {
  PanelsTopLeft as Facebook,
  Plus,
  Copy,
  ExternalLink,
  Send,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { UtilityTemplates } from "./utility";
import type { Contact } from "@/lib/types";
type Props = {
  data: Record<string, any>;
  action: (name: string, data?: any, message?: string) => Promise<any>;
  busy: boolean;
};
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Panel({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
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
export function Campaigns({ data, action, busy }: Props) {
  const [form, setForm] = useState({
      name: "",
      text: "",
      media_url: "",
      media_type: "image",
      mode: "standard",
      buttons: [] as MessageButton[],
      filter: {
        page_id: "",
        tag: "",
        status: "",
        from: "",
        to: "",
        search: "",
      },
    }),
    [preview, setPreview] = useState<any>(null);
  const change = (p: any) => {
    setForm({ ...form, ...p });
    setPreview(null);
  };
  const tags = Array.from(
    new Set((data.contacts as Contact[]).flatMap((c) => c.tags)),
  );
  return (
    <div className="editor-layout">
      <div>
        <Panel
          title="Compose a campaign"
          sub="Preview eligibility before you send. Each recipient is checked again at dispatch."
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const p = await action("campaign.preview", form, "");
              setPreview(p);
            }}
          >
            <Field label="Campaign name">
              <input
                required
                value={form.name}
                onChange={(e) => change({ name: e.target.value })}
              />
            </Field>
            <Field label="Message">
              <textarea
                placeholder="Write something worth sharing…"
                maxLength={2000}
                value={form.text}
                onChange={(e) => change({ text: e.target.value })}
              />
            </Field>
            <div className="form-row">
              <Field label="Media URL">
                <input
                  type="url"
                  placeholder="https://…"
                  value={form.media_url}
                  onChange={(e) => change({ media_url: e.target.value })}
                />
              </Field>
              <Field label="Media type">
                <select
                  value={form.media_type}
                  onChange={(e) => change({ media_type: e.target.value })}
                >
                  {["image", "video", "audio", "file"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <ButtonEditor
              value={form.buttons}
              onChange={(buttons) => change({ buttons })}
            />
            <Field label="Sending route">
              <select
                value={form.mode}
                onChange={(e) => change({ mode: e.target.value })}
              >
                <option value="standard">
                  Standard messaging · eligible 24-hour window
                </option>
                <option value="utility">
                  Utility template · access not activated
                </option>
                <option value="marketing">
                  Marketing messages · access not activated
                </option>
              </select>
            </Field>
            <h4 className="detail-section-title">Choose your audience</h4>
            <div className="form-row">
              <Field label="Page">
                <select
                  value={form.filter.page_id}
                  onChange={(e) =>
                    change({
                      filter: { ...form.filter, page_id: e.target.value },
                    })
                  }
                >
                  <option value="">All Pages</option>
                  {data.pages.map((p: any) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tag">
                <select
                  value={form.filter.tag}
                  onChange={(e) =>
                    change({ filter: { ...form.filter, tag: e.target.value } })
                  }
                >
                  <option value="">All tags</option>
                  {tags.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.filter.status}
                  onChange={(e) =>
                    change({
                      filter: { ...form.filter, status: e.target.value },
                    })
                  }
                >
                  <option value="">All statuses</option>
                  {[
                    "new",
                    "incomplete",
                    "review",
                    "qualified",
                    "unqualified",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label="First inquiry from">
                <input
                  type="date"
                  value={form.filter.from}
                  onChange={(e) =>
                    change({ filter: { ...form.filter, from: e.target.value } })
                  }
                />
              </Field>
              <Field label="Through">
                <input
                  type="date"
                  value={form.filter.to.slice(0, 10)}
                  onChange={(e) =>
                    change({
                      filter: {
                        ...form.filter,
                        to: e.target.value ? e.target.value + "T23:59:59Z" : "",
                      },
                    })
                  }
                />
              </Field>
              <Field label="Name contains">
                <input
                  value={form.filter.search}
                  onChange={(e) =>
                    change({
                      filter: { ...form.filter, search: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <button className="btn" disabled={busy}>
              Preview audience <Sparkles size={15} />
            </button>
            {preview && (
              <div className="campaign-preview">
                <div className="metric-grid compact">
                  {[
                    ["Matched", preview.total],
                    ["Eligible", preview.eligible],
                    ["Blocked / suppressed", preview.blocked],
                  ].map(([label, n]) => (
                    <div className="mini-metric" key={label}>
                      <strong>{n}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn primary"
                  disabled={
                    busy || !preview.eligible || form.mode !== "standard"
                  }
                  onClick={async () => {
                    const r = await action(
                      "campaign.send",
                      form,
                      "Campaign queued",
                    );
                    if (r) setPreview(null);
                  }}
                >
                  <Send size={15} />
                  Queue for {preview.eligible} eligible contacts
                </button>
              </div>
            )}
          </form>
        </Panel>
        <Panel
          title="Campaign history"
          sub="Queued messages remain subject to eligibility at the moment of sending."
        >
          {data.campaigns.length ? (
            data.campaigns.map((c: any) => (
              <div className="review-row" key={c.id}>
                <span>
                  {c.name}
                  <small>{new Date(c.created_at).toLocaleString()}</small>
                </span>
                <span className="badge">
                  {
                    data.jobs.filter(
                      (j: any) =>
                        j.action_key?.startsWith("campaign:" + c.id) &&
                        j.status === "done",
                    ).length
                  }{" "}
                  sent
                </span>
              </div>
            ))
          ) : (
            <p className="muted">Your first campaign will appear here.</p>
          )}
        </Panel>
      </div>
      <div className="guide-card">
        <Send size={24} />
        <h3>
          Relevant.
          <br />
          Timely.
          <br />
          Welcome.
        </h3>
        <p>
          Bulk sending uses eligible automation routes. The Human Agent tag is
          reserved for a person replying individually to an inquiry.
        </p>
        <p>Contacts who opted out are excluded automatically.</p>
      </div>
    </div>
  );
}
export function Advertising({ data, action, busy }: Props) {
  const [from, setFrom] = useState(
      new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const rows = data.ad_daily.filter((a: any) => a.date >= from && a.date <= to);
  const groups = Object.values(
    rows.reduce((out: any, r: any) => {
      const key = r.ad_id;
      out[key] ||= { ...r, spend: 0 };
      out[key].spend += Number(r.spend);
      return out;
    }, {}),
  ) as any[];
  const demographics: Record<string, Record<string, number>> = {};
  for (const c of data.contacts as Contact[]) {
    for (const [k, v] of Object.entries(c.details)) {
      demographics[k] ||= {};
      demographics[k][v] = (demographics[k][v] || 0) + 1;
    }
  }
  return (
    <>
      <div className="filterbar">
        <label>
          From{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          to{" "}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="btn primary small"
          disabled={busy || !data.ad_accounts.length}
          onClick={() => action("ads.sync", { from, to }, "Ad insights synced")}
        >
          <RefreshCw size={14} />
          Sync Meta insights
        </button>
        <span className="muted">
          {data.ad_accounts.length} ad accounts connected
        </span>
      </div>
      <Panel
        title="Ad performance"
        sub="Spend divided by distinct attributed contacts first inquiring in the selected date range."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>AD / CAMPAIGN</th>
                <th>SPEND</th>
                <th>INQUIRIES</th>
                <th>QUALIFIED</th>
                <th>COST / INQUIRY</th>
                <th>COST / QUALIFIED</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((a) => {
                const contacts = data.contacts.filter(
                  (c: Contact) =>
                    c.ad_id === a.ad_id &&
                    c.first_inquiry_at >= from &&
                    c.first_inquiry_at <= to + "T23:59:59Z",
                );
                const qualified = contacts.filter(
                  (c: Contact) => c.status === "qualified",
                ).length;
                const money = (v: number) =>
                  new Intl.NumberFormat("en", {
                    style: "currency",
                    currency: a.currency || "PHP",
                  }).format(v);
                return (
                  <tr key={a.ad_id}>
                    <td>
                      <strong>{a.ad_name || a.ad_id}</strong>
                      <small>{a.campaign_name}</small>
                    </td>
                    <td>{money(a.spend)}</td>
                    <td>{contacts.length}</td>
                    <td>{qualified}</td>
                    <td>
                      {contacts.length ? money(a.spend / contacts.length) : "—"}
                    </td>
                    <td>{qualified ? money(a.spend / qualified) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!groups.length && (
            <div className="empty">
              <span className="empty-icon">
                <Sparkles size={24} />
              </span>
              <h3>Follow the source of opportunity</h3>
              <p>
                Connect Facebook with ads_read access, then sync your spend. New
                ad referrals are captured automatically when Meta provides them.
              </p>
              <a href="/api/facebook/connect" className="btn small">
                <Facebook size={15} />
                Connect Facebook
              </a>
            </div>
          )}
        </div>
        <div className="notice">
          {data.contacts.filter((c: Contact) => !c.ad_id).length} contacts have
          no captured ad attribution. Historical sources may be unavailable.
        </div>
      </Panel>
      <Panel
        title="Contact demographics & details"
        sub="Only fields explicitly provided by contacts or entered by your team. No demographic inference."
      >
        {Object.keys(demographics).length ? (
          <div className="demographic-grid">
            {Object.entries(demographics).map(([field, values]) => (
              <div key={field}>
                <h4>{field}</h4>
                {Object.entries(values)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([label, n]) => (
                    <div className="review-row" key={label}>
                      {label}
                      <strong>{n}</strong>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Collected custom details will appear here as your contacts grow.
          </p>
        )}
      </Panel>
    </>
  );
}
export function SettingsPage({ data, action, busy }: Props) {
  const [secrets, setSecrets] = useState<any>(null),
    [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="settings-grid">
      <div>
        <Panel
          title="Facebook Pages"
          sub="One business. Every Page, connected."
          action={
            <a className="btn primary small" href="/api/facebook/connect">
              <Plus size={14} />
              Connect Facebook
            </a>
          }
        >
          {data.pending_pages?.length > 0 && (
            <div className="notice page-selector">
              <h4>Choose Pages to connect</h4>
              {data.pending_pages.map((p: any) => (
                <label key={p.id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.id]
                          : selected.filter((id) => id !== p.id),
                      )
                    }
                  />
                  {p.name}
                </label>
              ))}
              <button
                className="btn primary small"
                disabled={busy || !selected.length}
                onClick={() =>
                  action("page.select", { ids: selected }, "Pages connected")
                }
              >
                Connect selected Pages
              </button>
            </div>
          )}
          {data.pages.length ? (
            data.pages.map((p: any) => (
              <div className="connected-page" key={p.id}>
                <span className="facebook-icon">
                  <Facebook size={21} />
                </span>
                <div>
                  <h4>{p.name}</h4>
                  <small>Page ID {p.id}</small>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(p.capabilities?.human_agent)}
                      disabled={busy}
                      onChange={(e) =>
                        action("page.update", {
                          id: p.id,
                          connected: p.connected,
                          human_agent: e.target.checked,
                        })
                      }
                    />
                    Human Agent access approved in Meta
                  </label>
                </div>
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() =>
                    action("page.update", {
                      id: p.id,
                      connected: !p.connected,
                      human_agent: Boolean(p.capabilities?.human_agent),
                    })
                  }
                >
                  {p.connected ? "Pause" : "Reconnect"}
                </button>
              </div>
            ))
          ) : (
            <div className="empty">
              <span className="empty-icon">
                <Facebook size={26} />
              </span>
              <h3>Bring your conversations home</h3>
              <p>
                Authorize Facebook, choose the Pages you manage, and start
                receiving inquiries in one inbox.
              </p>
            </div>
          )}
          <div className="notice">
            <AlertCircle size={17} />
            <div>
              Start with app-role testers in development mode.
              <small>
                Real customer messaging requires the appropriate access,
                permissions, and Meta approval.
              </small>
            </div>
          </div>
        </Panel>
        <Panel
          title="Integration endpoints"
          sub="Copy these into Meta Developers and cron-job.org."
        >
          {[
            ["Facebook webhook", data.integration.webhook_url],
            ["OAuth redirect URI", data.integration.callback_url],
            [
              "Cron endpoint · GET or POST every minute",
              data.integration.cron_url,
            ],
          ].map(([label, value]) => (
            <Field key={label} label={label}>
              <div className="copy-field">
                <input readOnly value={value} />
                <button
                  className="icon-btn"
                  title="Copy URL"
                  onClick={() => navigator.clipboard.writeText(value)}
                >
                  <Copy size={15} />
                </button>
              </div>
            </Field>
          ))}
          <p className="muted">
            Cron jobs use GET or POST with no headers or login credentials.
          </p>
          <button
            className="btn small"
            disabled={busy}
            onClick={async () => {
              const d = await action("integration.credentials", {}, "");
              if (d) setSecrets(d);
            }}
          >
            Reveal webhook verify token
          </button>
          {secrets && (
            <div className="credentials">
              <Field label="Webhook verify token">
                <div className="copy-field">
                  <input
                    readOnly
                    type="password"
                    value={secrets.verify_token}
                  />
                  <button
                    className="icon-btn"
                    title="Copy verification token"
                    onClick={() =>
                      navigator.clipboard.writeText(secrets.verify_token)
                    }
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </Field>
              <button className="text-link" onClick={() => setSecrets(null)}>
                Hide verification token
              </button>
            </div>
          )}
        </Panel>
        <UtilityTemplates data={data} action={action} busy={busy} />
        <Panel
          title="Recent workspace activity"
          sub="Changes and integration events from your audit trail."
        >
          <div className="audit-list">
            {data.audit_log.slice(0, 15).map((a: any) => (
              <div className="review-row" key={a.id}>
                <span>
                  {a.action}
                  <small>{new Date(a.created_at).toLocaleString()}</small>
                </span>
                <span className="muted">
                  {a.actor === "system" ? "System" : "Administrator"}
                </span>
              </div>
            ))}
            {!data.audit_log.length && (
              <p className="muted">
                Activity appears as your team uses the workspace.
              </p>
            )}
          </div>
        </Panel>
      </div>
      <aside>
        <div className="guide-card">
          <Link2Icon />
          <h3>
            A connected
            <br />
            workspace.
          </h3>
          <p>1. Register the OAuth redirect URI in Meta Developers.</p>
          <p>2. Configure your webhook URL and verify token.</p>
          <p>3. Authorize and select your Pages.</p>
          <p>
            4. Add a cron-job.org GET or POST job without headers or
            credentials.
          </p>
          <p>5. Configure your playbook and enable automation.</p>
          <Link href="/questionnaire" className="text-link">
            Build your playbook →
          </Link>
        </div>
        <Panel title="Runtime configuration">
          <dl className="runtime">
            <div>
              <dt>Facebook app</dt>
              <dd>{data.integration.app_id}</dd>
            </div>
            <div>
              <dt>Graph API</dt>
              <dd>{data.integration.graph_version}</dd>
            </div>
            <div>
              <dt>Decision model</dt>
              <dd>{data.integration.jev_model}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>Single business · multiple Pages</dd>
            </div>
            <div>
              <dt>Automation</dt>
              <dd>
                {data.settings[0].automation_enabled ? "Active" : "Paused"}
              </dd>
            </div>
          </dl>
        </Panel>
      </aside>
    </div>
  );
}
function Link2Icon() {
  return <ExternalLink size={24} />;
}
