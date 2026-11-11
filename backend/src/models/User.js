import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const generateToken = () => crypto.randomBytes(32).toString('hex');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Hash the password whenever it is new or changed. Validation runs before this hook.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// The user must have been loaded with .select('+password').
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Returns the raw token (to put in the email link). Only its hash is stored.
userSchema.methods.createEmailVerificationToken = function () {
  const token = generateToken();
  this.emailVerificationTokenHash = hashToken(token);
  this.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  return token;
};

userSchema.methods.createPasswordResetToken = function () {
  const token = generateToken();
  this.passwordResetTokenHash = hashToken(token);
  this.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  return token;
};

userSchema.statics.hashToken = hashToken;

const User = mongoose.model('User', userSchema);

export default User;