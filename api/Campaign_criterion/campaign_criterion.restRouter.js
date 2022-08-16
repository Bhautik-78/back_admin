import express from "express"
import campaignCriterionController from "./campaign_criterion.controller"

export const campaignCriterionRouter = express.Router()

campaignCriterionRouter.route("/:id").get(campaignCriterionController.createAndUpdate)
campaignCriterionRouter.route("/create").post(campaignCriterionController.createRecord)
campaignCriterionRouter.route("/get").get(campaignCriterionController.getCampaignCriterion)
campaignCriterionRouter.route("/get").post(campaignCriterionController.getCampaignCriterionByCustId)
campaignCriterionRouter.route("/delete/:id").delete(campaignCriterionController.deleteCampaignCriterion)
campaignCriterionRouter.route("/edit/:id").put(campaignCriterionController.editCampaignCriterion)



