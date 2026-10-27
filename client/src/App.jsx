import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const fd = d => (d ? new Date(d).toLocaleDateString() : '-');
const ft = d => (d ? new Date(d).toLocaleTimeString() : '-');
const useLoad = path => {
  const [d, setD] = useState([]);
  const load = useCallback(() => api(path).then(setD).catch(() => {}), [path]);
  useEffect(() => { load(); }, [load]);
  return [d, load];
};
const Form = ({ fields, onSubmit, label }) => {
  const [v, setV] = useState({});
  return (
    <div className="row g-2 mb-3">
      {fields.map(([k, ph, type = 'text', opts]) => (
        <div className="col-md" key={k}>
          {opts ? (
            <select className="form-select" value={v[k] || ''} onChange={e => setV({ ...v, [k]: e.target.value })}>
              <option value="">{ph}</option>{opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input className="form-control" type={type} placeholder={ph} title={ph} value={v[k] || ''} onChange={e => setV({ ...v, [k]: e.target.value })} />
          )}
        </div>
      ))}
      <div className="col-auto"><button className="btn btn-primary" onClick={async () => { if (await onSubmit(v)) setV({}); }}>{label}</button></div>
    </div>
  );
};
const run = async (fn, reload) => { try { await fn(); reload && reload(); return true; } catch (e) { alert(e.message); return false; } };

function Login({ onAuth }) {
  const [reg, setReg] = useState(false), [f, setF] = useState({});
  const go = async () => run(async () => {
    const r = await api(reg ? '/auth/register' : '/auth/login', 'POST', f);
    localStorage.setItem('token', r.token); onAuth(r.user);
  });
  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 80 }}>
      <h2 className="mb-3">StaffSync</h2>
      {reg && <input className="form-control mb-2" placeholder="Name" onChange={e => setF({ ...f, name: e.target.value })} />}
      <input className="form-control mb-2" placeholder="Email" onChange={e => setF({ ...f, email: e.target.value })} />
      <input className="form-control mb-2" type="password" placeholder="Password" onChange={e => setF({ ...f, password: e.target.value })} />
      <button className="btn btn-primary w-100" onClick={go}>{reg ? 'Register' : 'Login'}</button>
      <button className="btn btn-link w-100" onClick={() => setReg(!reg)}>{reg ? 'Have an account? Login' : 'New employee? Register'}</button>
    </div>
  );
}

function Announcements({ user }) {
  const [list, load] = useLoad('/announcements');
  return (<>
    {user.role === 'hr' && <Form label="Post" fields={[['title', 'Title'], ['body', 'Message']]} onSubmit={v => run(() => api('/announcements', 'POST', v), load)} />}
    {list.map(a => (
      <div className="card mb-2" key={a._id}><div className="card-body">
        <h5>{a.title}</h5><p className="mb-1">{a.body}</p>
        <small className="text-muted">{a.author?.name} · {fd(a.createdAt)}</small>
        {user.role === 'hr' && <button className="btn btn-sm btn-outline-danger float-end" onClick={() => run(() => api('/announcements/' + a._id, 'DELETE'), load)}>Delete</button>}
      </div></div>
    ))}
  </>);
}

function Leaves({ user }) {
  const staff = user.role !== 'employee';
  const [mine, loadM] = useLoad('/leaves/mine'), [all, loadA] = useLoad(staff ? '/leaves' : '/leaves/mine');
  const reload = () => { loadM(); loadA(); };
  return (<>
    <h5>Apply for leave</h5>
    <Form label="Apply" fields={[['type', 'Type', 'text', ['Casual', 'Sick', 'Annual']], ['from', 'From', 'date'], ['to', 'To', 'date'], ['reason', 'Reason']]}
      onSubmit={v => run(() => api('/leaves', 'POST', v), reload)} />
    <h5>My leaves</h5>
    <table className="table"><thead><tr><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead>
      <tbody>{mine.map(l => <tr key={l._id}><td>{l.type}</td><td>{fd(l.from)}</td><td>{fd(l.to)}</td><td>{l.status}</td></tr>)}</tbody></table>
    {staff && (<>
      <h5>All requests</h5>
      <table className="table"><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th /></tr></thead>
        <tbody>{all.map(l => (
          <tr key={l._id}><td>{l.user?.name}</td><td>{l.type}</td><td>{fd(l.from)} – {fd(l.to)}</td><td>{l.reason}</td><td>{l.status}</td>
            <td>{l.status === 'Pending' && ['Approved', 'Rejected'].map(s => (
              <button key={s} className={`btn btn-sm me-1 btn-${s === 'Approved' ? 'success' : 'danger'}`} onClick={() => run(() => api(`/leaves/${l._id}/status`, 'PUT', { status: s }), reload)}>{s[0] === 'A' ? 'Approve' : 'Reject'}</button>))}</td></tr>))}
        </tbody></table></>)}
  </>);
}

