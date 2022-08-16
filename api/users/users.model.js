import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const userSchema = Schema({
  displayName: String,
  lastName: String ,
  email: String,
  password: String,
  mobileNo: String,
  role: String,
  onboardingStatus: String,
  emailId: String,
  passwordResetIteration: Number,
  passwordResetStatus: String,
  passwordResetDate: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Number },
  lastLoginAttempt: { type: Date }
}).plugin(timestamps)

export const Users = mongoose.model("users", userSchema)
