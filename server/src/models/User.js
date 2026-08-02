import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const DEPARTMENTS = ['PWD', 'SANITATION', 'WATER_BOARD', 'ELECTRICITY', 'TRAFFIC_POLICE'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'department', 'admin'], default: 'citizen' },
  department: {
    type: String,
    enum: DEPARTMENTS,
    required: function () { return this.role === 'department'; }
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // passwordHash is set directly with the hashed value in the controller
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

export default User;
export { DEPARTMENTS };
