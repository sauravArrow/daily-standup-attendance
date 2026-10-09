import React, { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CalendarDays, ChevronLeft, ChevronRight, Download, FileDown, LayoutDashboard, Plus, Search, Trash2, Users, X, LogOut, RefreshCw, Cloud, LockKeyhole } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const STORAGE_KEY = "daily-standup-attendance-v1";
const STATUS = {
  Present: { label: "Present", className: "present" },
  Leave: { label: "Leave", className: "leave" },
  WorkingFromHome: { label: "Working From Home", className: "wfh" },
  InMeeting: { label: "In Meeting", className: "meeting" },
  Absent: { label: "Absent", className: "absent" },
};
const DEFAULT_MEMBERS = [
  ["Vishwas Patki", "Present"], ["Ajay Rohilla", "Absent"], ["Sachin Gaikwad", "Present"], ["Akshay Gajbe", "Present"],
  ["Patricia Halstead", "Present"], ["Ramchandra Salunkhe", "Present"], ["Dhaivat Patel", "Present"], ["Narayan Botre", "Present"],
  ["Pankaj Rawat", "Absent"], ["Dhruv Harawat", "Present"], ["Niraj Vishwakarma", "Absent"], ["Vaibhav Pawar", "Present"],
  ["Piyush Panjwani", "Absent"], ["Avinash Sharma", "Present"], ["Milind Sharma", "Present"], ["Chaitanya Estarala", "Absent"],
  ["Paras Mal", "Present"], ["Mitesh Solanki", "Absent"], ["Kashish Gupta", "Absent"], ["Labhansh Patel", "Present"],
  ["Milind Parkhe", "Absent"], ["Saurabh Dhalan", "Present"], ["Santosh Pandey", "Absent"], ["Bharat Sherla", "Absent"],
  ["Sunil Nannawre", "Present"], ["Anurag", "Present"], ["Samruddhi", "Present"], ["Ashish", "Absent"], ["Nikita", "Present"], ["Vishal", "Present"]
];

