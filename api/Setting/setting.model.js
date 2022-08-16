import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const settingSchema = Schema({
  custId:String,
  share: Number,
  cronJob: Number,
  costShare: Number,
  bidDifference:Number,
  formula: Array
}).plugin(timestamps)

export const Setting = mongoose.model("Setting", settingSchema)
