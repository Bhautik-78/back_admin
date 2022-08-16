import _ from "lodash"
import XLSX from "xlsx"
import moment from "moment"
import {fromMicros, toMicros} from "google-ads-api"
import {generateControllers} from "../../modules/query"
import {FinalCampaign} from "./finalCampaign.model"
import {fetchCampaign, finalfetchCampaign, appWiseFetchCampaign, updateCampaignBids} from "../Ads"
import {Setting} from "../Setting"
import {campaignCriterion} from "../Campaign_criterion"
import {
  FindNewBid,
  FindProfitInPer, getDaysBetweenDates,
  GreaterThanDate,
  LastDaysAvgCost,
  LastDaysAvgRevenue,
  LessThanDate
} from "../../commonFunction"
import {deleteFile} from "../../comman"
import {Application} from "../Application"

const getDate = date => moment(date).format("YYYY-MM-DD")
const todayDate = new Date()

const createAndUpdateFinalCampaign = async (req,res) => {
  try {
    const promiseBuilder1 = {
      updateAppPromise: (payload, startDate) => new Promise(async (resolve) => {
        // const isExist = await FinalCampaign.findOne({
        //   "campaign.id": payload.campaign && payload.campaign.id,
        //   "createdDate": startDate
        // })
        // if (isExist && isExist._id) {
        //   const isUpdate = await FinalCampaign.remove({_id: isExist._id, "createdDate": startDate})
        //   if (isUpdate && isUpdate.ok) {
        //     console.log("true")
        //   } else {
        //     console.log("false")
        //   }
        // }
        let cost = payload.metrics.cost_micros || 0
        if (cost !== 0) {
          cost /= 1000000
        }
        payload.status = payload.campaign.status || "active"
        payload.createdDate = startDate
        payload.lastUpdated = getDate(todayDate)
        payload.metrics.cost_micros_gst = toMicros((cost !== 0 ? cost + (cost * (18 / 100)) : 0))
        const isCreated = await FinalCampaign.create(payload)
        if (isCreated && isCreated._id) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }
    const promiseBuilder = {
      updateAppPromise: (item,xtoken) => new Promise(async (resolve) => {
        const filterList = []
        const filterList1 = await finalfetchCampaign(xtoken, item.custId, item.Date)
        filterList.push(...filterList1)

        const CampaignCriterion = await campaignCriterion.find({custId: item.custId})
        const quary = {custId: item.custId}
        const settings = await Setting.findOne(quary)
        if (filterList && filterList.length > 0) {
          // filterList.forEach(payload => {
          for (const payload of filterList) {
            const details = Array.isArray(CampaignCriterion) && CampaignCriterion.find(r => r.campaign.id === payload.campaign.id) || {}

            const location = details && details.campaign_criterion && details.campaign_criterion.location
            payload.countryName = location && details.campaign_criterion.location.countryName || ""

            const cpCriterion = CampaignCriterion.find(cp => cp.campaign.app === payload.campaign.app_campaign_setting.app_id && cp.campaign_criterion.location.countryName === payload.countryName)
            const allPromises1 = []

            // const isValid = true
            if (cpCriterion) {
              // if (!cpCriterion.updatedBidDate) {
              //   isValid = true
              // } else {
              //   const start = moment(item.Date)
              //   const end = moment(cpCriterion.updatedBidDate)
              //   const duration = moment.duration(start.diff(end))
              //   const days = duration.asDays()
              //   isValid = true // days >= settings.bidDifference
              // }
              // if (isValid) {
              payload.countryCode = location && details.campaign_criterion.location.countryCode || ""
              payload.geo_target_constant = location && details.campaign_criterion.location.geo_target_constant || ""
              payload.custId = item.custId
              payload.campaign.App = payload.campaign.app_campaign_setting.app_id
              allPromises1.push(promiseBuilder1.updateAppPromise(payload, item.Date))
              // }
              await Promise.all(allPromises1).then(values => {
                if (values.some(value => value.success)) {
                  return resolve({success: true})
                }
                return resolve({success: false})
              })
            }
          }
        }else {
          return resolve({success: false})
        }
      })
    }
    if (!req.body) {
      res.status(200).send({success: false, message: "please send valid data"})
    }else {
      const {appId, startDate, endDate} = req.body
      const {xtoken} = req.headers
      const dateList = getDaysBetweenDates(startDate, endDate)
      const application = await Application.findOne({appId})
      const isUpdate = await FinalCampaign.remove({})
      if (isUpdate && isUpdate.ok) {
        console.log("true")
      } else {
        console.log("false")
      }
      const result = dateList.map(item => ({
        Date: item,
        custId: application.custId
      }))

      const allPromises =[]
      result.forEach(payload => {
        allPromises.push(promiseBuilder.updateAppPromise(payload,xtoken))
      })
      await Promise.all(allPromises).then(async (values) => {
        if (values.some(value => value.success)) {
          res.status(200).send({success: true, message: "Successfully created"})
        } else {
          res.status(200).send({success: false})
        }
      })
    }
  }catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const createAndUpdateFinalCampaignByApps = async (req,res) => {
  try {
    const promiseBuilder = {
      updateAppPromise: (payload, startDate) => new Promise(async (resolve) => {
        const isExist = await FinalCampaign.findOne({
          "campaign.id": payload.campaign && payload.campaign.id,
          "createdDate": startDate
        })
        if (isExist && isExist._id) {
          const isUpdate = await FinalCampaign.remove({_id: isExist._id, "createdDate": startDate})
          if (isUpdate && isUpdate.ok) {
            console.log("true")
          } else {
            console.log("false")
          }
        }
        let cost = payload.metrics.cost_micros || 0
        if (cost !== 0) {
          cost /= 1000000
        }
        payload.status = payload.campaign.status || "active"
        payload.createdDate = startDate
        payload.lastUpdated = getDate(todayDate)
        payload.metrics.cost_micros_gst = toMicros((cost !== 0 ? cost + (cost * (18 / 100)) : 0))
        const isCreated = await FinalCampaign.create(payload)
        if (isCreated && isCreated._id) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }

    if (!req.body) {
      res.status(200).send({success: false, message: "please send valid data"})
    } else {
      const {Date, appId} = req.body
      const {xtoken} = req.headers
      const application = await Application.findOne({appId})
      const {custId} = application
      const allPromises = []
      // const filterList = CampaignJson
      const filterList = []
      const filterList1 = await appWiseFetchCampaign(xtoken, custId,appId, Date)
      filterList.push(...filterList1)
      const CampaignCriterion = await campaignCriterion.find({custId})
      const quary = {custId}
      const settings = await Setting.findOne(quary)
      if (filterList && filterList.length > 0) {
        filterList.forEach(payload => {
          const details = Array.isArray(CampaignCriterion) && CampaignCriterion.find(r => r.campaign.id === payload.campaign.id) || {}

          const location = details && details.campaign_criterion && details.campaign_criterion.location
          payload.countryName = location && details.campaign_criterion.location.countryName || ""

          const cpCriterion = CampaignCriterion.find(cp => cp.campaign.app === payload.campaign.app_campaign_setting.app_id && cp.campaign_criterion.location.countryName === payload.countryName)

          let isValid = true
          if (cpCriterion) {
            if (!cpCriterion.updatedBidDate) {
              isValid = true
            } else {
              const start = moment(Date)
              const end = moment(cpCriterion.updatedBidDate)
              const duration = moment.duration(start.diff(end))
              const days = duration.asDays()
              isValid = true // days >= settings.bidDifference
            }
            if (isValid) {
              payload.countryCode = location && details.campaign_criterion.location.countryCode || ""
              payload.geo_target_constant = location && details.campaign_criterion.location.geo_target_constant || ""
              payload.custId = custId
              payload.campaign.App = payload.campaign.app_campaign_setting.app_id
              allPromises.push(promiseBuilder.updateAppPromise(payload, Date))
            }
          }
        })
        await Promise.all(allPromises).then(values => {
          if (values.some(value => value.success)) {
            res.status(200).send({success: true, message: "Successfully created"})
          } else {
            res.status(200).send({success: false, message: "There are not records are found!"})
          }
        })
      } else {
        res.status(200).send({success: true, message: "no data available"})
      }
    }
  }catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const loadDataForCampaign = async (req, res) => {
  try {
    if (!req.body) {
      res.status(200).send({success: false, message: "please send valid data"})
    } else {
      const {appId,startDate,endDate} = req.body
      const dateList = getDaysBetweenDates(startDate, endDate)

      const application = await Application.findOne({appId})
      let query = {}
      if (req.body) {
        query = {
          custId : application.custId,
          "campaign.App" : appId,
          createdDate : {$gte: startDate, $lte: endDate}
        }
      }
      const filter = await FinalCampaign.find(query)
      if(filter.length){
        const groupByDate = _.mapValues(_.groupBy(filter, "createdDate"))
        const payload = dateList.map(item => {
          const result = Object.keys(groupByDate || {}).map((key) => ({
            Date: item,
            appId,
            Ad_Exchange_revenue : _.sumBy(groupByDate[item], (item) => item.Ad_Exchange_revenue) || 0,
            Ad_Exchange_revenue_final: _.sumBy(groupByDate[item], (item) => item.Ad_Exchange_revenue_final) || 0,
            cost_micros : _.sumBy(groupByDate[item], (item) => item.metrics.cost_micros) || 0,
            cost_micros_gst : _.sumBy(groupByDate[item], (item) => item.metrics.cost_micros_gst) || 0
          }))
          return result[0]
        })
        res.status(200).send({success: true,payload})
      }else {
        const payload = dateList.map(item => ({
          Date : item,
          appId,
          Ad_Exchange_revenue :  0,
          Ad_Exchange_revenue_final:  0,
          cost_micros : 0,
          cost_micros_gst : 0
        }))
        res.status(200).send({success: true,payload})
      }
    }
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const processExcel = workbook => {
  const sheetNamesList = workbook.SheetNames
  const filesData = {}
  sheetNamesList.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName]
    const headers = {}
    const data = []
    for (const z in worksheet) {
      if (z[0] === "!") continue
      let tt = 0
      for (let i = 0; i < z.length; i++) {
        if (!isNaN(z[i])) {
          tt = i
          break
        }
      }
      const col = z.substring(0, tt)
      const row = parseInt(z.substring(tt))
      const value = worksheet[z].v
      if (row == 1 && value) {
        headers[col] = value
        continue
      }
      if (!data[row]) data[row] = {}
      if (headers[col] === "Date") {
        const parsedDate = moment(value).add("day", 1).format("YYYY-MM-DD")
        data[row][headers[col]] = parsedDate
      } else {
        data[row][headers[col]] = value
      }

    }
    data.shift()
    data.shift()
    filesData[sheetName] = data
  })
  return filesData
}

const uploadExcel = async (req, res) => {
  try {
    const promiseBuilder = {
      updateAppPromise: (payloads,payload, share) => new Promise(async (resolve) => {
        const where = {
          "campaign.name": payloads.campaign.name,
          custId: payloads.custId,
          "campaign.App": payloads.campaign.App,
          createdDate : moment(payload.Date).format("YYYY-MM-DD")
        }
        const fromCPA = fromMicros(payloads.campaign.target_cpa.target_cpa_micros)
        const CPAPR = ((fromCPA * share) / 100)
        const latestBid = toMicros((fromCPA + CPAPR))
        const updateColumns = {
          Ad_Exchange_revenue: 0,
          Ad_Exchange_revenue_final: 0,
          profitRs: 0,
          profitPR: 0
        }
        const isUpdate = await FinalCampaign.updateOne(where, {$set: updateColumns, newBid: latestBid})
        if (isUpdate && isUpdate.ok) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }

    const promiseBuilderForExcel = {
      updateAppPromise: (payload,customerId) => new Promise(async (resolve) => {

        const date = moment(payload.Date).format("YYYY-MM-DD")
        const Where = {"campaign.App": payload["App ID"], countryName: payload.Country, createdDate: date, custId : customerId}
        const campaign = await FinalCampaign.findOne(Where)

        if (campaign && campaign._id) {
          const quary = {custId: campaign.custId}

          const settings = await Setting.find(quary)

          let lastBid = 0

          const gDate = GreaterThanDate(settings[0])
          const lDate = LessThanDate()
          const fetchRecord = await FinalCampaign.find({
            "campaign.App": payload["App ID"],
            countryName: payload.Country,
            custId: campaign.custId,
            createdDate: {$gte: gDate, $lte: lDate}
          })
          // if (fetchRecord.length === 3) {
          //   const finalCost = LastDaysAvgCost(fetchRecord)
          //   const fnRevenue = LastDaysAvgRevenue(fetchRecord)
          //   const profitPR = FindProfitInPer(fnRevenue, finalCost)
          //   const fromCPA = fromMicros((fetchRecord[0]).campaign.target_cpa.target_cpa_micros)
          //   lastBid = FindNewBid(settings, fromCPA, profitPR)
          // }
          // Single Bid Changes
          const cost = campaign && campaign.metrics && campaign.metrics.cost_micros_gst || 0
          const rShare = settings[0].share || 0

          const fromMicroCost = fromMicros(cost)
          const revenue = payload["Ad Exchange revenue (₹)"] || 0
          const revenueShare = ((revenue * rShare) / 100) || 0

          const fnRevenue = revenue - revenueShare || 0
          const profitRs = fnRevenue - fromMicroCost || 0
          const profitPR = (profitRs === 0 || revenue === 0) ? null : (fromMicroCost === 0 ? ((profitRs / profitRs)) * 100 : ((profitRs / fromMicroCost)) * 100) || 0
          const updateColumns = {
            Ad_Exchange_revenue: revenue || 0,
            Ad_Exchange_revenue_final: fnRevenue || 0,
            profitRs,
            profitPR
          }
          const fromCPA = fromMicros(campaign.campaign.target_cpa.target_cpa_micros)
          const fromCPI = fromMicros(campaign.metrics.cost_per_conversion)

          // if (fetchRecord.length < 3) {
          if (fetchRecord.length) {
            if (profitPR < 0) {
              if (fromCPI < fromCPA) {
                if (fromCPI === 0) {
                  lastBid = FindNewBid(settings, fromCPA, profitPR)
                } else {
                  lastBid = FindNewBid(settings, fromCPI, profitPR)
                }
              } else {
                lastBid = FindNewBid(settings, fromCPA, profitPR)
              }
            } else if (fromMicroCost === 0) {
              const CPAPR = ((fromCPA * settings[0].costShare) / 100)
              lastBid = toMicros((fromCPA + CPAPR))

            } else {
              lastBid = FindNewBid(settings, fromCPA, profitPR)
            }
          }
          const isUpdate = await FinalCampaign.updateOne(Where, {$set: updateColumns, newBid: lastBid})

          const allPromises1 = []

          if (isUpdate && isUpdate.ok) {
            const blank = await FinalCampaign.find({"Ad_Exchange_revenue": {"$exists": false}})
            const share = settings[0].costShare
            if (blank.length) {
              blank.forEach(payloads => {
                allPromises1.push(promiseBuilder.updateAppPromise(payloads, payload,share))
              })
            }
            await Promise.all(allPromises1).then(values => {
              if (values.some(value => value.success)) {
                return resolve({success: true})
              }
              return resolve({success: false})
            })
          }
          return resolve({success: false})
        }
        return resolve({success: false})
      })
    }

    const {startDate, appId} = req.body
    const {file} = req
    const application = await Application.findOne({appId})
    const {custId} = application

    const workbook = XLSX.readFile(`./uploads/${file.originalname}`, {
      cellDates: true
    })
    const data = processExcel(workbook)
    const filterData = []
    const allPromises = []
    Object.keys(data).forEach((v) => {
      const filterData1 = data[v].filter(r => r.Date && moment(getDate(r.Date)).isSame(startDate))
      filterData.push(...filterData1)
    })
    if (filterData && filterData.length > 0) {
      // filterData = filterData.filter(dd => dd.Country === "Saudi Arabia")
      filterData.forEach(payload => {
        allPromises.push(promiseBuilderForExcel.updateAppPromise(payload,custId))
      })
      await Promise.all(allPromises).then(async (values) => {
        deleteFile(file.originalname)
        if (values.some(value => value.success)) {
          res.status(200).send({success: true, message: "Successfully created"})
        } else {
          res.status(200).send({success: false})
        }
      })
    } else {
      res.status(200).send({success: true, message: "No Data Found"})
    }
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const getDataForLatestCampaign = async (req,res) => {
  try {
    const {appId, startDate, endDate} = req.body
    const application = await Application.findOne({appId})
    let query = {}
    if (req.body) {
      query = {
        custId: application.custId,
        "campaign.App": appId,
        createdDate: {$gte: startDate, $lte: endDate}
      }
    }
    const campaign = await FinalCampaign.find(query)

    const groupByCountry = _.mapValues(_.groupBy(campaign, "countryName") , app => app.map(value => _.omit(value, "countryName")))
    const payload = Object.keys(groupByCountry).map((key) =>({
      target_cpa_micros : groupByCountry[key][0].campaign.target_cpa.target_cpa_micros || 0,
      App : groupByCountry[key][0].campaign.App,
      name : groupByCountry[key][0].campaign.name,
      amount_micros : groupByCountry[key][0].campaign_budget.amount_micros || 0,
      cost_micros : _.sumBy(groupByCountry[key], (key) => key.metrics.cost_micros) || 0,
      cost_micros_gst : _.sumBy(groupByCountry[key], (key) => key.metrics.cost_micros_gst) || 0,
      cost_per_conversion : _.sumBy(groupByCountry[key], (key) => (key.metrics.impressions * (key.metrics.cost_per_conversion / 1000000))) / _.sumBy(groupByCountry[key], (key) => key.metrics.impressions) || 0,
      countryName : key,
      countryCode : groupByCountry[key][0].countryCode,
      geo_target_constant : groupByCountry[key][0].geo_target_constant,
      id : groupByCountry[key][0].campaign.id,
      _id : groupByCountry[key][0]._id,
      resource_name : groupByCountry[key][0].campaign.resource_name,
      custId : groupByCountry[key][0].custId,
      status : groupByCountry[key][0].status,
      newBid : groupByCountry[key][0].newBid || 0,
      Ad_Exchange_revenue : _.sumBy(groupByCountry[key], (key) => key.Ad_Exchange_revenue) || 0,
      Ad_Exchange_revenue_final : _.sumBy(groupByCountry[key], (key) => key.Ad_Exchange_revenue_final) || 0,
      updatedAtBid : groupByCountry[key][0].lastUpdateBid
    }))
    res.status(200).send({success: true, payload})
  }catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const selectedRowBid = async (req, res) => {
  try {
    const {xtoken} = req.headers
    const {appId, rows} = req.body
    const application = await Application.findOne({appId})
    const {custId} = application
    const promiseBuilder = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {
        const update = await FinalCampaign.update({
          "campaign.id": payload.id,
        }, {$set: {lastUpdateBid: new Date(), "campaign.target_cpa.target_cpa_micros":  payload.newBid}}, { multi: true})
        if (update) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }
    if (!rows) {
      res.status(200).send({success: false, message: "please send valid data"})
    } else {
      const allPromises = (rows || []).map(payload => promiseBuilder.updateAppPromise(payload))

      const payloads = (rows || [])
        .filter(p => p.newBid > 0)
        .map(row => {
          const payload = {
            resource_name: row.resource_name,
            target_cpa_micros: row.newBid,
          }
          return payload
        })
      await updateCampaignBids(xtoken, custId, payloads)
      await Promise.all(allPromises).then(values => {
        if (values.some(value => value.success)) {
          res.status(200).send({success: true, message: "Successfully Updated"})
        } else {
          res.status(200).send({success: false, message: "something went wrong"})
        }
      })
      // res.status(200).send({ success: true, message: "Successfully Updated" })
    }
  } catch (err) {
    console.log(err)
    res.status(422).send({success: false, message: err.message})
  }
}

const getDataForAllCampaign = async (req, res) => {
  try {
    const {date} = req.body
    const filter = await FinalCampaign.find({createdDate : date})

    const GroupByRecord = _.groupBy(filter, "campaign.App")

    const result = Object.keys(GroupByRecord).map(key => ({
      Date: GroupByRecord[key][0].createdDate,
      appId : GroupByRecord[key][0].campaign.App,
      Ad_Exchange_revenue : _.sumBy(GroupByRecord[key], (key) => key.Ad_Exchange_revenue) || 0,
      Ad_Exchange_revenue_final: _.sumBy(GroupByRecord[key], (key) => key.Ad_Exchange_revenue_final) || 0,
      cost_micros : _.sumBy(GroupByRecord[key], (key) => key.metrics.cost_micros) || 0,
      cost_micros_gst : _.sumBy(GroupByRecord[key], (key) => key.metrics.cost_micros_gst) || 0
    }))
    res.status(200).send({success: true, result})
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const getDataForDashboard = async (req, res) => {
  try {
    const { startDate, endDate, App} = req.body
    const application = await Application.findOne({appId : App})
    const { custId} = application

    const campaign = await FinalCampaign.find({
      custId,
      "campaign.App": App,
      createdDate: {$gte: startDate, $lte: endDate}
    })
    const groupByDate = _.mapValues(_.groupBy(campaign, "createdDate") , app => app.map(value => _.omit(value, "Country")))
    const payload = Object.keys(groupByDate).map((key) =>({
      Date: key,
      Ad_Exchange_revenue : _.sumBy(groupByDate[key], (key) => key.Ad_Exchange_revenue),
      profitPR : _.sumBy(groupByDate[key], (key) => key.profitPR),
      profitRs : _.sumBy(groupByDate[key], (key) => key.profitRs),
      cost_micros : _.sumBy(groupByDate[key], (key) => key.metrics.cost_micros)
    }))

    const sum = {Ad_Exchange_revenue: 0, profitPR: 0, profitRs: 0, cost_micros: 0}
    campaign.forEach(item => {
      sum.Ad_Exchange_revenue += item.Ad_Exchange_revenue
      sum.profitPR += item.profitPR
      sum.profitRs += item.profitRs
      sum.cost_micros += item.metrics.cost_micros
    })
    res.status(200).send({success: true, sum, payload})
  }catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

export default generateControllers(FinalCampaign, {
  createAndUpdateFinalCampaign,
  loadDataForCampaign,
  uploadExcel,
  createAndUpdateFinalCampaignByApps,
  getDataForLatestCampaign,
  selectedRowBid,
  getDataForAllCampaign,
  getDataForDashboard
})
