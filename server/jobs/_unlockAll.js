require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.updateMany({}, { $set: { lockUntil: null, failedLoginAttempts: 0 } });
  console.log('cleared all lockouts');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
