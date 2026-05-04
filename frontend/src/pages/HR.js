import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const TABS = ['Shifts & Schedule', 'Attendance', 'Overtime', 'Payroll', 'Tips & Commissions', 'Payslips'];

const PATH_MAP = {
  '':            'Shifts & Schedule',
  'shifts':      'Shifts & Schedule',
  'attendance':  'Attendance',
  'clock':       'Attendance',
  'overtime':    'Overtime',
  'payroll':     'Payroll',
  'tips':        'Tips & Commissions',
  'commissions': 'Tips & Commissions',
  'payslips':    'Payslips',
  'reports':     'Payslips',
};
const TAB_PATH = {
  'Shifts & Schedule':    'shifts',
  'Attendance':           'attendance',
  'Overtime':             'overtime',
  'Payroll':              'payroll',
  'Tips & Commissions':   'tips',
  'Payslips':             'payslips',
};

const STAFF = [
  { id: 1, name: 'Chef Ali Hassan',    role: 'Head Chef',       dept: 'Kitchen',   salary: 8500.00,  hoursMonth: 168, otHours: 12, status: 'present' },
  { id: 2, name: 'Sara Malik',         role: 'Sous Chef',       dept: 'Kitchen',   salary: 6200.00,  hoursMonth: 168, otHours: 8,  status: 'present' },
  { id: 3, name: 'James Okafor',       role: 'Head Waiter',     dept: 'FOH',       salary: 4800.00,  hoursMonth: 168, otHours: 5,  status: 'present' },
  { id: 4, name: 'Priya Nair',         role: 'Cashier',         dept: 'FOH',       salary: 3600.00,  hoursMonth: 168, otHours: 2,  status: 'present' },
  { id: 5, name: 'Tom Bradley',        role: 'Delivery Rider',  dept: 'Delivery',  salary: 3200.00,  hoursMonth: 160, otHours: 16, status: 'on_leave' },
  { id: 6, name: 'Fatima Al Zaabi',    role: 'Hostess',         dept: 'FOH',       salary: 3800.00,  hoursMonth: 168, otHours: 0,  status: 'present' },
  { id: 7, name: 'Carlos Mendez',      role: 'Delivery Rider',  dept: 'Delivery',  salary: 3200.00,  hoursMonth: 168, otHours: 22, status: 'present' },
  { id: 8, name: 'Amina Sheikh',       role: 'Pastry Chef',     dept: 'Kitchen',   salary: 5500.00,  hoursMonth: 160, otHours: 4,  status: 'absent' },
];

const SHIFTS = [
  { name: 'Morning Shift', time: '06:00 – 14:00', staff: 3, dept: 'All' },
  { name: 'Afternoon Shift', time: '12:00 – 20:00', staff: 4, dept: 'FOH + Kitchen' },
  { name: 'Evening Shift', time: '16:00 – 00:00', staff: 5, dept: 'All' },
  { name: 'Night Shift', time: '22:00 – 06:00', staff: 2, dept: 'Kitchen' },
];

// Simple attendance data: 5 weeks × 7 days
const ATTENDANCE_DATA = [
  [1,1,1,1,1,1,0],
  [1,1,0,1,1,1,1],
  [1,1,1,1,0,1,1],
  [1,1,1,1,1,0,1],
  [1,1,1,1,1,1,1],
];
const DAYS_LABEL = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const OVERTIME = [
  { id: 1, staff: 'Carlos Mendez',  dept: 'Delivery',  week: 'W1 May', regularHrs: 40, otHrs: 8,  otPay: 480.00, approved: true },
  { id: 2, staff: 'Chef Ali Hassan',dept: 'Kitchen',   week: 'W1 May', regularHrs: 40, otHrs: 4,  otPay: 400.00, approved: true },
  { id: 3, staff: 'Tom Bradley',    dept: 'Delivery',  week: 'W1 May', regularHrs: 40, otHrs: 6,  otPay: 360.00, approved: true },
  { id: 4, staff: 'Sara Malik',     dept: 'Kitchen',   week: 'W1 May', regularHrs: 40, otHrs: 3,  otPay: 232.50, approved: false },
  { id: 5, staff: 'Carlos Mendez',  dept: 'Delivery',  week: 'W2 May', regularHrs: 40, otHrs: 8,  otPay: 480.00, approved: true },
  { id: 6, staff: 'James Okafor',   dept: 'FOH',       week: 'W2 May', regularHrs: 40, otHrs: 5,  otPay: 300.00, approved: false },
];

