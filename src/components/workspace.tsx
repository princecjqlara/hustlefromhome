"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  LayoutDashboard,
  MessageSquare,
  Users,
  ListChecks,
  BookOpen,
  GitBranch,
  Clock,
  CalendarDays,
  Send,
  BarChart3,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Plus,
  ArrowRight,
} from "lucide-react";
const groups = [
  {
    title: "WORKSPACE",
    items: [
      ["overview", "Overview", LayoutDashboard],
      ["inbox", "Inbox", MessageSquare],
      ["contacts", "Contacts", Users],
    ],
  },
  {
    title: "YOUR PLAYBOOK",
    items: [
      ["questionnaire", "Questionnaire", ListChecks],
      ["faq", "Saved answers", BookOpen],
      ["qualification", "Qualification", GitBranch],
      ["followups", "Follow-ups", Clock],
    ],
  },
  {
    title: "ENGAGE & GROW",
    items: [
      ["meetings", "Meetings", CalendarDays],
      ["calendar", "Activity calendar", CalendarDays],
      ["campaigns", "Campaigns", Send],
      ["advertising", "Ad performance", BarChart3],
    ],
  },
];
export default function Workspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <button
        className="mobile-menu icon-btn"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <Link className="brand" href="/overview">
          <span className="brand-icon">
            <ArrowUpRight size={23} />
          </span>
          <span>
            hustle<span className="brand-light">fromhome</span>
            <small>RECRUITING WORKSPACE</small>
          </span>
        </Link>
        <div className="business-switch">
          <span className="business-avatar">H</span>
          <div>
            Hustle From Home<small>Business workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav>
          {groups.map((g) => (
            <div className="nav-group" key={g.title}>
              <div className="nav-label">{g.title}</div>
              {g.items.map(([key, label, Icon]: any) => (
                <Link
                  onClick={() => setOpen(false)}
                  className={"nav-item " + (path === "/" + key ? "active" : "")}
                  href={"/" + key}
                  key={key}
                >
                  <Icon size={18} strokeWidth={1.7} />
                  {label}
                  {key === "inbox" && <span className="nav-badge">LIVE</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>
              <span className="dot" /> A LITTLE MORE HUMAN
            </span>
            <p>
              Let the workflow do the work.
              <br />
              You make the connection.
            </p>
            <Link href="/settings">
              Set up your workspace <ArrowRight size={14} />
            </Link>
          </div>
          <Link
            className={"nav-item " + (path === "/settings" ? "active" : "")}
            href="/settings"
          >
            <Settings size={18} />
            Settings & connections
          </Link>
          <div className="profile">
            <span className="avatar">CJ</span>
            <div>
              Prince CJ Lara<small>Workspace admin</small>
            </div>
            <button
              className="icon-btn"
              title="Sign out"
              onClick={async () => {
                await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ logout: true }),
                });
                location.href = "/login";
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="slash">/</span>
            {(groups
              .flatMap((g) => g.items)
              .find((i) => "/" + i[0] === path)?.[1] as string) || "Settings"}
          </div>
          <div className="topbar-right">
            <span className="timezone">Asia/Manila</span>
            <span className="top-status">
              <span className="dot" /> Your recruiting workspace
            </span>
            <Link href="/meetings" className="btn small">
              <Plus size={15} /> Create meeting
            </Link>
          </div>
        </header>
        {children}
        <footer className="app-footer">
          <span>
            Hustle From Home{" "}
            <span className="muted">/ A little more connected.</span>
          </span>
          <span>
            <span className="dot" /> Powered by your playbook + Jev
          </span>
        </footer>
      </div>
    </div>
  );
}
