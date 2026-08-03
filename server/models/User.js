const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never returned in queries by default
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Hash password before save.
// NOTE: In modern Mongoose (Kareem), async pre-hooks must NOT call next() —
// the resolved promise signals completion. Calling next() throws "not a function".
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  // bcryptjs v3: pass rounds directly to hash()
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method: compare plain-text password to hash
userSchema.methods.matchPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
