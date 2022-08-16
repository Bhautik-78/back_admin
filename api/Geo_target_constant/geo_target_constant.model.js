import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const gtcSchema = Schema({
  countryCode: String,
  countryName: String ,
  geo_target_constant: String,
  status:String

}).plugin(timestamps)

export const Gtc = mongoose.model("Geo_target_constant", gtcSchema)
