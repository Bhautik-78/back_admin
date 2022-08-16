import moment from "moment"
import XLSX from "xlsx"
import _ from "lodash"
import {fromMicros, toMicros} from "google-ads-api"
import {Campaign} from "./campaign.model"
import {generateControllers} from "../../modules/query"
import CampaignJson from "../../JsonData/Campaign"
import {campaignCriterion} from "../Campaign_criterion/campaign_criterion.model"
import {Setting} from "../Setting/setting.model"
import {deleteFile} from "../../comman"
import {updateCampaignBids, fetchCampaign} from "../Ads"
import {
  FindNewBid,
  FindProfitInPer,
  GreaterThanDate,
  LastDaysAvgCost,
  LastDaysAvgRevenue,
  LessThanDate
} from "../../commonFunction"
import {Application} from "../Application";

const getDate = date => moment(date).format("YYYY-MM-DD")
const todayDate = new Date()

const createAndUpdateCampaign = async (req, res) => {
  try {
    const promiseBuilder = {
      updateAppPromise: (payload, startDate) => new Promise(async (resolve) => {
        const isExist = await Campaign.findOne({
          "campaign.id": payload.campaign && payload.campaign.id,
          "createdDate": startDate
        })
        if (isExist && isExist._id) {
          // if(endDate){
          // {$lte:"2014-3-5"}
          // $gte: gDate, $lte: lDate
          //   const isUpdate = await Campaign.remove({ _id: isExist._id, "createdDate": startDate })
          // }
          const isUpdate = await Campaign.remove({_id: isExist._id, "createdDate": startDate})
          // payload.lastUpdated = getDate(todayDate)
          // const isUpdate = await Campaign.updateOne({ _id: isExist._id, "createdDate": startDate }, payload)
          if (isUpdate && isUpdate.ok) {
            console.log("true")
            // return resolve({ success: true })
          } else {
            console.log("false")
          }
          // return resolve({ success: false })
        }
        let cost = payload.metrics.cost_micros || 0
        if (cost !== 0) {
          cost /= 1000000
        }
        payload.status = payload.campaign.status || "active"
        payload.createdDate = startDate
        payload.lastUpdated = getDate(todayDate)
        payload.metrics.cost_micros_gst = toMicros((cost !== 0 ? cost + (cost * (18 / 100)) : 0))
        const isCreated = await Campaign.create(payload)
        if (isCreated && isCreated._id) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }

    if (!req.body) {
      res.status(200).send({success: false, message: "please send valid data"})
    } else {
      const {customerId,appId, startDate, endDate} = req.body
      const {xtoken} = req.headers
      const allPromises = []
      // const filterList = CampaignJson
      const filterList = []
      if (endDate) {
        console.log("endDate")
        const filterList1 = await fetchCampaign(xtoken, customerId,appId, startDate, endDate)
        filterList.push(...filterList1)
      } else {
        console.log("start")
        const filterList1 = await fetchCampaign(xtoken, customerId,appId, startDate)
        filterList.push(...filterList1)
      }
      // const filterList1 = await fetchCampaign(xtoken, customerId, startDate)
      // const filterList = filterList1
      // console.log("filterList",filterList)
      const CampaignCriterion = await campaignCriterion.find({custId: customerId})
      const quary = {custId: customerId}
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
              const start = moment(startDate)
              const end = moment(cpCriterion.updatedBidDate)
              const duration = moment.duration(start.diff(end))
              const days = duration.asDays()
              isValid = true // days >= settings.bidDifference
            }
            if (isValid) {
              payload.countryCode = location && details.campaign_criterion.location.countryCode || ""
              payload.geo_target_constant = location && details.campaign_criterion.location.geo_target_constant || ""
              payload.custId = customerId
              payload.campaign.App = payload.campaign.app_campaign_setting.app_id
              allPromises.push(promiseBuilder.updateAppPromise(payload, startDate))
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
  } catch (err) {
    console.log(err)
    res.status(422).send({success: false, message: err.message})
  }
}

const getCampaigns = async (req, res) => {
  try {
    let query = {}
    if (req.body) {
      query = req.body
    }
    const campaign = await Campaign.find(query)
    res.status(200).send(campaign)
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const getCampaignByCustIdAndDate = async (req, res) => {
  try {
    let query = {}
    if (req.body && req.body.createdDate) {
      if (req.body.custId && req.body.App) {
        query = {
          custId: req.body.custId,
          "campaign.App": req.body.App,
          createdDate: getDate(req.body.createdDate)
        }
      } else {
        query = {createdDate: getDate(req.body.createdDate)}
      }
    }
    const campaign = await Campaign.find(query)
    res.status(200).send(campaign)
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

const uploadExcel1 = async (req, res) => {
  try {
    const promiseBuilderForExcel = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {
        const date = moment(payload.Date).format("YYYY-MM-DD")
        const Where = {"campaign.App": payload["App ID"], countryName: payload.Country, createdDate: date}
        const campaign = await Campaign.findOne(Where)
        if (campaign && campaign._id) {
          const quary = {custId: campaign.custId}
          const settings = await Setting.findOne(quary)

          const cost = campaign && campaign.metrics && campaign.metrics.cost_micros_gst || 0
          const rShare = settings.share || 0

          const fromMicroCost = fromMicros(cost)
          const revenue = payload["Ad Exchange revenue (₹)"]
          const revenueShare = ((revenue * rShare) / 100)
          const fnRevenue = revenue - revenueShare
          const profitRs = fnRevenue - fromMicroCost
          const profitPR = fromMicroCost === 0 ? ((profitRs / profitRs)) * 100 : ((profitRs / fromMicroCost)) * 100
          const updateColumns = {
            Ad_Exchange_revenue: revenue,
            Ad_Exchange_revenue_final: fnRevenue,
            profitRs,
            profitPR
          }

          const fromCPA = fromMicros(campaign.campaign.target_cpa.target_cpa_micros)

          const newBid = FindNewBid(settings, fromCPA, profitPR)

          const isUpdate = await Campaign.update(Where, {$set: updateColumns, newBid})
          if (isUpdate && isUpdate.ok) {
            resolve({success: true})
          }
          return resolve({success: false})
        }
        return resolve({success: false, message: "campaign is not found"})
      })
    }

    const {startDate} = req.body
    const {file} = req
    const workbook = XLSX.readFile(`./uploads/${file.originalname}`, {
      cellDates: true
    })
    const data = processExcel(workbook)
    let filterData = []
    const allPromises = []

    Object.keys(data).forEach((v) => {
      filterData = data[v]// .filter(r => r.Date && moment(getDate(r.Date)).isSame(startDate))
    })
    if (filterData && filterData.length > 0) {
      filterData.forEach(payload => {
        allPromises.push(promiseBuilderForExcel.updateAppPromise(payload))
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

const deleteCampaign = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await Campaign.deleteOne({_id: id})
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const deleteALLCampaign = async (req, res) => {
  try {
    const {source} = req.body
    const promiseBuilder = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {
        const deleted = await Campaign.deleteOne({_id: payload._id})
        if (deleted) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }

    const allPromises = []

    if (source && source.length > 0) {
      source.forEach(payload => {
        allPromises.push(promiseBuilder.updateAppPromise(payload))
      })
      await Promise.all(allPromises).then(async (values) => {
        if (values.some(value => value.success)) {
          res.status(200).send({success: true, message: "Successfully deleted"})
        } else {
          res.status(200).send({success: false})
        }
      })
    } else {
      res.status(200).send({success: true, message: "No Data Found"})
    }
  } catch (err) {
    console.log(err)
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
        payload.campaign.target_cpa.target_cpa_micros = payload.newBid
        payload.lastUpdateBid = new Date()
        const updateRecord = await Campaign.updateOne({_id: payload._id}, payload)
        if (updateRecord && updateRecord.ok) {
          resolve({success: true})
        }
        resolve({success: false})
        const update = await campaignCriterion.updateOne({
          "campaign.id": payload.campaign.id,
          "campaign.app": payload.campaign.App,
          "campaign_criterion.location.countryName": payload.countryName
        }, {$set: {updatedBidDate: getDate(todayDate)}})
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
            resource_name: row.campaign.resource_name,
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

const uploadExcel = async (req, res) => {
  try {
    const promiseBuilder = {
      updateAppPromise: (payload, share) => new Promise(async (resolve) => {
        const where = {
          "campaign.name": payload.campaign.name,
          custId: payload.custId,
          "campaign.App": payload.campaign.App
        }
        const fromCPA = fromMicros(payload.campaign.target_cpa.target_cpa_micros)
        const CPAPR = ((fromCPA * share) / 100)
        const latestBid = toMicros((fromCPA + CPAPR))
        const updateColumns = {
          Ad_Exchange_revenue: 0,
          Ad_Exchange_revenue_final: 0,
          profitRs: 0,
          profitPR: 0
        }
        const isUpdate = await Campaign.updateOne(where, {$set: updateColumns, newBid: latestBid})
        if (isUpdate && isUpdate.ok) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }

    const promiseBuilderForExcel = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {

        const date = moment(payload.Date).format("YYYY-MM-DD")
        const Where = {"campaign.App": payload["App ID"], countryName: payload.Country, createdDate: date}
        const campaign = await Campaign.findOne(Where)

        if (campaign && campaign._id) {
          const quary = {custId: campaign.custId}

          const settings = await Setting.find(quary)

          let lastBid = 0

          const gDate = GreaterThanDate(settings[0])
          const lDate = LessThanDate()
          const fetchRecord = await Campaign.find({
            "campaign.App": payload["App ID"],
            countryName: payload.Country,
            custId: campaign.custId,
            createdDate: {$gte: gDate, $lte: lDate}
          })
          if (fetchRecord.length === 3) {
            const finalCost = LastDaysAvgCost(fetchRecord)
            const fnRevenue = LastDaysAvgRevenue(fetchRecord)
            const profitPR = FindProfitInPer(fnRevenue, finalCost)
            const fromCPA = fromMicros((fetchRecord[0]).campaign.target_cpa.target_cpa_micros)
            lastBid = FindNewBid(settings, fromCPA, profitPR)
          }
          // Single Bid Changes
          const cost = campaign && campaign.metrics && campaign.metrics.cost_micros_gst || 0
          const rShare = settings[0].share || 0

          const fromMicroCost = fromMicros(cost)
          const revenue = payload["Ad Exchange revenue (₹)"] || 0

          const revenueShare = ((revenue * rShare) / 100) || 0

          const fnRevenue = revenue - revenueShare || 0
          const profitRs = fnRevenue - fromMicroCost || 0
          const profitPR = profitRs === 0 ? -100 : (fromMicroCost === 0 ? ((profitRs / profitRs)) * 100 : ((profitRs / fromMicroCost)) * 100) || 0
          const updateColumns = {
            Ad_Exchange_revenue: revenue || 0,
            Ad_Exchange_revenue_final: fnRevenue || 0,
            profitRs,
            profitPR
          }
          const fromCPA = fromMicros(campaign.campaign.target_cpa.target_cpa_micros)
          const fromCPI = fromMicros(campaign.metrics.cost_per_conversion)

          if (fetchRecord.length < 3) {
            if(profitPR < 0){
              if(fromCPI < fromCPA){
                lastBid = FindNewBid(settings, fromCPI, profitPR)
              }else {
                lastBid = FindNewBid(settings, fromCPA, profitPR)
              }
            }else {
              lastBid = FindNewBid(settings, fromCPA, profitPR)
            }
          }
          const isUpdate = await Campaign.updateOne(Where, {$set: updateColumns, newBid: lastBid})

          const allPromises1 = []

          if (isUpdate && isUpdate.ok) {
            const blank = await Campaign.find({"Ad_Exchange_revenue": {"$exists": false}})
            const share = settings[0].costShare
            if (blank.length) {
              blank.forEach(payload => {
                allPromises1.push(promiseBuilder.updateAppPromise(payload, share))
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
    const {startDate, endDate} = req.body
    const {file} = req
    const workbook = XLSX.readFile(`./uploads/${file.originalname}`, {
      cellDates: true
    })

    const data = processExcel(workbook)
    const filterData = []
    const allPromises = []

    if(endDate) {
      const payload = []
      Object.keys(data).forEach((v) => {
        const filterData1 = data[v].filter(r => {
          const currentdate = new Date(r.Date)
          return currentdate >= new Date(startDate) && currentdate <= new Date(endDate)
        })
        if (filterData1) {
          payload.push(...filterData1)
        }
      })
      const groupedBYCountry = _.mapValues(_.groupBy(payload, "Country"), app => app.map(value => _.omit(value, "Country")))
      console.log("groupedBYCountry",groupedBYCountry)
      const result = Object.keys(groupedBYCountry).map((key) =>{
        const gfg = _.sortBy(groupedBYCountry[key], [function(o) { return o.Date }])
        return {
          Date: startDate,
          Country: key,
          "Ad Exchange revenue (₹)": _.sumBy(gfg, (country) => country["Ad Exchange revenue (₹)"]),
          "App ID": gfg[0]["App ID"]
        }
      })
      filterData.push(...result)
    }else {
      Object.keys(data).forEach((v) => {
        const filterData1 = data[v].filter(r => r.Date && moment(getDate(r.Date)).isSame(startDate))
        filterData.push(...filterData1)
      })
    }

    if (filterData && filterData.length > 0) {
      filterData.forEach(payload => {
        allPromises.push(promiseBuilderForExcel.updateAppPromise(payload))
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
    // if(endDate){
    //   const filterData = []
    //   const allPromises = []
    //
    //   Object.keys(data).forEach(v => {
    //     const groupedBYCountry = _.mapValues(_.groupBy(data[v], "Country"), app => app.map(value => _.omit(value, "Country")))
    //     const result = Object.keys(groupedBYCountry).map((key) =>{
    //       const gfg = _.sortBy(groupedBYCountry[key], [function(o) { return o.Date }])
    //       return {
    //         Date: startDate,
    //         Country: key,
    //         "Ad Exchange revenue (₹)": _.sumBy(gfg, (country) => country["Ad Exchange revenue (₹)"]),
    //         "App ID": gfg[0]["App ID"]
    //       }
    //     })
    //     filterData.push(...result)
    //   })
    //   if (filterData && filterData.length > 0) {
    //     filterData.forEach(payload => {
    //       allPromises.push(promiseBuilderForExcel.updateAppPromise(payload))
    //     })
    //     await Promise.all(allPromises).then(async (values) => {
    //       deleteFile(file.originalname)
    //       if (values.some(value => value.success)) {
    //         res.status(200).send({success: true, message: "Successfully created"})
    //       } else {
    //         res.status(200).send({success: false})
    //       }
    //     })
    //   } else {
    //     res.status(200).send({success: true, message: "No Data Found"})
    //   }
    // }else {
    //   let filterData = []
    //   const allPromises = []
    //
    //   Object.keys(data).forEach((v) => {
    //     filterData = data[v].filter(r => r.Date && moment(getDate(r.Date)).isSame(startDate))
    //   })
    //   if (filterData && filterData.length > 0) {
    //     filterData.forEach(payload => {
    //       allPromises.push(promiseBuilderForExcel.updateAppPromise(payload))
    //     })
    //     await Promise.all(allPromises).then(async (values) => {
    //       deleteFile(file.originalname)
    //       if (values.some(value => value.success)) {
    //         res.status(200).send({success: true, message: "Successfully created"})
    //       } else {
    //         res.status(200).send({success: false})
    //       }
    //     })
    //   } else {
    //     res.status(200).send({success: true, message: "No Data Found"})
    //   }
    // }
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const dayRowBid = async (req, res) => {
  try {
    const {customerId} = req.body
    const promiseBuilder = {
      updateAppPromise: (payload, GroupByRecord, settingData) => new Promise(async (resolve) => {

        const fetchCampaign = await Campaign.find({})

        const finalCost = LastDaysAvgCost(GroupByRecord[payload])

        const fnRevenue = LastDaysAvgRevenue(GroupByRecord[payload])

        const profitPR = FindProfitInPer(fnRevenue, finalCost)

        const fromCPA = fromMicros((GroupByRecord[payload][0]).campaign.target_cpa.target_cpa_micros)

        const newBid = FindNewBid(settingData, fromCPA, profitPR)

        const data = fetchCampaign.filter(x => x.custId === customerId && x.createdDate === moment(new Date()).format("YYYY-MM-DD") && x.countryName === payload)

        data[0].campaign.target_cpa.target_cpa_micros = newBid
        data[0].lastUpdateBid = new Date()
        const updateRecord = await Campaign.updateOne({
          custId: data[0].customerId,
          countryName: data[0].item,
          createdDate: moment(new Date()).format("YYYY-MM-DD")
        }, data[0])
        if (updateRecord && updateRecord.ok) {
          resolve({success: true})
        }
        resolve({success: false})
        const update = await campaignCriterion.updateOne({
          "campaign.id": data[0].campaign.id,
          "campaign.app": data[0].campaign.App,
          "campaign_criterion.location.countryName": data[0].countryName
        }, {$set: {updatedBidDate: getDate(todayDate)}})
        if (update) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }
    if (!customerId) {
      res.status(200).send({success: false, message: "please send valid data"})
    } else {
      const settingData = await Setting.find({custId: customerId})
      if (settingData.length) {

        const gDate = GreaterThanDate(settingData[0])
        const lDate = LessThanDate()

        const fetchRecord = await Campaign.find({custId: customerId, createdDate: {$gte: gDate, $lte: lDate}})

        const GroupByRecord = _.groupBy(fetchRecord, "countryName")

        const allPromises = Object.keys(GroupByRecord).map(payload => promiseBuilder.updateAppPromise(payload, GroupByRecord, settingData))

        await Promise.all(allPromises).then(values => {
          if (values.some(value => value.success)) {
            res.status(200).send({success: true, message: "Successfully Updated"})
          } else {
            res.status(200).send({success: false, message: "something went wrong"})
          }
        })
      }
    }
  } catch (err) {
    console.log(err)
    res.status(422).send({success: false, message: err.message})
  }
}

// const dayRowBid = async (req, res) => {
//   try{
//     const { customerId } = req.body
//     const settingData = await Setting.find({custId : customerId})
//     if(settingData.length) {
//
//       const gDate = moment(new Date()).subtract(settingData[0].cronJob, "days").format("YYYY-MM-DD")
//       const lDate = moment(new Date()).subtract(1, "days").format("YYYY-MM-DD")
//
//       const fetchRecord = await Campaign.find({custId: customerId, createdDate: {$gte: gDate, $lte: lDate}})
//
//       const GroupByRecord = _.groupBy(fetchRecord, "countryName")
//
//       const payload = []
//
//       Object.keys(GroupByRecord).forEach(item => {
//         const cost1 = (GroupByRecord[item]).map(x => fromMicros(x.metrics.cost_micros_gst))
//         const finalCost = _.sumBy(cost1)
//
//         const revenue = (GroupByRecord[item]).map(x => x.Ad_Exchange_revenue_final)
//         const fnRevenue = _.sumBy(revenue)
//
//         const profitRs = fnRevenue - finalCost
//         const profitPR = finalCost === 0 ? ((profitRs / profitRs)) * 100 : ((profitRs / finalCost)) * 100
//
//         const fromCPA = fromMicros((GroupByRecord[item])[0].campaign.target_cpa.target_cpa_micros)
//
//         let sharValue = 0;
//         (settingData.formula || []).forEach((v) => {
//           if (profitPR > v.min && profitPR <= v.max) {
//             sharValue = v.share
//           }
//         })
//
//         const CPAPR = ((fromCPA * sharValue) / 100)
//         const newBid = toMicros((fromCPA + CPAPR))
//
//         payload.push({newBid,item,customerId})
//
//         console.log("newBid", newBid)
//
//         console.log("cost1", cost1)
//         console.log("finalCost", finalCost)
//
//         console.log("update", item, customerId, moment(new Date()).format("YYYY-MM-DD"))
//       })
//
//       console.log("payload",payload)
//
//       payload.forEach(x => {
//         const update = Campaign.update({
//           custId : x.customerId,
//           countryName: x.item,
//           createdDate: moment(new Date()).format("YYYY-MM-DD")
//         },{
//           $set: x.newBid
//         })
//       })
//
//       // const isUpdate = Campaign.update({
//       //   custId: payload[0].customerId,
//       //   countryName: payload[0].item,
//       //   createdDate: moment(new Date()).format("YYYY-MM-DD")
//       // }, {$set: payload[0].newBid})
//       // if (isUpdate && isUpdate.ok) {
//       //   console.log("200")
//       //   res.status(200).send({ success: true, message: "Successfully Updated" })
//       // }
//       // console.log("422")
//       // res.status(422).send({ success: false})
//
//       // await Promise.all(Object.keys(GroupByRecord).map(async (item) => {
//       //   const cost1 = (GroupByRecord[item]).map(x => fromMicros(x.metrics.cost_micros_gst))
//       //   const finalCost = _.sumBy(cost1)
//       //
//       //   const revenue = (GroupByRecord[item]).map(x => x.Ad_Exchange_revenue_final)
//       //   const fnRevenue = _.sumBy(revenue)
//       //
//       //   const profitRs = fnRevenue - finalCost
//       //   const profitPR = finalCost === 0 ? ((profitRs / profitRs)) * 100 : ((profitRs / finalCost)) * 100
//       //
//       //   const fromCPA = fromMicros((GroupByRecord[item])[0].campaign.target_cpa.target_cpa_micros)
//       //
//       //   let sharValue = 0;
//       //   (settingData.formula || []).forEach((v) => {
//       //     if (profitPR > v.min && profitPR <= v.max) {
//       //       sharValue = v.share
//       //     }
//       //   })
//       //
//       //   const CPAPR = ((fromCPA * sharValue) / 100)
//       //   const newBid = toMicros((fromCPA + CPAPR))
//       //   console.log("newBid", newBid)
//       //
//       //   console.log("finalCost", finalCost)
//       //
//       //   console.log("update", item, customerId, moment(new Date()).format("YYYY-MM-DD"))
//       //
//       //   const isUpdate = await Campaign.update({
//       //     custId: customerId,
//       //     countryName: item,
//       //     createdDate: moment(new Date()).format("YYYY-MM-DD")
//       //   }, {$set: newBid})
//       //   console.log("isUpdate",isUpdate)
//       // }))
//
//       // for (const item of Object.keys(GroupByRecord)) {
//       //   const cost1 = (GroupByRecord[item]).map(x => fromMicros(x.metrics.cost_micros_gst))
//       //   const finalCost = _.sumBy(cost1)
//       //
//       //   const revenue = (GroupByRecord[item]).map(x => x.Ad_Exchange_revenue_final)
//       //   const fnRevenue = _.sumBy(revenue)
//       //
//       //   const profitRs = fnRevenue - finalCost
//       //   const profitPR = finalCost === 0 ? ((profitRs / profitRs)) * 100 : ((profitRs / finalCost)) * 100
//       //
//       //   const fromCPA = fromMicros((GroupByRecord[item])[0].campaign.target_cpa.target_cpa_micros)
//       //
//       //   let sharValue = 0;
//       //   (settingData.formula || []).forEach((v) => {
//       //     if (profitPR > v.min && profitPR <= v.max) {
//       //       sharValue = v.share
//       //     }
//       //   })
//       //
//       //   const CPAPR = ((fromCPA * sharValue) / 100)
//       //   const newBid = toMicros((fromCPA + CPAPR))
//       //   console.log("newBid", newBid)
//       //
//       //   console.log("cost1", cost1)
//       //   console.log("finalCost", finalCost)
//       //
//       //   console.log("update", item, customerId)
//       //
//       //   const isUpdate = await Campaign.update({
//       //     custId: customerId,
//       //     countryName: item,
//       //     createdDate: moment(new Date()).format("YYYY-MM-DD")
//       //   }, {$set: newBid})
//       //   if (isUpdate && isUpdate.ok) {
//       //     console.log("200")
//       //     res.status(200).send({ success: true, message: "Successfully Updated" })
//       //   }
//       //   console.log("422")
//       //   res.status(422).send({ success: false})
//       // }
//
//       // const cost1 = fetchRecord.map(x => fromMicros(x.metrics.cost_micros_gst))
//       // const finalCost = _.sumBy(cost1)
//       //
//       // const revenue = fetchRecord.map(x => x.Ad_Exchange_revenue_final)
//       // const fnRevenue = _.sumBy(revenue)
//       //
//       // const profitRs =  fnRevenue - finalCost
//       // const profitPR = finalCost === 0 ? ((profitRs/profitRs)) * 100 : ((profitRs/finalCost)) * 100
//       //
//       // const fromCPA = fromMicros(fetchRecord[0].campaign.target_cpa.target_cpa_micros)
//       //
//       // let sharValue = 0;
//       // (settingData.formula || []).forEach((v) => {
//       //   if(profitPR > v.min && profitPR <= v.max){
//       //     sharValue=v.share
//       //   }
//       // })
//       //
//       // const CPAPR = ((fromCPA*sharValue)/100)
//       // const newBid = toMicros((fromCPA + CPAPR))
//       // console.log("newBid",newBid)
//       //
//       // console.log("cost1", cost1)
//       // console.log("finalCost", finalCost)
//       //
//       // const isUpdate = await Campaign.update({custId : customerId , createdDate: moment(new Date()).format("YYYY-MM-DD")}, { $set: newBid})
//       // if (isUpdate && isUpdate.ok) {
//       //   res.status(200).send({ success: true, message: "Successfully Updated" })
//       // }
//       // res.status(422).send({ success: false})
//     }
//     else {
//       res.status(200).send({ success: false, message: "something went wrong" })
//     }
//   }
//   catch (err) {
//     res.status(422).send({ success: false, message: err.message })
//   }
// }

const selectedRowBudget = async (req, res) => {
  try {
    const promiseBuilder = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {
        const updateRecord = await Campaign.updateOne({_id: payload._id}, payload)
        if (updateRecord && updateRecord.ok) {
          return resolve({success: true})
        }
        return resolve({success: false})
      })
    }
    if (!req.body) {
      res.status(200).send({success: false, message: "please send valid data"})
    } else {
      const allPromises = []
      const row = req.body
      row.length && row.forEach(payload => {
        allPromises.push(promiseBuilder.updateAppPromise(payload))
      })
      await Promise.all(allPromises).then(values => {
        if (values.some(value => value.success)) {
          res.status(200).send({success: true, message: "Successfully Updated"})
        } else {
          res.status(200).send({success: false, message: "something went wrong"})
        }
      })
    }
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const getDataDashBoard = async (req, res) => {
  try {
    const {custId, App, startDate, endDate} = req.body
    const startDateFormat = moment(startDate)
    const endDateFormat = moment(endDate)
    const campaign = await Campaign.find({
      custId,
      "campaign.App": App,
      createdDate: {$gte: new Date(startDateFormat).toISOString(), $lt: new Date(endDateFormat).toISOString()}
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
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

export default generateControllers(Campaign, {
  createAndUpdateCampaign,
  getCampaigns,
  getCampaignByCustIdAndDate,
  uploadExcel,
  deleteCampaign,
  deleteALLCampaign,
  selectedRowBid,
  dayRowBid,
  selectedRowBudget,
  getDataDashBoard
})