const PAYROLL_STATUS = { present: 'bg-emerald-50 text-emerald-700', on_leave: 'bg-amber-50 text-amber-700', absent: 'bg-rose-50 text-rose-700' };

export default function HR() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath  = location.pathname.replace(/^\/hr\/?/, '');
  const tab      = PATH_MAP[subPath] || 'Shifts & Schedule';
  const setTab   = (t) => navigate(`/hr/${TAB_PATH[t]}`);

  const totalStaff    = STAFF.length;
  const presentToday  = STAFF.filter(s => s.status === 'present').length;
  const totalOT       = OVERTIME.filter(o => o.approved).reduce((s, o) => s + o.otHrs, 0);
  const payrollTotal  = STAFF.reduce((s, e) => s + e.salary + (e.otHours * (e.salary / 168) * 1.5), 0);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">HR & Payroll</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module G · Shifts · Attendance · Overtime · Payroll · Payslips · Leave</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Employee</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff',      val: totalStaff,                                      sub: '4 departments',          color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Present Today',    val: `${presentToday}/${totalStaff}`,                  sub: `${totalStaff - presentToday} absent/on leave`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'OT Hours (May)',   val: totalOT,                                          sub: 'Approved overtime only', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
          { label: 'Payroll Due',      val: `AED ${(payrollTotal/1000).toFixed(1)}K`,         sub: 'Incl. approved OT',      color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
            <p className="text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? 'text-sky-700 border-sky-500 bg-sky-50/40' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'Shifts & Schedule' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SHIFTS.map((s, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                    <p className="text-xs text-sky-600 font-semibold mt-0.5">{s.time}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <UserGroupIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">{s.staff} staff · {s.dept}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Employee</th><th>Role</th><th>Dept</th><th>Monthly Hours</th><th>Today Status</th></tr></thead>
                  <tbody>
                    {STAFF.map(s => (
                      <tr key={s.id}>
                        <td className="font-semibold text-slate-800">{s.name}</td>
                        <td className="text-xs text-slate-500">{s.role}</td>
                        <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s.dept}</span></td>
                        <td className="text-sm text-slate-600">{s.hoursMonth} hrs</td>
                        <td><span className={`status-badge ${PAYROLL_STATUS[s.status]}`}>{s.status.replace('_', ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Attendance' && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">May 2026 — Aggregate Attendance Heatmap</p>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex gap-1 mb-1">
                    <div className="w-28 shrink-0" />
                    {DAYS_LABEL.map(d => <div key={d} className="w-8 text-center text-xs text-slate-400 font-semibold">{d}</div>)}
                  </div>
                  {ATTENDANCE_DATA.map((week, wi) => (
                    <div key={wi} className="flex items-center gap-1 mb-1">
                      <div className="w-28 shrink-0 text-xs text-slate-400 font-semibold">Week {wi + 1}</div>
                      {week.map((present, di) => (
                        <div key={di} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${present ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-400'}`}>
                          {present ? '✓' : '✗'}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">Showing aggregate team attendance. Green = ≥80% present. Red = &lt;80% present.</p>
            </div>
          )}

          {tab === 'Overtime' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Employee</th><th>Department</th><th>Period</th><th>Regular Hrs</th><th>OT Hours</th><th>OT Pay (1.5×)</th><th>Approved</th></tr></thead>
                <tbody>
                  {OVERTIME.map((o, i) => (
                    <tr key={i}>
                      <td className="font-semibold text-slate-800">{o.staff}</td>
                      <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{o.dept}</span></td>
                      <td className="text-xs text-slate-500">{o.week}</td>
                      <td className="text-center text-slate-600">{o.regularHrs}h</td>
                      <td className="text-center font-bold text-amber-700">{o.otHrs}h</td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {o.otPay.toFixed(2)}</td>
                      <td>{o.approved ? <span className="status-badge bg-emerald-50 text-emerald-700">Approved</span> : <button className="btn btn-ghost btn-sm text-xs text-amber-600">Approve</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Payroll' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Employee</th><th>Role</th><th>Base Salary</th><th>OT Hours</th><th>OT Pay</th><th>Gross Pay</th><th>Action</th></tr></thead>
                <tbody>
                  {STAFF.map(s => {
                    const otRate   = s.salary / 168 * 1.5;
                    const otPay    = s.otHours * otRate;
                    const grossPay = s.salary + otPay;
                    return (
                      <tr key={s.id}>
                        <td className="font-semibold text-slate-800">{s.name}</td>
                        <td className="text-xs text-slate-500">{s.role}</td>
                        <td className="font-mono text-xs text-slate-700">AED {s.salary.toLocaleString()}</td>
                        <td className="text-center font-bold text-amber-700">{s.otHours}h</td>
                        <td className="font-mono text-xs text-amber-700">AED {otPay.toFixed(2)}</td>
                        <td className="font-mono text-xs font-black text-emerald-700">AED {grossPay.toFixed(2)}</td>
                        <td><button className="btn btn-ghost btn-sm text-xs">Generate Payslip</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={5} className="text-right text-sm text-slate-700">Total Payroll:</td>
                    <td className="font-mono text-sm font-black text-emerald-700">AED {STAFF.reduce((s, e) => s + e.salary + (e.otHours * (e.salary/168) * 1.5), 0).toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {tab === 'Payslips' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STAFF.slice(0, 6).map(s => {
                const otPay = s.otHours * (s.salary / 168) * 1.5;
                return (
                  <div key={s.id} className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {s.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.role} · {s.dept}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Base Salary</span><span className="font-semibold text-slate-700">AED {s.salary.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">OT Pay ({s.otHours}h)</span><span className="font-semibold text-amber-700">AED {otPay.toFixed(2)}</span></div>
                      <hr className="border-slate-200 my-1" />
                      <div className="flex justify-between"><span className="font-bold text-slate-700">Gross Pay</span><span className="font-black text-emerald-700">AED {(s.salary + otPay).toFixed(2)}</span></div>
                    </div>
                    <button className="btn btn-ghost btn-sm text-xs text-sky-600 mt-3 w-full">📄 Download PDF</button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'Tips & Commissions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Pool Tips – May W1', val: 'AED 2,840', sub: 'Equal-split across 6 FOH staff', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  { label: 'Rider Commissions', val: 'AED 3,180', sub: '42 deliveries this week', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
                  { label: 'Performance Bonus', val: 'AED 1,200', sub: '2 staff hit sales target', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
                  { label: 'Total Variable Pay', val: 'AED 7,220', sub: 'Pending payroll merge', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
                ].map(k => (
                  <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
                    <p className={`text-xl font-black ${k.color}`}>{k.val}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
                    <p className="text-xs text-slate-500">{k.sub}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Staff</th><th>Role</th><th>Tips Earned</th><th>Commission</th><th>Bonus</th><th>Total Variable</th><th>Status</th></tr></thead>
                  <tbody>
                    {[
                      { name: 'Carlos Mendez',  role: 'Rider',       tips: 0,   comm: 1260.00, bonus: 0,    status: 'pending' },
                      { name: 'Ahmed Khalil',   role: 'Rider',       tips: 0,   comm: 1050.00, bonus: 0,    status: 'pending' },
                      { name: 'James Okafor',   role: 'Head Waiter', tips: 680, comm: 0,       bonus: 600,  status: 'approved' },
                      { name: 'Priya Nair',     role: 'Cashier',     tips: 420, comm: 0,       bonus: 0,    status: 'pending' },
                      { name: 'Fatima Al Zaabi',role: 'Hostess',     tips: 380, comm: 0,       bonus: 600,  status: 'approved' },
                      { name: 'Sara Malik',     role: 'Sous Chef',   tips: 0,   comm: 0,       bonus: 0,    status: 'n/a' },
                    ].map((s, i) => (
                      <tr key={i}>
                        <td className="font-semibold text-slate-800">{s.name}</td>
                        <td className="text-xs text-slate-500">{s.role}</td>
                        <td className="font-mono text-xs text-slate-700">{s.tips ? `AED ${s.tips}` : '—'}</td>
                        <td className="font-mono text-xs text-sky-700">{s.comm ? `AED ${s.comm.toFixed(2)}` : '—'}</td>
                        <td className="font-mono text-xs text-violet-700">{s.bonus ? `AED ${s.bonus}` : '—'}</td>
                        <td className="font-mono text-xs font-bold text-emerald-700">AED {(s.tips + s.comm + s.bonus).toFixed(2)}</td>
                        <td><span className={`status-badge ${ s.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : s.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500' }`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
