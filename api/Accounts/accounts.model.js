import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const accountSchema = Schema({
  accountName: String,
  email: String ,
  clientId: String,
  secretKey: String,
  devlopToken: String,
  callBack: String,
  loginCustomerId: String,
}).plugin(timestamps)

export const Accounts = mongoose.model("accounts", accountSchema)
