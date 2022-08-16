import express from "express"

import { usersRouter } from "./users"

import {accountRouter} from "./Accounts"
import {customerRouter} from "./Customers"
import {geoTargetconstantRouter} from "./Geo_target_constant"
import {campaignCriterionRouter} from "./Campaign_criterion"
import {campaignRouter} from "./Campaign"
import {settingRouter} from "./Setting"
import {applicationRouter} from "./Application"
import {finalCampaignRouter} from "./NewCampaign"

export const restRouter = express.Router()

// The authorization routes go here Api Routs
restRouter.use("/users", usersRouter)
restRouter.use("/accounts" , accountRouter)
restRouter.use("/customers" , customerRouter)
restRouter.use("/geotargetconstant" , geoTargetconstantRouter)
restRouter.use("/campaignCriterion" , campaignCriterionRouter)
restRouter.use("/campaign" , campaignRouter)
restRouter.use("/setting" , settingRouter)
restRouter.use("/application" , applicationRouter)
restRouter.use("/finalCampaign" , finalCampaignRouter)
