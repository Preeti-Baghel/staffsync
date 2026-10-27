require('dotenv').config();
const express = require('express'), cors = require('cors'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Leave, Attendance, Announcement, Training } = require('./models');
const app = express(); app.use(cors(), express.json());

const sign = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const auth = (...roles) => async (req, res, next) => {
  try {
    const d = jwt.verify((req.headers.authorization || '').split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(d.id).select('-password'); if (!req.user) throw 0;
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch { res.status(401).json({ message: 'Unauthorized' }); }
};
const h = f => (q, s, n) => Promise.resolve(f(q, s, n)).catch(e => s.status(400).json({ message: e.message }));
const HR = 'hr', MG = 'manager';

// Auth
app.post('/api/auth/register', h(async (q, s) => {
  const { name, email, password } = q.body; if (!name || !email || !password) throw new Error('All fields required');
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  s.json({ token: sign(u), user: { ...u.toObject(), password: undefined } });
}));
app.post('/api/auth/login', h(async (q, s) => {
  const u = await User.findOne({ email: q.body.email });
  if (!u || !(await bcrypt.compare(q.body.password || '', u.password))) throw new Error('Invalid credentials');
  s.json({ token: sign(u), user: { ...u.toObject(), password: undefined } });
}));
app.get('/api/me', auth(), (q, s) => s.json(q.user));
app.put('/api/me', auth(), h(async (q, s) => {
  const { name, phone, position, department } = q.body;
  s.json(await User.findByIdAndUpdate(q.user._id, { name, phone, position, department }, { new: true }).select('-password'));
}));

// Employees
app.get('/api/employees', auth(HR, MG), h(async (q, s) => s.json(await User.find().select('-password').sort('name'))));
app.post('/api/employees', auth(HR), h(async (q, s) => {
  const u = await User.create({ ...q.body, password: await bcrypt.hash(q.body.password || 'password123', 10) });
  s.json({ ...u.toObject(), password: undefined });
}));
app.put('/api/employees/:id', auth(HR), h(async (q, s) => {
  const { password, ...rest } = q.body; if (password) rest.password = await bcrypt.hash(password, 10);
  s.json(await User.findByIdAndUpdate(q.params.id, rest, { new: true }).select('-password'));
}));
app.delete('/api/employees/:id', auth(HR), h(async (q, s) => { await User.findByIdAndDelete(q.params.id); s.json({ ok: 1 }); }));

// Leaves
app.post('/api/leaves', auth(), h(async (q, s) => {
  const { type, from, to, reason } = q.body; if (new Date(to) < new Date(from)) throw new Error('Invalid date range');
  s.json(await Leave.create({ user: q.user._id, type, from, to, reason }));
}));
app.get('/api/leaves/mine', auth(), h(async (q, s) => s.json(await Leave.find({ user: q.user._id }).sort('-createdAt'))));
app.get('/api/leaves', auth(HR, MG), h(async (q, s) => s.json(await Leave.find().populate('user', 'name department').sort('-createdAt'))));
app.put('/api/leaves/:id/status', auth(HR, MG), h(async (q, s) => {
  if (!['Approved', 'Rejected'].includes(q.body.status)) throw new Error('Bad status');
  s.json(await Leave.findByIdAndUpdate(q.params.id, { status: q.body.status, reviewedBy: q.user._id }, { new: true }));
}));

// Attendance
const today = () => new Date().toISOString().slice(0, 10);
app.post('/api/attendance/checkin', auth(), h(async (q, s) => {
  if (await Attendance.findOne({ user: q.user._id, date: today() })) throw new Error('Already checked in today');
  s.json(await Attendance.create({ user: q.user._id, date: today(), checkIn: new Date() }));
}));
app.post('/api/attendance/checkout', auth(), h(async (q, s) => {
  const a = await Attendance.findOne({ user: q.user._id, date: today() }); if (!a) throw new Error('Check in first');
  a.checkOut = new Date(); s.json(await a.save());
}));
app.get('/api/attendance/mine', auth(), h(async (q, s) => s.json(await Attendance.find({ user: q.user._id }).sort('-date').limit(31))));
app.get('/api/attendance', auth(HR), h(async (q, s) => s.json(await Attendance.find().populate('user', 'name').sort('-date').limit(200))));

// Announcements
app.get('/api/announcements', auth(), h(async (q, s) => s.json(await Announcement.find().populate('author', 'name').sort('-createdAt'))));
app.post('/api/announcements', auth(HR), h(async (q, s) => s.json(await Announcement.create({ ...q.body, author: q.user._id }))));
app.delete('/api/announcements/:id', auth(HR), h(async (q, s) => { await Announcement.findByIdAndDelete(q.params.id); s.json({ ok: 1 }); }));

// Training
app.get('/api/training', auth(), h(async (q, s) => s.json(await Training.find().sort('date'))));
app.post('/api/training', auth(HR, MG), h(async (q, s) => s.json(await Training.create(q.body))));
app.delete('/api/training/:id', auth(HR, MG), h(async (q, s) => { await Training.findByIdAndDelete(q.params.id); s.json({ ok: 1 }); }));
app.post('/api/training/:id/enroll', auth(), h(async (q, s) =>
  s.json(await Training.findByIdAndUpdate(q.params.id, { $addToSet: { attendees: q.user._id } }, { new: true }))));

mongoose.connect(process.env.MONGO_URI).then(() =>
  app.listen(process.env.PORT || 5000, () => console.log('StaffSync API running'))).catch(e => console.error(e));
