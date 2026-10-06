import React, { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CalendarDays, ChevronLeft, ChevronRight, Download, FileDown, LayoutDashboard, Plus, Search, Trash2, Users, X } from "lucide-react";

const STORAGE_KEY="daily-standup-attendance-v1";
const STATUS={
  Present:{label:"Present",className:"present"},
  Leave:{label:"Leave",className:"leave"},
  WorkingFromHome:{label:"Working From Home",className:"wfh"},
  InMeeting:{label:"In Meeting",className:"meeting"},
  Absent:{label:"Absent",className:"absent"}
};
const DEFAULT_MEMBERS=[
["Vishwas Patki","Present"],["Ajay Rohilla","Absent"],["Sachin Gaikwad","Present"],["Akshay Gajbe","Present"],
["Patricia Halstead","Present"],["Ramchandra Salunkhe","Present"],["Dhaivat Patel","Present"],["Narayan Botre","Present"],
["Pankaj Rawat","Absent"],["Dhruv Harawat","Present"],["Niraj Vishwakarma","Absent"],["Vaibhav Pawar","Present"],
["Piyush Panjwani","Absent"],["Avinash Sharma","Present"],["Milind Sharma","Present"],["Chaitanya Estarala","Absent"],
["Paras Mal","Present"],["Mitesh Solanki","Absent"],["Kashish Gupta","Absent"],["Labhansh Patel","Present"],
["Milind Parkhe","Absent"],["Saurabh Dhalan","Present"],["Santosh Pandey","Absent"],["Bharat Sherla","Absent"],
["Sunil Nannawre","Present"],["Anurag","Present"],["Samruddhi","Present"],["Ashish","Absent"],["Nikita","Present"],["Vishal","Present"]
];