function dateKey(date = new Date()) { const d = new Date(date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function formatDate(v) { return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${v}T00:00:00`)); }
function showError(error) { console.error(error); alert(error?.message || "Something went wrong. Please try again."); }

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ members: [], days: {} });
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); return undefined; }
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (error) setAuthMessage(error.message);
      setSession(result?.session || null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadSharedData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [{ data: memberRows, error: memberError }, { data: records, error: attendanceError }] = await Promise.all([
        supabase.from("team_members").select("id,name,active,created_at").order("created_at", { ascending: true }),
        supabase.from("attendance_records").select("member_id,attendance_date,status")
      ]);
      if (memberError) throw memberError;
      if (attendanceError) throw attendanceError;
      const members = (memberRows || []).map(m => ({ id: m.id, name: m.name, active: m.active }));
      const days = {};
      (records || []).forEach(r => {
        if (!days[r.attendance_date]) days[r.attendance_date] = {};
        days[r.attendance_date][r.member_id] = r.status;
      });
      setData({ members, days });
      setSavedMessage("Synced");
      window.setTimeout(() => setSavedMessage(""), 1400);
    } catch (error) {
      showError(error);
    } finally { setLoading(false); }
  }, [session]);

  useEffect(() => { if (session) loadSharedData(); }, [session, loadSharedData]);

  useEffect(() => {
    if (!session) return undefined;
    const channel = supabase.channel("attendance-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => loadSharedData())
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => loadSharedData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, loadSharedData]);

  const members = data.members.filter(m => m.active);
  const attendance = data.days[selectedDate] || {};
  const counts = useMemo(() => {
    const result = Object.fromEntries(Object.keys(STATUS).map(key => [key, 0]));
    members.forEach(member => { const status = attendance[member.id] || "Absent"; result[status] = (result[status] || 0) + 1; });
    return result;
  }, [members, attendance]);
  const filteredMembers = members.filter(member => {
    const status = attendance[member.id] || "Absent";
    return member.name.toLowerCase().includes(query.toLowerCase()) && (statusFilter === "All" || status === statusFilter);
  });
  const today = dateKey();

  async function signIn(event) {
    event.preventDefault(); setAuthMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setAuthMessage(error.message);
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) showError(error);
    else setData({ members: [], days: {} });
  }
  function notifySaved() { setSavedMessage("Saved to cloud"); window.setTimeout(() => setSavedMessage(""), 1800); }

  async function setMemberStatus(id, status) {
    try {
      const { error } = await supabase.from("attendance_records").upsert({ member_id: id, attendance_date: selectedDate, status }, { onConflict: "member_id,attendance_date" });
      if (error) throw error;
      setData(previous => ({ ...previous, days: { ...previous.days, [selectedDate]: { ...(previous.days[selectedDate] || {}), [id]: status } } }));
      notifySaved();
    } catch (error) { showError(error); }
  }

  async function addMember(event) {
    event.preventDefault(); const name = newMember.trim(); if (!name) return;
    try {
      const { data: inserted, error } = await supabase.from("team_members").insert({ name, active: true }).select("id,name,active").single();
      if (error) throw error;
      const { error: attendanceError } = await supabase.from("attendance_records").upsert({ member_id: inserted.id, attendance_date: selectedDate, status: "Present" }, { onConflict: "member_id,attendance_date" });
      if (attendanceError) throw attendanceError;
      setData(previous => ({ members: [...previous.members, { id: inserted.id, name: inserted.name, active: inserted.active }], days: { ...previous.days, [selectedDate]: { ...(previous.days[selectedDate] || {}), [inserted.id]: "Present" } } }));
      setNewMember(""); setShowAdd(false); notifySaved();
    } catch (error) { showError(error); }
  }

  async function removeMember(id) {
    if (!confirm("Remove this member from the active team? Their historical attendance will be kept.")) return;
    try {
      const { error } = await supabase.from("team_members").update({ active: false }).eq("id", id);
      if (error) throw error;
      setData(previous => ({ ...previous, members: previous.members.map(member => member.id === id ? { ...member, active: false } : member) }));
      notifySaved();
    } catch (error) { showError(error); }
  }

  function shiftDate(delta) { const d = new Date(`${selectedDate}T00:00:00`); d.setDate(d.getDate() + delta); setSelectedDate(dateKey(d)); }
  function exportPdf() {
    const doc = new jsPDF(); doc.setFontSize(18); doc.text("DAILY STANDUP ATTENDANCE", 14, 18);
    doc.setFontSize(10); doc.text(`Date: ${formatDate(selectedDate)}`, 14, 26);
    autoTable(doc, { startY: 34, head: [["Team Member", "Status"]], body: members.map(m => [m.name, STATUS[attendance[m.id] || "Absent"].label]), theme: "grid", headStyles: { fillColor: [17, 24, 39] }, styles: { fontSize: 9 } });
    const y = (doc.lastAutoTable?.finalY || 40) + 10; doc.setFontSize(11); doc.text("SUMMARY", 14, y); doc.setFontSize(9);
    Object.keys(STATUS).forEach((status, index) => doc.text(`${STATUS[status].label}: ${counts[status]}`, 14, y + 7 + index * 6));
    doc.save(`Attendance_${selectedDate}.pdf`);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "attendance-backup.json"; a.click(); URL.revokeObjectURL(url);
  }
  async function importJson(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!Array.isArray(backup.members) || !backup.days || typeof backup.days !== "object") throw new Error("Invalid attendance backup file.");
      if (!confirm("Import this backup into the shared database? Matching members will be updated and attendance records will be added/updated.")) return;
      const { data: existingMembers, error: existingError } = await supabase.from("team_members").select("id,name,active");
      if (existingError) throw existingError;
      const byName = new Map((existingMembers || []).map(member => [member.name.trim().toLowerCase(), member]));
      const idMap = new Map();
      for (const backupMember of backup.members) {
        const key = String(backupMember.name || "").trim().toLowerCase();
        if (!key) continue;
        const existing = byName.get(key);
        if (existing) {
          const { error } = await supabase.from("team_members").update({ active: backupMember.active !== false }).eq("id", existing.id);
          if (error) throw error;
          idMap.set(backupMember.id, existing.id);
        } else {
          const { data: inserted, error } = await supabase.from("team_members").insert({ name: backupMember.name.trim(), active: backupMember.active !== false }).select("id").single();
          if (error) throw error;
          idMap.set(backupMember.id, inserted.id);
          byName.set(key, { id: inserted.id, name: backupMember.name, active: backupMember.active !== false });
        }
      }
      const rows = [];
      Object.entries(backup.days).forEach(([date, day]) => Object.entries(day || {}).forEach(([backupMemberId, status]) => {
        const memberId = idMap.get(backupMemberId);
        if (memberId && STATUS[status]) rows.push({ member_id: memberId, attendance_date: date, status });
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("attendance_records").upsert(rows.slice(i, i + 500), { onConflict: "member_id,attendance_date" });
        if (error) throw error;
      }
      await loadSharedData(); alert("Backup imported into the shared database.");
    } catch (error) { showError(error); }
    finally { event.target.value = ""; }
  }

  if (!isSupabaseConfigured) return <AuthShell title="Supabase setup required" message="Add your Supabase project URL and publishable key to a local .env file, then rebuild and redeploy the site." />;
  if (authLoading) return <AuthShell title="Loading attendance" message="Connecting securely to your shared workspace…" />;
  if (!session) return <div className="auth-screen"><form className="auth-card card" onSubmit={signIn}><div className="auth-mark"><LockKeyhole size={24}/></div><p className="eyebrow">TEAM OPERATIONS</p><h1>Daily Attendance</h1><p className="auth-copy">Sign in to access your team's shared attendance records.</p><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"/></label>{authMessage && <p className="auth-error">{authMessage}</p>}<button className="primary auth-submit" type="submit">Sign in</button><p className="auth-foot">Accounts are created by the workspace administrator in Supabase.</p></form></div>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><LayoutDashboard size={20}/></div><div><strong>Standup</strong><span>Attendance</span></div></div>
      <nav><div className="nav-item active"><LayoutDashboard size={18}/>Dashboard</div><div className="nav-item"><Users size={18}/>Team<span>{members.length}</span></div></nav>
      <div className="sidebar-bottom"><div className="cloud-status"><Cloud size={15}/> Shared cloud database</div><button className="side-action" onClick={exportJson}><Download size={16}/>Backup data</button><label className="side-action"><FileDown size={16}/>Import data<input type="file" accept=".json" hidden onChange={importJson}/></label><button className="side-action" onClick={signOut}><LogOut size={16}/>Sign out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">TEAM OPERATIONS</p><h1>Daily Attendance</h1></div><div className="top-actions">{(savedMessage || loading) && <span className="saved">{loading ? "Syncing…" : `${savedMessage} ✓`}</span>}<button className="secondary refresh-button" onClick={loadSharedData} title="Refresh shared data"><RefreshCw size={16}/></button><button className="primary" onClick={() => setShowAdd(true)}><Plus size={17}/>Add Member</button></div></header>
      <section className="date-toolbar card"><div className="date-nav"><button className="icon-button" onClick={() => shiftDate(-1)}><ChevronLeft/></button><div className="date-title"><CalendarDays size={19}/><div><strong>{formatDate(selectedDate)}</strong><span>{selectedDate === today ? "Today" : "Selected date"}</span></div></div><button className="icon-button" onClick={() => shiftDate(1)}><ChevronRight/></button></div><div className="date-actions"><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}/><button className="secondary" onClick={() => setSelectedDate(today)}>Today</button><button className="secondary" onClick={exportPdf}><Download size={16}/>Export PDF</button></div></section>
      <section className="stats-grid">{Object.entries(STATUS).map(([key, value]) => <StatCard key={key} label={value.label} value={counts[key]} className={value.className}/>)}</section>
      <section className="content-card card"><div className="section-head"><div><h2>Team Attendance</h2><p>{members.length} active team members · Changes are shared with signed-in teammates.</p></div><div className="filters"><div className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search member..."/></div><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="All">All statuses</option>{Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></div></div>
        <div className="table-wrap"><table><thead><tr><th>Team Member</th><th>Status</th><th>Quick Update</th><th></th></tr></thead><tbody>{filteredMembers.map(member => { const current = attendance[member.id] || "Absent"; return <tr key={member.id}><td><div className="member-cell"><div className="avatar">{member.name.charAt(0).toUpperCase()}</div><span>{member.name}</span></div></td><td><StatusBadge status={current}/></td><td><div className="status-buttons">{Object.entries(STATUS).map(([key, value]) => <button key={key} className={`status-button ${value.className} ${current === key ? "selected" : ""}`} onClick={() => setMemberStatus(member.id, key)}>{value.label}</button>)}</div></td><td><button className="delete-button" onClick={() => removeMember(member.id)} title="Remove member"><Trash2 size={16}/></button></td></tr>; })}</tbody></table>{!filteredMembers.length && <div className="empty"><Search size={28}/><strong>{loading ? "Loading team members…" : "No team members found"}</strong><span>Try another search or status filter.</span></div>}</div>
      </section><footer><span><Cloud size={14} style={{ verticalAlign: "middle" }}/> Attendance is stored in the shared cloud database.</span><span>Daily Standup Attendance · Web</span></footer>
    </main>
    {showAdd && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><div className="modal card" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowAdd(false)}><X/></button><div className="modal-icon"><Users size={21}/></div><h2>Add team member</h2><p>The member will be added as Present for the selected date.</p><form onSubmit={addMember}><input autoFocus value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Enter full name"/><button className="primary" type="submit"><Plus size={17}/>Add Member</button></form></div></div>}
  </div>;
}
function AuthShell({ title, message }) { return <div className="auth-screen"><div className="auth-card card"><div className="auth-mark"><Cloud size={24}/></div><p className="eyebrow">TEAM OPERATIONS</p><h1>{title}</h1><p className="auth-copy">{message}</p></div></div>; }
function StatCard({ label, value, className }) { return <div className={`stat card ${className}`}><div><span>{label}</span><strong>{value}</strong></div><div className="stat-dot"/></div>; }
function StatusBadge({ status }) { const value = STATUS[status] || STATUS.Absent; return <span className={`badge ${value.className}`}>{value.label}</span>; }
