import express from "express"
import settingController from "./setting.controller"

export const settingRouter = express.Router()

// settingRouter.route("/create").post(settingController.createSetting)
settingRouter.route("/create").post(settingController.createUpdateSetting)
settingRouter.route("/get").post(settingController.getSettingData)