function dateKey(date=new Date()){const d=new Date(date);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function formatDate(v){return new Intl.DateTimeFormat("en-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date(`${v}T00:00:00`))}
function createInitialData(){
  const members=DEFAULT_MEMBERS.map(([name])=>({id:crypto.randomUUID(),name,active:true}));
  const today=dateKey();
  return {members,days:{[today]:Object.fromEntries(members.map((m,i)=>[m.id,DEFAULT_MEMBERS[i][1]]))}};
}
function loadData(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):createInitialData()}catch{return createInitialData()}}

export default function App(){
  const [data,setData]=useState(loadData);
  const [selectedDate,setSelectedDate]=useState(dateKey());
  const [query,setQuery]=useState("");
  const [statusFilter,setStatusFilter]=useState("All");
  const [showAdd,setShowAdd]=useState(false);
  const [newMember,setNewMember]=useState("");
  const [savedMessage,setSavedMessage]=useState("");

  const members=data.members.filter(m=>m.active);
  const attendance=data.days[selectedDate]||{};
  const counts=useMemo(()=>{
    const r=Object.fromEntries(Object.keys(STATUS).map(k=>[k,0]));
    members.forEach(m=>{const s=attendance[m.id]||"Absent";r[s]=(r[s]||0)+1});return r;
  },[members,attendance]);

  const filteredMembers=members.filter(m=>{
    const s=attendance[m.id]||"Absent";
    return m.name.toLowerCase().includes(query.toLowerCase())&&(statusFilter==="All"||s===statusFilter);
  });

  function persist(next){
    setData(next);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    setSavedMessage("Saved");window.setTimeout(()=>setSavedMessage(""),1200);
  }
  function setMemberStatus(id,status){persist({...data,days:{...data.days,[selectedDate]:{...attendance,[id]:status}}})}
  function addMember(e){
    e.preventDefault();const name=newMember.trim();if(!name)return;
    const member={id:crypto.randomUUID(),name,active:true};
    persist({...data,members:[...data.members,member],days:{...data.days,[selectedDate]:{...attendance,[member.id]:"Present"}}});
    setNewMember("");setShowAdd(false);
  }
  function removeMember(id){
    if(!confirm("Remove this member from the active team?"))return;
    persist({...data,members:data.members.map(m=>m.id===id?{...m,active:false}:m)});
  }
  function shiftDate(delta){const d=new Date(`${selectedDate}T00:00:00`);d.setDate(d.getDate()+delta);setSelectedDate(dateKey(d))}
  function exportPdf(){
    const doc=new jsPDF();doc.setFontSize(18);doc.text("DAILY STANDUP ATTENDANCE",14,18);
    doc.setFontSize(10);doc.text(`Date: ${formatDate(selectedDate)}`,14,26);
    autoTable(doc,{startY:34,head:[["Team Member","Status"]],body:members.map(m=>[m.name,STATUS[attendance[m.id]||"Absent"].label]),theme:"grid",headStyles:{fillColor:[17,24,39]},styles:{fontSize:9}});
    const y=(doc.lastAutoTable?.finalY||40)+10;doc.setFontSize(11);doc.text("SUMMARY",14,y);doc.setFontSize(9);
    Object.keys(STATUS).forEach((s,i)=>doc.text(`${STATUS[s].label}: ${counts[s]}`,14,y+7+i*6));
    doc.save(`Attendance_${selectedDate}.pdf`);
  }
  function exportJson(){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="attendance-backup.json";a.click();URL.revokeObjectURL(url);
  }
  function importJson(e){
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!Array.isArray(x.members)||!x.days)throw 0;persist(x)}catch{alert("Invalid attendance backup file.")}};
    reader.readAsText(file);e.target.value="";
  }
  const today=dateKey();

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><LayoutDashboard size={20}/></div><div><strong>Standup</strong><span>Attendance</span></div></div>
      <nav><div className="nav-item active"><LayoutDashboard size={18}/>Dashboard</div><div className="nav-item"><Users size={18}/>Team<span>{members.length}</span></div></nav>
      <div className="sidebar-bottom">
        <button className="side-action" onClick={exportJson}><Download size={16}/>Backup data</button>
        <label className="side-action"><FileDown size={16}/>Import data<input type="file" accept=".json" hidden onChange={importJson}/></label>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div><p className="eyebrow">TEAM OPERATIONS</p><h1>Daily Attendance</h1></div>
        <div className="top-actions">{savedMessage&&<span className="saved">{savedMessage} ✓</span>}<button className="primary" onClick={()=>setShowAdd(true)}><Plus size={17}/>Add Member</button></div>
      </header>

      <section className="date-toolbar card">
        <div className="date-nav"><button className="icon-button" onClick={()=>shiftDate(-1)}><ChevronLeft/></button>
          <div className="date-title"><CalendarDays size={19}/><div><strong>{formatDate(selectedDate)}</strong><span>{selectedDate===today?"Today":"Selected date"}</span></div></div>
          <button className="icon-button" onClick={()=>shiftDate(1)}><ChevronRight/></button></div>
        <div className="date-actions"><input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/>
          <button className="secondary" onClick={()=>setSelectedDate(today)}>Today</button><button className="secondary" onClick={exportPdf}><Download size={16}/>Export PDF</button></div>
      </section>

      <section className="stats-grid">
        {Object.entries(STATUS).map(([key,v])=><StatCard key={key} label={v.label} value={counts[key]} className={v.className}/>)}
      </section>

      <section className="content-card card">
        <div className="section-head"><div><h2>Team Attendance</h2><p>{members.length} active team members · Update each status directly below.</p></div>
          <div className="filters"><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search member..."/></div>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="All">All statuses</option>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Team Member</th><th>Status</th><th>Quick Update</th><th></th></tr></thead><tbody>
          {filteredMembers.map(member=>{const current=attendance[member.id]||"Absent";return <tr key={member.id}>
            <td><div className="member-cell"><div className="avatar">{member.name.charAt(0).toUpperCase()}</div><span>{member.name}</span></div></td>
            <td><StatusBadge status={current}/></td>
            <td><div className="status-buttons">{Object.entries(STATUS).map(([key,v])=><button key={key} className={`status-button ${v.className} ${current===key?"selected":""}`} onClick={()=>setMemberStatus(member.id,key)}>{v.label}</button>)}</div></td>
            <td><button className="delete-button" onClick={()=>removeMember(member.id)}><Trash2 size={16}/></button></td>
          </tr>})}
        </tbody></table>
        {!filteredMembers.length&&<div className="empty"><Search size={28}/><strong>No team members found</strong><span>Try another search or status filter.</span></div>}</div>
      </section>
      <footer><span>Attendance data is saved automatically in this browser.</span><span>Daily Standup Attendance · Web</span></footer>
    </main>

    {showAdd&&<div className="modal-backdrop" onMouseDown={()=>setShowAdd(false)}><div className="modal card" onMouseDown={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={()=>setShowAdd(false)}><X/></button><div className="modal-icon"><Users size={21}/></div><h2>Add team member</h2><p>The member will be added as Present for the selected date.</p>
      <form onSubmit={addMember}><input autoFocus value={newMember} onChange={e=>setNewMember(e.target.value)} placeholder="Enter full name"/><button className="primary" type="submit"><Plus size={17}/>Add Member</button></form>
    </div></div>}
  </div>
}
function StatCard({label,value,className}){return <div className={`stat card ${className}`}><div><span>{label}</span><strong>{value}</strong></div><div className="stat-dot"/></div>}
function StatusBadge({status}){const x=STATUS[status]||STATUS.Absent;return <span className={`badge ${x.className}`}>{x.label}</span>}