function Attendance({ user }) {
  const [mine, load] = useLoad('/attendance/mine'), [all] = useLoad(user.role === 'hr' ? '/attendance' : '/attendance/mine');
  return (<>
    <button className="btn btn-success me-2" onClick={() => run(() => api('/attendance/checkin', 'POST'), load)}>Check in</button>
    <button className="btn btn-warning" onClick={() => run(() => api('/attendance/checkout', 'POST'), load)}>Check out</button>
    <table className="table mt-3"><thead><tr><th>Date</th><th>In</th><th>Out</th></tr></thead>
      <tbody>{mine.map(a => <tr key={a._id}><td>{a.date}</td><td>{ft(a.checkIn)}</td><td>{ft(a.checkOut)}</td></tr>)}</tbody></table>
    {user.role === 'hr' && (<><h5>All employees</h5>
      <table className="table"><thead><tr><th>Employee</th><th>Date</th><th>In</th><th>Out</th></tr></thead>
        <tbody>{all.map(a => <tr key={a._id}><td>{a.user?.name}</td><td>{a.date}</td><td>{ft(a.checkIn)}</td><td>{ft(a.checkOut)}</td></tr>)}</tbody></table></>)}
  </>);
}

function Employees({ user }) {
  const [list, load] = useLoad('/employees'), hr = user.role === 'hr';
  return (<>
    {hr && <Form label="Add" fields={[['name', 'Name'], ['email', 'Email'], ['password', 'Password', 'password'], ['role', 'Role', 'text', ['employee', 'manager', 'hr']], ['department', 'Department'], ['position', 'Position']]}
      onSubmit={v => run(() => api('/employees', 'POST', v), load)} />}
    <table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Dept</th><th>Position</th><th /></tr></thead>
      <tbody>{list.map(e => (
        <tr key={e._id}><td>{e.name}</td><td>{e.email}</td><td>{e.role}</td><td>{e.department}</td><td>{e.position}</td>
          <td>{hr && <button className="btn btn-sm btn-outline-danger" onClick={() => confirm('Delete?') && run(() => api('/employees/' + e._id, 'DELETE'), load)}>Delete</button>}</td></tr>))}
      </tbody></table>
  </>);
}

function Training({ user }) {
  const [list, load] = useLoad('/training'), staff = user.role !== 'employee';
  return (<>
    {staff && <Form label="Add program" fields={[['title', 'Title'], ['description', 'Description'], ['trainer', 'Trainer'], ['date', 'Date', 'date']]} onSubmit={v => run(() => api('/training', 'POST', v), load)} />}
    {list.map(t => (
      <div className="card mb-2" key={t._id}><div className="card-body">
        <h5>{t.title} <small className="text-muted">{fd(t.date)}</small></h5>
        <p className="mb-1">{t.description} · Trainer: {t.trainer}</p>
        <small>{t.attendees.length} enrolled</small>
        <div className="float-end">
          <button className="btn btn-sm btn-primary me-1" onClick={() => run(() => api(`/training/${t._id}/enroll`, 'POST'), load)}>{t.attendees.includes(user._id) ? 'Enrolled' : 'Enroll'}</button>
          {staff && <button className="btn btn-sm btn-outline-danger" onClick={() => run(() => api('/training/' + t._id, 'DELETE'), load)}>Delete</button>}
        </div></div></div>
    ))}
  </>);
}

function Profile({ user, setUser }) {
  const [f, setF] = useState(user);
  return (
    <div style={{ maxWidth: 420 }}>
      {['name', 'phone', 'position', 'department'].map(k => (
        <div className="mb-2" key={k}><label className="form-label text-capitalize">{k}</label>
          <input className="form-control" value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>))}
      <p className="text-muted">{user.email} · {user.role}</p>
      <button className="btn btn-primary" onClick={() => run(async () => setUser(await api('/me', 'PUT', f)))}>Save</button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null), [tab, setTab] = useState('Announcements'), [ready, setReady] = useState(false);
  useEffect(() => { api('/me').then(setUser).catch(() => {}).finally(() => setReady(true)); }, []);
  if (!ready) return null;
  if (!user) return <Login onAuth={setUser} />;
  const tabs = ['Announcements', 'Leaves', 'Attendance', 'Training', ...(user.role !== 'employee' ? ['Employees'] : []), 'Profile'];
  const P = { user, setUser };
  const views = { Announcements: Announcements, Leaves, Attendance, Training, Employees, Profile };
  const V = views[tab];
  return (<>
    <nav className="navbar navbar-dark bg-dark px-3">
      <span className="navbar-brand">StaffSync</span>
      <span className="text-light">{user.name} ({user.role}) <button className="btn btn-sm btn-outline-light ms-2" onClick={() => { localStorage.removeItem('token'); setUser(null); }}>Logout</button></span>
    </nav>
    <div className="container mt-3">
      <ul className="nav nav-tabs mb-3">{tabs.map(t => <li className="nav-item" key={t}><button className={'nav-link' + (t === tab ? ' active' : '')} onClick={() => setTab(t)}>{t}</button></li>)}</ul>
      <V {...P} />
    </div>
  </>);
}
