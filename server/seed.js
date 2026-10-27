require('dotenv').config();
const mongoose = require('mongoose'), bcrypt = require('bcryptjs'), { User } = require('./models');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const password = await bcrypt.hash('password123', 10);
  for (const [name, role] of [['Hira HR', 'hr'], ['Mohan Manager', 'manager'], ['Esha Employee', 'employee']])
    await User.updateOne({ email: `${role}@staffsync.com` }, { name, role, password, department: 'General', position: role }, { upsert: true });
  console.log('Seeded'); process.exit();
})();
