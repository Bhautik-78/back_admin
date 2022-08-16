import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const campaignCriterionSchema = Schema({
  custId: String,
  campaign: {
    resource_name: String,
    id: Number,
    app: String,
    name: String,
  },
  campaign_criterion: Object,
  createdDate: String,
  lastUpdated: String,
  updatedBidDate: String,
  status:String

}).plugin(timestamps)

export const campaignCriterion = mongoose.model("campaign_criterion", campaignCriterionSchema)


