import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const customerSchema = Schema({
  accountId: String,
  customerName: String ,
  customerId: String,
}).plugin(timestamps)

export const Customers = mongoose.model("customers", customerSchema)
