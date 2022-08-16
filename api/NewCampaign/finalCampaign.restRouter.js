import express from "express"
import multer from "multer"
import finalCampaignController from "./finalCampaign.controller"

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "./uploads")
  },
  filename (req, file, cb) {
    cb(null , file.originalname)
  }
})
const upload = multer({ storage })
export const finalCampaignRouter = express.Router()

finalCampaignRouter.route("/create").post(finalCampaignController.createAndUpdateFinalCampaign)
finalCampaignRouter.route("/createOne").post(finalCampaignController.createAndUpdateFinalCampaignByApps)
finalCampaignRouter.route("/get").post(finalCampaignController.loadDataForCampaign)
finalCampaignRouter.route("/excelUpload").post(upload.single("file"), finalCampaignController.uploadExcel)

finalCampaignRouter.route("/getData").post(finalCampaignController.getDataForLatestCampaign)
finalCampaignRouter.route("/selectedRowByBId").post(finalCampaignController.selectedRowBid)

finalCampaignRouter.route("/getAllCampaign").post(finalCampaignController.getDataForAllCampaign)

finalCampaignRouter.route("/dashboard").post(finalCampaignController.getDataForDashboard)