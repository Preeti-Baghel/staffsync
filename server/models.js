const m = require('mongoose'), S = m.Schema, ref = n => ({ type: S.Types.ObjectId, ref: n });
const t = { timestamps: true };
exports.User = m.model('User', new S({ name: String, email: { type: String, unique: true, required: true }, password: String,
  role: { type: String, enum: ['hr', 'manager', 'employee'], default: 'employee' }, department: String, position: String, phone: String }, t));
exports.Leave = m.model('Leave', new S({ user: ref('User'), type: String, from: Date, to: Date, reason: String,
  status: { type: String, default: 'Pending' }, reviewedBy: ref('User') }, t));
exports.Attendance = m.model('Attendance', new S({ user: ref('User'), date: String, checkIn: Date, checkOut: Date }));
exports.Announcement = m.model('Announcement', new S({ title: String, body: String, author: ref('User') }, t));
exports.Training = m.model('Training', new S({ title: String, description: String, date: Date, trainer: String, attendees: [ref('User')] }, t));
