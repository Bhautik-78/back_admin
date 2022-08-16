import express from "express"
import geotargetconstantController from "./geo_target_constant.controller"

export const geoTargetconstantRouter = express.Router()

geoTargetconstantRouter.route("/create").post(geotargetconstantController.createGtc)
geoTargetconstantRouter.route("/get").get(geotargetconstantController.getGtc)
geoTargetconstantRouter.route("/delete/:id").delete(geotargetconstantController.deleteGtc)
geoTargetconstantRouter.route("/edit/:id").put(geotargetconstantController.editGtcAccount)




