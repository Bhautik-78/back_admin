import mongoose, { Schema } from "mongoose"
import timestamps from "mongoose-timestamp"

const finalCampaignSchema = Schema({
  custId: String,
  campaign: {
    resource_name: String,
    geo_target_constant:String,
    id: Number,
    campaign_budget: String,
    name: String,
    App: String,
    target_cpa: {
      target_cpa_micros: Number
    }
  },
  campaign_budget: {resource_name: String, amount_micros: Number},
  metrics: {
    cost_micros: Number,
    cost_micros_gst: Number,
    impressions: Number,
    cost_per_conversion: Number
  },
  countryName: String,
  createdDate: String,
  endDate: String,
  updatedDate: String,
  lastUpdateBid:String,
  geo_target_constant: String,
  Ad_Exchange_revenue : Number,
  Ad_Exchange_revenue_final : Number,
  profitRs: Number,
  profitPR: Number,
  newBid : Number,
  countryCode: String,
  status:String
}).plugin(timestamps)

export const FinalCampaign = mongoose.model("finalCampaign", finalCampaignSchema)
