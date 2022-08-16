import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const applicationSchema = Schema({
  custId:String,
  appId : String,
  appName : String,
  status:String
}).plugin(timestamps)

export const Application = mongoose.model("Application", applicationSchema)
