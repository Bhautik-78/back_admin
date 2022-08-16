import express from "express"
import multer from "multer"
import campaignController from "./campaign.controller"

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "./uploads")
  },
  filename (req, file, cb) {
    cb(null , file.originalname)
  }
})
const upload = multer({ storage })
export const campaignRouter = express.Router()

campaignRouter.route("/").post(campaignController.createAndUpdateCampaign)
campaignRouter.route("/get").get(campaignController.getCampaigns)
campaignRouter.route("/get").post(campaignController.getCampaignByCustIdAndDate)
campaignRouter.route("/excelUpload").post(upload.single("file"), campaignController.uploadExcel)
campaignRouter.route("/delete/:id").delete(campaignController.deleteCampaign)
campaignRouter.route("/selectedRowByBId").post(campaignController.selectedRowBid)
campaignRouter.route("/dayByBId").post(campaignController.dayRowBid)
campaignRouter.route("/selectedRowByBudget").post(campaignController.selectedRowBudget)
campaignRouter.route("/dashboard").post(campaignController.getDataDashBoard)
campaignRouter.route("/deleteCampaign").delete(campaignController.deleteALLCampaign)

