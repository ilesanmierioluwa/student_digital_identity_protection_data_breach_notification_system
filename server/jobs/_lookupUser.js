const args = process.argv.slice(2);
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const q = args[0];
  const field = args[1] || 'matricNumber';
  const u = await User.findOne({ [field]: q });
  console.log(u ? u._id.toString() : '');
  await mongoose.disconnect();
})();
