import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Plus,
  Search,
  Bell,
  ArrowUpRight,
  Menu,
  X,
  CalendarDays,
  Clock3,
  CheckCircle2,
  CircleUserRound,
  Send,
} from "lucide-react";
import "./style.css";
import "./auth-fixes.css";
import "./mobile-fixes.css";
import SonoLogo from "./assets/SonoLogoF.png";
import Cropper from "react-easy-crop";

const API =
  import.meta.env.VITE_API_URL ||
  "https://sonoslogbookwebapp-production.up.railway.app/api";
const PHILIPPINES_TIMEZONE = "Asia/Manila";
const manilaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILIPPINES_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const manilaDateKeyOffset = (days) => {
  const date = new Date(`${manilaDateKey()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const emptyLogs = [];
const defaultProfileImage = "https://cdn.phototourl.com/free/2026-09-22-5a80ed76-cc8f-4016-abd2-1326314af37b.jpg";
const defaultTheme = {
  accent: "#d7f56a",
  background: "linear-gradient(135deg, #0d1117 0%, #17242a 100%)",
};
const themeKey = (userId) => `sono_theme_${userId}`;
const imageUrl = (path) => {
  if (!path) return "";
  if (path.includes("SonoDefaultbald.jpg")) return defaultProfileImage;
  if (/^https?:\/\//i.test(path)) return path;
  const publicPath = path.startsWith('/api/') ? path.slice(4) : path;
  return `${API.replace('/api', '')}${publicPath}`;
};
const formatTime = (time) => { if (!time) return '--'; const [hours, minutes] = time.slice(0, 5).split(':'); const hour = Number(hours) % 12 || 12; return `${hour}:${minutes} ${Number(hours) >= 12 ? 'PM' : 'AM'}`; };
function getTheme(userId) {
  if (!userId) return defaultTheme;
  try {
    return { ...defaultTheme, ...JSON.parse(localStorage.getItem(themeKey(userId)) || "{}") };
  } catch {
    return defaultTheme;
  }
}
function applyTheme(theme) {
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--app-background", theme.background);
}
async function getCroppedImage(imageSrc, pixelCrop) {
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = imageSrc; });
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext("2d"); context.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 512, 512);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

async function request(path, options = {}) {
  const headers =
    options.body instanceof FormData
      ? { ...(options.headers || {}) }
      : { "Content-Type": "application/json", ...(options.headers || {}) };
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false)
    throw new Error(data.message || "Unable to connect to the server.");
  return data;
}
async function logoutSession() {
  await request("/auth/logout.php", { method: "POST" }).catch(() => {});
  localStorage.removeItem("logbook_user");
  window.location.reload();
}
function useAuth() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("logbook_user") || "null"),
  );
  return {
    user,
    login: (value) => {
      localStorage.setItem("logbook_user", JSON.stringify(value));
      setUser(value);
    },
    logout: () => {
      localStorage.removeItem("logbook_user");
      setUser(null);
    },
  };
}

function PhilippinesClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="philippines-clock" title="Philippine Standard Time">
      <Clock3 size={15} />
      <span>
        {now.toLocaleTimeString("en-PH", {
          timeZone: PHILIPPINES_TIMEZONE,
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
      <small>PHT</small>
    </div>
  );
}

function AuthPage({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("message");
    if (googleError) setError(googleError);
    request("/auth/me.php")
      .then((data) => onLogin(data.data.user))
      .catch(() => {});
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await request(
        register ? "/auth/register.php" : "/auth/login.php",
        {
          method: "POST",
          body: JSON.stringify(
            register
              ? form
              : { identifier: form.email, password: form.password },
          ),
        },
      );
      onLogin(data.data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="auth-shell">
      <section className="auth-art">
        <div className="brand">
          <img className="brand-logo" src={SonoLogo} alt="" />
          <span className="brand-name">Sono</span>
        </div>
        <div className="art-copy">
          <span className="eyebrow">YOUR WORK. YOUR LOG.</span>
          <h1>Keep track. Stay locked in.</h1>
          <p>
            Log what you did, when you did it, and what’s next. Sono keeps your
            work organized without making it feel like work.
          </p>
        </div>
        <div className="art-footer">
          Digital work record management <span>DevXaris</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <div className="mobile-brand brand">
            <img className="brand-logo" src={SonoLogo} alt="" />
            <span className="brand-name">Sono</span>
          </div>
          <span className="eyebrow">
            {register ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}
          </span>
          <h2>
            {register ? "Start your work record." : "Pick up where you left off."}
          </h2>
          <p className="muted">
            {register
              ? "A focused space for your daily record."
              : "Sign in to access your activity and insights."}
          </p>
          {error && <div className="alert">{error}</div>}
          <form onSubmit={submit}>
            {register && (
              <>
                <label>
                  Full name
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Username
                  <input
                    required
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            <label>
              Email or username
              <input
                required
                type={register ? "email" : "text"}
                pattern={register ? ".+@gmail\\.com$" : undefined}
                title={register ? "Use a Gmail address ending in @gmail.com." : undefined}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Password
              <input
                required
                minLength="8"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            {register && (
              <label>
                Confirm password
                <input
                  required
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) =>
                    setForm({ ...form, confirm_password: e.target.value })
                  }
                />
              </label>
            )}
            <button className="primary wide" disabled={loading}>
              {loading ? "Working..." : register ? "Create account" : "Sign in"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>

          <div className="divider"><span>or continue with</span></div>
          <button
            type="button"
            className="secondary wide google-button"
            onClick={() => {
              window.location.href = `${API}/auth/google.php`;
            }}
          >
            <span className="google-mark">G</span>
            {register ? "Continue with Google" : "Sign in with Google"}
          </button>

          <div className="auth-switch">
            {register ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create account"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Shell({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const location = useLocation();
  const admin = user?.role === "admin";
  const links = admin
    ? [
        ["/admin", "Overview", LayoutDashboard],
        ["/admin/logs", "All logs", ClipboardList],
        ["/admin/users", "People", Users],
        ["/settings", "Settings", Settings],
      ]
    : [
        ["/dashboard", "Overview", LayoutDashboard],
        ["/logs", "My records", ClipboardList],
        ["/profile", "Profile", CircleUserRound],
        ["/settings", "Settings", Settings],
      ];
  return (
    <div className="app-shell">
      {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand brand">
          <img className="brand-logo" src={SonoLogo} alt="" />
          <span className="brand-name">Sono</span>
          <button
            className="icon-button close-menu"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          <span>WORKSPACE</span>
          <strong>{admin ? "Operations" : "Personal log"}</strong>
        </div>
        <nav>
          {links.map(([to, label, Icon]) => (
            <Link
              key={to}
              className={location.pathname === to ? "active" : ""}
              to={to}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar"><img src={imageUrl(user?.profile_image || defaultProfileImage)} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = imageUrl(defaultProfileImage); }} /></div>
          <div className="user-mini">
            <strong>{user?.full_name || "Demo User"}</strong>
            <small>{admin ? "Administrator" : "Member"}</small>
          </div>
          <button className="icon-button" onClick={() => setConfirmLogout(true)} title="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="page">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="crumb">
            {admin ? "Operations" : "My workspace"} <span>/</span>{" "}
            <strong>
              {location.pathname.split("/").filter(Boolean).pop() ||
                "dashboard"}
            </strong>
          </div>
          <div className="top-actions">
            <PhilippinesClock />
            <NotificationCenter user={user} />
            <Link to="/profile" className="avatar small" title="Open profile">
              <img src={imageUrl(user?.profile_image || defaultProfileImage)} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = imageUrl(defaultProfileImage); }} />
            </Link>
          </div>
        </header>
        {children}
        {confirmLogout && (
          <div className="modal-backdrop">
            <div className="modal logout-confirm" role="dialog" aria-modal="true" aria-labelledby="logout-title">
              <span className="eyebrow">SIGN OUT</span>
              <h3 id="logout-title">Log out of Sono?</h3>
              <p className="muted">Your saved records will stay safe. You can sign in again anytime.</p>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setConfirmLogout(false)}>Cancel</button>
                <button className="primary" onClick={onLogout}>Log out <LogOut size={16} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stats({ logs, admin, adminStats }) {
  const today = manilaDateKey();
  const total = admin ? adminStats.logs : logs.length;
  const todayTotal = admin
    ? adminStats.today
    : logs.filter((log) => log.log_date === today).length;
  return (
    <div className="stats-grid">
      <Stat
        label={admin ? "Total users" : "Total logs"}
        value={admin ? adminStats.users : total}
        note={admin ? `${adminStats.active} active` : "Saved entries"}
      />
      <Stat label="Today" value={todayTotal} note="Saved entries" />
      <Stat
        label="This week"
        value={
          admin
            ? adminStats.week
            : logs.filter(
                (log) =>
                  log.log_date >= manilaDateKeyOffset(-6),
              ).length
        }
        note="Saved entries"
      />
      <Stat
        label="This month"
        value={
          admin
            ? adminStats.month
            : logs.filter(
                (log) => log.log_date?.slice(0, 7) === today.slice(0, 7),
              ).length
        }
        note="Saved entries"
      />
    </div>
  );
}
function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [people, setPeople] = useState([]);
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    notify_all: true,
    user_ids: [],
  });
  const unread = notifications.filter((item) => !item.read_at).length;
  const load = () =>
    request("/notifications.php")
      .then((data) => setNotifications(data.data?.notifications || []))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const markRead = (id) =>
    request("/notifications.php", {
      method: "PATCH",
      body: JSON.stringify({ id }),
    }).then(load);
  const send = async (e) => {
    e.preventDefault();
    await request("/notifications.php", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setCompose(false);
    setOpen(false);
    setForm({ title: "", message: "", notify_all: true, user_ids: [] });
  };
  const openComposer = () => {
    request("/admin/users.php").then((data) =>
      setPeople(data.data?.users || []),
    );
    setCompose(true);
  };
  return (
    <div className="notification-wrap">
      <button
        className="icon-button notification-button"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && <span className="notification-count">{unread}</span>}
      </button>
      {open && (
        <div className="notification-popover">
          <div className="notification-head">
            <div>
              <span className="eyebrow">INBOX</span>
              <h3>Notifications</h3>
            </div>
            <div className="notification-head-actions">
              {user.role === "admin" && (
                <button className="secondary compact" onClick={openComposer}>
                  <Send size={14} /> Notify
                </button>
              )}
              <button
                className="icon-button"
                onClick={() => setOpen(false)}
                title="Close notifications"
                aria-label="Close notifications"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {notifications.map((item) => (
            <button
              className={
                item.read_at ? "notification-item read" : "notification-item"
              }
              key={item.id}
              onClick={() => markRead(item.id)}
            >
              <strong>{item.title}</strong>
              <span>{item.message}</span>
              <small>{new Date(item.created_at).toLocaleString("en-PH", { timeZone: PHILIPPINES_TIMEZONE })}</small>
            </button>
          ))}
          {!notifications.length && (
            <div className="empty">No notifications yet.</div>
          )}
        </div>
      )}
      {compose && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="panel-head">
              <div>
                <span className="eyebrow">ADMIN BROADCAST</span>
                <h3>Send a notification</h3>
              </div>
              <button className="icon-button" onClick={() => setCompose(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={send}>
              <label>
                Title
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                Message
                <textarea
                  required
                  rows="4"
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.notify_all}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notify_all: e.target.checked,
                      user_ids: [],
                    })
                  }
                />{" "}
                Send to everyone
              </label>
              {!form.notify_all && (
                <label>
                  Choose recipients
                  <select
                    multiple
                    value={form.user_ids.map(String)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        user_ids: Array.from(
                          e.target.selectedOptions,
                          (option) => Number(option.value),
                        ),
                      })
                    }
                  >
                    {people
                      .filter((person) => person.id !== user.id)
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name} ({person.email})
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setCompose(false)}
                >
                  Cancel
                </button>
                <button className="primary">
                  <Send size={16} /> Send notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function LogTable({ logs, onAdd, onEdit, onDelete, showOwner = false }) {
  return (
    <section className="panel log-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">RECENT ACTIVITY</span>
          <h3>Latest log entries</h3>
        </div>
        <button className="secondary" onClick={onAdd}>
          <Plus size={16} /> Add entry
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title / activity</th>
              {showOwner && <th>User</th>}
              <th>Location</th>
              <th>Category</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  <strong>{log.log_date}</strong>
                  <small>
                    {formatTime(log.time_in)} - {formatTime(log.time_out)}
                  </small>
                </td>
                <td><strong>{log.title || "Untitled"}</strong><small>{log.activity}</small></td>
                {showOwner && <td className="log-owner"><strong>{log.full_name}</strong><small>@{log.username}</small></td>}
                <td>{log.location || "—"}</td>
                <td>
                  <span className="category">{log.category}</span>
                </td>
                <td>
                  <span className={`status ${log.status.toLowerCase()}`}>
                    {log.status}
                  </span>
                </td>
                <td>
                  <button className="icon-button" onClick={() => onEdit(log)} title="Edit entry">
                    <ArrowUpRight size={16} />
                  </button>
                  <button className="icon-button danger-icon" onClick={() => onDelete(log)} title="Delete entry"> <X size={16} /> </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!logs.length && (
        <div className="empty">No entries yet. Start with your first log.</div>
      )}
    </section>
  );
}
function Dashboard({ user }) {
  const [logs, setLogs] = useState(emptyLogs);
  const [adminStats, setAdminStats] = useState({
    users: 0,
    active: 0,
    logs: 0,
    today: 0,
    week: 0,
    month: 0,
  });
  const [showAdd, setShowAdd] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      request("/logs/list.php"),
      user?.role === "admin"
        ? request("/admin/stats.php")
        : Promise.resolve({ data: { stats: adminStats } }),
    ])
      .then(([logData, statsData]) => {
        setLogs(logData.data?.logs || []);
        setAdminStats(statsData.data?.stats || adminStats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user?.role]);
  const saveLog = async (log) => {
    try {
      const data = await request("/logs/create.php", {
        method: "POST",
        body: JSON.stringify(log),
      });
      setLogs([{ ...log, id: data.data.id }, ...logs]);
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    }
  };
  const updateLog = async (log) => { try { await request("/logs/update.php", { method: "PUT", body: JSON.stringify(log) }); setLogs(logs.map((item) => item.id === log.id ? log : item)); setEditingLog(null); } catch (err) { setError(err.message); } };
  const deleteLog = async (log) => { if (!window.confirm(`Delete "${log.title || log.activity}"? This cannot be undone.`)) return; try { await request("/logs/delete.php", { method: "DELETE", body: JSON.stringify({ id: log.id }) }); setLogs(logs.filter((item) => item.id !== log.id)); } catch (err) { setError(err.message); } };
  const dayCounts = Array.from({ length: 7 }, (_, index) => { const key = manilaDateKeyOffset(index - 6); const label = new Date(`${key}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: PHILIPPINES_TIMEZONE, weekday: "short" }).slice(0, 1); return { label, count: logs.filter((log) => log.log_date === key).length }; });
  return (
    <Shell
      user={user}
      onLogout={logoutSession}
    >
      <main className="content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {new Date().toLocaleDateString("en-PH", { timeZone: PHILIPPINES_TIMEZONE,
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <h1>
              {user?.role === "admin"
                ? "Good morning, admin."
                : "Good morning, " +
                  (user?.full_name?.split(" ")[0] || "there") +
                  "."}
            </h1>
            <p className="muted">
              {loading
                ? "Loading your saved activity."
                : "Here is the shape of your work today."}
            </p>
          </div>
          <button className="primary" onClick={() => setShowAdd(true)}>
            <Plus size={17} /> Add log
          </button>
        </div>
        {error && <div className="alert">{error}</div>}
        <Stats
          logs={logs}
          admin={user?.role === "admin"}
          adminStats={adminStats}
        />
        <div className="content-grid">
          <LogTable logs={logs} onAdd={() => setShowAdd(true)} onEdit={setEditingLog} onDelete={deleteLog} showOwner={user?.role === "admin"} />
          <section className="panel insight">
            <div className="panel-head">
              <div>
                <span className="eyebrow">AT A GLANCE</span>
                <h3>Activity rhythm</h3>
              </div>
              <CalendarDays size={20} />
            </div>
            {logs.length ? (
              <div className="bars">
                {dayCounts.map((day) => (
                  <div className="bar-col" key={day.label}>
                    <div className="bar" style={{ height: `${day.count ? Math.max(12, Math.min(100, day.count * 25)) : 4}%` }}></div>
                    <small>{day.label}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                Your activity rhythm will appear after you save a log.
              </div>
            )}
            <div className="insight-footer">
              <CheckCircle2 size={17} />{" "}
              <span>
                {logs.length ? (
                  <>
                    <strong>On track.</strong> Your records are consistent this
                    week.
                  </>
                ) : (
                  "No activity has been recorded yet."
                )}
              </span>
            </div>
          </section>
        </div>
        {(showAdd || editingLog) && (
          <AddLog entry={editingLog} onClose={() => { setShowAdd(false); setEditingLog(null); }} onSave={editingLog ? updateLog : saveLog} />
        )}
      </main>
    </Shell>
  );
}
function AddLog({ entry, onClose, onSave }) {
  const [locationEnabled, setLocationEnabled] = useState(Boolean(entry?.location));
  const [form, setForm] = useState({
    log_date: manilaDateKey(),
    time_in: "09:00",
    time_out: "",
    title: entry?.title || "",
    activity: entry?.activity || "",
    location: entry?.location || "",
    category: "Work",
    status: entry?.status || "Completed",
  });
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="panel-head">
          <div>
            <span className="eyebrow">NEW ENTRY</span>
            <h3>{entry ? "Edit log entry" : "Record an activity"}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...form, id: entry?.id || Date.now() });
          }}
        >
          <div className="form-grid">
            <label>
              Date
              <input
                type="date"
                required
                value={form.log_date}
                onChange={(e) => setForm({ ...form, log_date: e.target.value })}
              />
            </label>
            <label>
              Time in
              <input
                type="time"
                value={form.time_in}
                onChange={(e) => setForm({ ...form, time_in: e.target.value })}
              />
            </label>
            <label>
              Time out
              <input
                type="time"
                value={form.time_out}
                onChange={(e) => setForm({ ...form, time_out: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {[
                  "School",
                  "Office",
                  "Work",
                  "Meeting",
                  "Event",
                  "Personal",
                  "Other",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Completed</option>
                <option>Ongoing</option>
                <option>Cancelled</option>
              </select>
            </label>
          </div>
          <label>
            Title
            <input required placeholder="Give this entry a title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label>
            Activity / description
            <input
              required
              placeholder="What did you work on?"
              value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
            />
          </label>
          <label>
            Location (optional)
            <select value={locationEnabled ? "use" : "none"} onChange={(e) => { const enabled = e.target.value === "use"; setLocationEnabled(enabled); if (!enabled) setForm({ ...form, location: "" }); }}>
              <option value="none">None</option>
              <option value="use">Use a location</option>
            </select>
          </label>
          {locationEnabled && <label>Location name<input placeholder="Where did this happen?" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="primary">
              {entry ? "Save changes" : "Save entry"} <ArrowUpRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function LogList({ user }) {
  const [logs, setLogs] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    request(
      `/logs/list.php?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&user_id=${encodeURIComponent(userId)}`,
    )
      .then((data) => setLogs(data.data?.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [search, status, userId]);
  useEffect(() => { if (user.role === "admin") request("/admin/users.php").then((data) => setPeople(data.data?.users || [])).catch(() => {}); }, [user.role]);
  const updateLog = async (log) => { await request("/logs/update.php", { method: "PUT", body: JSON.stringify(log) }); setLogs(logs.map((item) => item.id === log.id ? log : item)); setEditingLog(null); };
  const deleteLog = async (log) => { if (!window.confirm(`Delete "${log.title || log.activity}"? This cannot be undone.`)) return; await request("/logs/delete.php", { method: "DELETE", body: JSON.stringify({ id: log.id }) }); setLogs(logs.filter((item) => item.id !== log.id)); };
  return (
    <Shell
      user={user}
      onLogout={logoutSession}
    >
      <main className="content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {user.role === "admin" ? "OPERATIONS" : "YOUR RECORDS"}
            </span>
            <h1>{user.role === "admin" ? "All logs" : "My records"}</h1>
            <p className="muted">
              Search and review saved activity from the database.
            </p>
          </div>
          <Link className="primary" to="/dashboard">
            <LayoutDashboard size={17} /> Overview
          </Link>
        </div>
        <section className="panel">
          <div className="filters">
            <label>
              <Search size={16} />{" "}
              <input
                placeholder="Search activity or location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option>Completed</option>
              <option>Ongoing</option>
              <option>Cancelled</option>
            </select>
            {user.role === "admin" && <select value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">All users</option>{people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select>}
          </div>
          {loading ? (
            <div className="empty">Loading saved logs...</div>
          ) : (
            <LogTable logs={logs} onAdd={() => {}} onEdit={setEditingLog} onDelete={deleteLog} showOwner={user.role === "admin"} />
          )}
        </section>
        {editingLog && <AddLog entry={editingLog} onClose={() => setEditingLog(null)} onSave={updateLog} />}
      </main>
    </Shell>
  );
}
function People({ user }) {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const load = () =>
    request(`/admin/users.php?search=${encodeURIComponent(search)}`)
      .then((data) => setPeople(data.data?.users || []))
      .catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, [search]);
  const update = (person, field, value) => {
    request("/admin/users.php", {
      method: "POST",
      body: JSON.stringify({
        id: person.id,
        role: field === "role" ? value : person.role,
        status: field === "status" ? value : person.status,
      }),
    })
      .then(load)
      .catch((err) => setError(err.message));
  };
  return (
    <Shell
      user={user}
      onLogout={logoutSession}
    >
      <main className="content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">DIRECTORY</span>
            <h1>People</h1>
            <p className="muted">
              Manage accounts, access roles, and account status.
            </p>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
        <section className="panel">
          <div className="filters">
            <label>
              <Search size={16} />{" "}
              <input
                placeholder="Search people"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <strong>{person.full_name}</strong>
                      <small>@{person.username}</small>
                    </td>
                    <td>{person.email}</td>
                    <td>
                      <select
                        value={person.role}
                        disabled={person.id === user.id}
                        onChange={(e) => update(person, "role", e.target.value)}
                      >
                        <option>user</option>
                        <option>admin</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={person.status}
                        disabled={person.id === user.id}
                        onChange={(e) =>
                          update(person, "status", e.target.value)
                        }
                      >
                        <option>active</option>
                        <option>inactive</option>
                      </select>
                    </td>
                    <td>{person.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!people.length && <div className="empty">No people found.</div>}
        </section>
      </main>
    </Shell>
  );
}
function Profile({ user, onLogin }) {
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    username: user.username || "",
    email: user.email || "",
  });
  const [image, setImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [message, setMessage] = useState("");
  const save = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("full_name", form.full_name);
    data.append("username", form.username);
    if (image) data.append("profile_image", image);
    try {
      const result = await request("/profile.php", {
        method: "POST",
        body: data,
      });
      onLogin(result.data.user);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err.message);
    }
  };
  const chooseImage = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/")) return setMessage("Choose a PNG, JPG, or WebP image."); if (file.size > 8 * 1024 * 1024) return setMessage("Choose an image smaller than 8 MB."); setImageSrc(URL.createObjectURL(file)); setCrop({ x: 0, y: 0 }); setZoom(1); };
  const confirmCrop = async () => {
    const blob = await getCroppedImage(imageSrc, croppedAreaPixels);
    const file = new File([blob], "sono-profile.jpg", { type: "image/jpeg" });
    setImage(file);
    setPreviewImage(URL.createObjectURL(file));
    setImageSrc(null);
  };
  return (
    <Shell
      user={user}
      onLogout={logoutSession}
    >
      <main className="content narrow">
        <div className="page-heading">
          <div>
            <span className="eyebrow">ACCOUNT</span>
            <h1>Your profile</h1>
            <p className="muted">
              Update the details shown across your workspace.
            </p>
          </div>
        </div>
        <section className="panel profile-panel">
          <div className="profile-photo">
              <img src={previewImage || imageUrl(user.profile_image || defaultProfileImage)} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = imageUrl(defaultProfileImage); }} />
          </div>
          {message && <div className="alert">{message}</div>}
          <form onSubmit={save}>
            <label>
              Profile image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={chooseImage}
              />
            </label>
            <small className="field-note">Choose an image, adjust the square crop, then save your profile.</small>
            <label>
              Full name
              <input
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
              />
            </label>
            <label>
              Username
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                readOnly
                className="locked-input"
              />
              <small className="field-note">
                Email is locked. Contact an administrator to change it.
              </small>
            </label>
            <button className="primary">
              Save profile <ArrowUpRight size={16} />
            </button>
          </form>
        </section>
      </main>
      {imageSrc && <div className="modal-backdrop"><div className="crop-modal"><div className="panel-head"><div><span className="eyebrow">PROFILE PHOTO</span><h3>Adjust your photo</h3></div><button className="icon-button" onClick={() => setImageSrc(null)}><X size={18} /></button></div><div className="crop-area"><Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)} /></div><label>Zoom<input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label><div className="modal-actions"><button className="secondary" onClick={() => setImageSrc(null)}>Cancel</button><button className="primary" onClick={confirmCrop}>Use photo</button></div></div></div>}
    </Shell>
  );
}
function SettingsPage({ user }) {
  const savedTheme = getTheme(user.id);
  const [accent, setAccent] = useState(savedTheme.accent);
  const [background, setBackground] = useState(savedTheme.background);
  const gradients = [
    "linear-gradient(135deg, #0d1117 0%, #17242a 100%)",
    "linear-gradient(135deg, #101820 0%, #193b4a 100%)",
    "linear-gradient(135deg, #17121e 0%, #3a2636 100%)",
    "linear-gradient(135deg, #111b18 0%, #25453b 100%)",
    "linear-gradient(135deg, #1d1710 0%, #463523 100%)",
  ];
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--app-background", background);
    localStorage.setItem(themeKey(user.id), JSON.stringify({ accent, background }));
  }, [accent, background]);
  return (
    <Shell
      user={user}
      onLogout={logoutSession}
    >
      <main className="content narrow">
        <div className="page-heading">
          <div>
            <span className="eyebrow">PREFERENCES</span>
            <h1>Settings</h1>
            <p className="muted">
              Personalize your Sono workspace. Your choices belong to this account.
            </p>
          </div>
        </div>
        <section className="panel settings-panel">
          <h3>Appearance</h3>
          <p className="muted">
            Choose an accent and background. Your choices survive refresh and
            sign out, and are private to this account.
          </p>
          <div className="swatches">
            {["#d7f56a", "#83c9ff", "#ffb86b", "#f59ac2", "#b7a4ff"].map(
              (color) => (
                <button
                  className={accent === color ? "swatch selected" : "swatch"}
                  style={{ background: color }}
                  key={color}
                  onClick={() => setAccent(color)}
                  aria-label={`Use ${color}`}
                />
              ),
            )}
          </div>
          <label>
            Custom accent color
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
          </label>
          <div className="gradient-grid">
            {gradients.map((value) => (
              <button
                key={value}
                className={
                  background === value
                    ? "gradient-choice selected"
                    : "gradient-choice"
                }
                style={{ background: value }}
                onClick={() => setBackground(value)}
                aria-label="Choose background gradient"
              />
            ))}
          </div>
        </section>
        <section className="panel settings-panel">
          <h3>Account</h3>
          <p className="muted">
            Signed in as {user.email}. Email addresses are locked; edit your
            other details from your profile page.
          </p>
          <Link className="secondary" to="/profile">
            <CircleUserRound size={16} /> Edit profile
          </Link>
        </section>
      </main>
    </Shell>
  );
}
function App() {
  const auth = useAuth();
  useEffect(() => {
    applyTheme(getTheme(auth.user?.id));
  }, [auth.user?.id]);
  const privateRoute = (element) =>
    auth.user ? element : <Navigate to="/login" />;
  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.user ? (
            <Navigate to="/dashboard" />
          ) : (
            <AuthPage onLogin={auth.login} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={privateRoute(<Dashboard user={auth.user} />)}
      />
      <Route
        path="/logs"
        element={privateRoute(<LogList user={auth.user} />)}
      />
      <Route
        path="/admin"
        element={privateRoute(
          auth.user?.role === "admin" ? (
            <Dashboard user={auth.user} />
          ) : (
            <Navigate to="/dashboard" />
          ),
        )}
      />
      <Route
        path="/admin/logs"
        element={privateRoute(
          auth.user?.role === "admin" ? (
            <LogList user={auth.user} />
          ) : (
            <Navigate to="/dashboard" />
          ),
        )}
      />
      <Route
        path="/admin/users"
        element={privateRoute(
          auth.user?.role === "admin" ? (
            <People user={auth.user} />
          ) : (
            <Navigate to="/dashboard" />
          ),
        )}
      />
      <Route
        path="/profile"
        element={privateRoute(
          <Profile user={auth.user} onLogin={auth.login} />,
        )}
      />
      <Route
        path="/settings"
        element={privateRoute(<SettingsPage user={auth.user} />)}
      />
      <Route
        path="*"
        element={<Navigate to={auth.user ? "/dashboard" : "/login"} />}
      />
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
