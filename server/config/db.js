const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      console.error('[DB] MONGO_URI is not defined in environment variables.');
      process.exit(1);
    }

    const conn = await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[DB] MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
