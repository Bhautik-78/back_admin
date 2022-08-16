import { generateControllers } from "../../modules/query"
import { campaignCriterion } from "./campaign_criterion.model"
import CampaignCriterianJson from "../../JsonData/CampaignCriterianJson"
import { Gtc } from "../Geo_target_constant"
import { fetchCampaignCriteria } from "../Ads/index"
import {Campaign} from "../Campaign";
import app from "../../server";


const moment = require("moment")

const getDate = date => moment(date).format("l")
const todayDate = new Date()

const createRecord = async (req, res) => {
  try {
    const CampaignCriterion = await campaignCriterion.create(req.body)
    res.status(200).send({
      message: "Campaign Criterion  created successfully.",
      CampaignCriterion
    })
  } catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}

const createAndUpdate = async (req, res) => {
  try {
    const custId = req.params.id
    const { xtoken } = req.headers
    const promiseBuilder = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {
        const isExist = await campaignCriterion.findOne({ "campaign.id": payload.campaign.id })
        if (isExist && isExist._id) {
          payload.lastUpdated = getDate(todayDate)
          const isUpdate = await campaignCriterion.updateOne({ _id: isExist._id }, payload)
          if (isUpdate && isUpdate.ok) {
            return resolve({ success: true })
          }
          return resolve({ success: false })
        }
        payload.status = "active"
        payload.createdDate = getDate(todayDate)
        payload.lastUpdated = getDate(todayDate)
        const isCreated = await campaignCriterion.create(payload)
        if (isCreated && isCreated._id) {
          return resolve({ success: true })
        }
        return resolve({ success: false })
      })
    }
    const gtcList = await Gtc.find({})



    if (gtcList && gtcList.length > 0) {
      const allPromises = []
      const result = await fetchCampaignCriteria(xtoken, custId)
      const criterians = result

      await (criterians || []).forEach(payload => {

        const isExist = gtcList.find(u => u.geo_target_constant === payload.campaign_criterion.location.geo_target_constant) || {}

        payload.campaign_criterion.location.countryName = isExist && isExist.countryName || ""
        payload.campaign_criterion.location.countryCode = isExist && isExist.countryCode || ""
        payload.custId = custId
        payload.campaign.app = payload.campaign.app_campaign_setting.app_id
        allPromises.push(promiseBuilder.updateAppPromise(payload))
      })
      await Promise.all(allPromises).then(values => {
        if (values.some(value => value.success)) {
          res.status(200).send({ success: true, message: "Successfully created" })
        } else {
          res.status(200).send({ success: false })
        }
      })
    } else {
      res.status(422).send({ success: true, message: "GTC list not found" })
    }

  } catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}

const getCampaignCriterion = async (req, res) => {
  try {
    let query = {}
    if (req.body) {
      query = req.body
    }
    const CampaignCriterion = await campaignCriterion.find(query)
    res.status(200).send(CampaignCriterion)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const getCampaignCriterionByCustId = async (req, res) => {
  try {
    let query = {}
    if (req.body) {
      query = {
        custId : req.body.custId ,
        "campaign.app" : req.body.appId
      }
    }
    const CampaignCriterion = await campaignCriterion.find(query)
    res.status(200).send(CampaignCriterion)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const deleteCampaignCriterion = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await campaignCriterion.deleteOne({ _id: id })
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const editCampaignCriterion = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const editedRecord = await campaignCriterion.updateOne(
      { _id: id },
      req.body
    )
    res.status(200).send(editedRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

export default generateControllers(campaignCriterion, {
  createAndUpdate,
  createRecord,
  getCampaignCriterion,
  getCampaignCriterionByCustId,
  deleteCampaignCriterion,
  editCampaignCriterion
})
