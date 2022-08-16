import express from "express"
import applicationController from "./application.controller"

export const applicationRouter = express.Router()

applicationRouter.route("/create").post(applicationController.createUpdateApplication)
applicationRouter.route("/get").post(applicationController.getApplicaton)
applicationRouter.route("/delete/:id").delete(applicationController.deleteApplication)
applicationRouter.route("/edit/:id").put(applicationController.editApplication)
applicationRouter.route("/get").get(applicationController.getActiveApplication)






