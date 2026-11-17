"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  MessageCircle,
  CalendarDays,
  Check,
} from "lucide-react";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="login">
      <section className="login-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <ArrowUpRight size={25} />
          </span>
          <span>
            hustle<span className="brand-light">fromhome</span>
            <small>RECRUITING WORKSPACE</small>
          </span>
        </a>
        <div>
          <span className="eyebrow">GOOD CONVERSATIONS. GREAT PEOPLE.</span>
          <h1>
            Your next great hire
            <br />
            starts with a hello<span>.</span>
          </h1>
          <p>
            Bring your Pages, conversations, and recruiting workflow together.
            Spend less time following up and more time moving people forward.
          </p>
          <div className="login-features">
            {[
              [MessageCircle, "Every conversation, connected"],
              [Sparkles, "Thoughtful decisions with Jev"],
              [CalendarDays, "From first hello to first meeting"],
            ].map(([Icon, label]: any) => (
              <div key={label}>
                <Icon size={20} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <small>Built for the people behind the opportunities.</small>
      </section>
      <section className="login-form">
        <span className="pill">
          <span className="dot" /> YOUR BUSINESS, IN SYNC
        </span>
        <h2>Welcome back.</h2>
        <p>Sign in to your recruiting workspace.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: String(f.get("email") || "").trim(),
                  password: f.get("password"),
                }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              location.href = "/overview";
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label>
            Password
            <div className="password-input">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary" disabled={busy}>
            {busy ? "Signing in…" : "Open my workspace"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="login-trust">
          <Check size={15} /> Secure access. Your team’s data stays private.
        </div>
      </section>
    </main>
  );
}
