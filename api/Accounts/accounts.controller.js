import xlsx from "node-xlsx"
import moment from "moment"
import fs from "fs"
import _ from "lodash"
import {generateControllers} from "../../modules/query"
import {Accounts} from "./accounts.model"
import {Customers} from "../Customers"
import {Campaign} from "../Campaign"
import {campaignCriterion} from "../Campaign_criterion"
import  {uploadExcel} from "../Campaign/campaign.controller"
import {Setting} from "../Setting"
import {fromMicros} from "google-ads-api"
import {
  FindNewBid,
  FindProfitInPer,
  GreaterThanDate,
  LastDaysAvgCost,
  LastDaysAvgRevenue,
  LessThanDate
} from "../../commonFunction"
import XLSX from "xlsx"
import {deleteFile} from "../../comman"

const getDate = date => moment(date).format("YYYY-MM-DD")
const todayDate = new Date()
// import file from "../../uploadExcel/3049664258"

const createAccount = async (req, res) => {
  try {
    const account = await Accounts.create(req.body)
    res.status(200).send({message: "Account created successfully.", account})
  } catch (err) {
    console.log(err)
    res.status(422).send({success: false, message: err.message})
  }
}

const getAccounts = async ( req, res ) => {
  try {
    let query = {}
    if (req.body) {
      query = req.body
    }
    const account = await Accounts.find(query)
    res.status(200).send(account)
  } catch ( err ) {
    res.status(422).send({success: false, message: err.message})
  }
}

const deleteAccount = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await Accounts.deleteOne({_id: id})
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const editAccount = async (req, res) => {
  try {

    const id = req.params.id.toString()
    const deleteRecord = await Accounts.updateOne({_id: id}, req.body)
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
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
      data[row][headers[col]] = value
    }
    data.shift()
    data.shift()
    filesData[sheetName] = data
  })
  return filesData
}

const manualEntry = async (req, res) => {
  try{
    const  accountId  = req.body
    const promiseBuilderForExcel = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {
        const date = moment(payload.Date).format("YYYY-MM-DD")
        const Where = { "campaign.App": payload["App ID"], countryName: payload.Country, createdDate: date}
        const campaign = await Campaign.findOne(Where)
        if(campaign && campaign._id){
          const quary = { custId: campaign.custId}
          const settings = await Setting.findOne(quary)
          const cost = campaign && campaign.metrics && campaign.metrics.cost_micros_gst || 0
          const rShare = settings.share || 0
          const fromMicroCost = fromMicros(cost)
          const revenue = payload["Ad Exchange revenue (₹)"]
          const revenueShare = ((revenue * rShare)/100)
          const fnRevenue =  revenue - revenueShare
          const profitRs =  fnRevenue - fromMicroCost
          const profitPR = fromMicroCost === 0 ? ((profitRs/profitRs)) * 100 : ((profitRs/fromMicroCost)) * 100
          const updateColumns = {
            Ad_Exchange_revenue: revenue,
            Ad_Exchange_revenue_final: fnRevenue,
            profitRs,
            profitPR
          }
          const fromCPA = fromMicros(campaign.campaign.target_cpa.target_cpa_micros)
          const newBid = FindNewBid(settings,fromCPA,profitPR)
          const isUpdate = await Campaign.update(Where, { $set: updateColumns, newBid})
          if (isUpdate && isUpdate.ok) {
            resolve({ success: true })
          }
          return resolve({ success: false })
        }
        return resolve({ success: false, message:  "campaign is not found"})
      })
    }
    const promiseBuilder1 = {
      updateAppPromise: (payload1,GroupByRecord,settingData, payload) => new Promise( async (resolve) => {

        const fetchCampaign = await Campaign.find({})
        const finalCost = LastDaysAvgCost(GroupByRecord[payload1])
        const fnRevenue = LastDaysAvgRevenue(GroupByRecord[payload1])
        const profitPR = FindProfitInPer(fnRevenue,finalCost)
        const fromCPA = fromMicros((GroupByRecord[payload1][0]).campaign.target_cpa.target_cpa_micros)
        const newBid = FindNewBid(settingData,fromCPA,profitPR)

        const data = fetchCampaign.filter(x => x.custId === payload[0].customerId && x.createdDate === moment(new Date()).format("YYYY-MM-DD") && x.countryName === payload1)
        data[0].campaign.target_cpa.target_cpa_micros = newBid
        data[0].lastUpdateBid = new Date()
        const updateRecord = await Campaign.updateOne({custId: data[0].customerId, countryName: data[0].item, createdDate: moment(new Date()).format("YYYY-MM-DD")}, data[0])
        const update = await campaignCriterion.updateOne({"campaign.id":data[0].campaign.id , "campaign.app": data[0].campaign.App,"campaign_criterion.location.countryName":data[0].countryName},{$set: {updatedBidDate : getDate(todayDate)}})
        if(updateRecord && updateRecord.ok || update && update.ok) {
          return resolve({success: true})
        }
        return resolve({ success: false })
      })
    }
    const promiseBuilder = {
      updateAppPromise: (payload) => new Promise(async (resolve) => {
        const allPromises = []
        payload.forEach((x) => {
          const  startDate  = moment(new Date()).format("YYYY-MM-DD")
          const  file  = x.customerId
          const workbook = XLSX.readFile(`./upload_excel/${file}/${file}.xlsx`, {
            cellDates: true
          })
          const data = processExcel(workbook)
          let filterData = []
          Object.keys(data).forEach((v) => {
            filterData = data[v].filter(r => r.Date && moment(getDate(r.Date)).isSame(startDate))
          })
          if (filterData && filterData.length > 0) {
            filterData.forEach(payload => {
              allPromises.push(promiseBuilderForExcel.updateAppPromise(payload))
            })
          }
        })
        await Promise.all(allPromises).then(async values1 => {
          if (values1.some(values1 => values1.success)) {
            const allPromises1 = []
            const settingData = await Setting.find({custId: payload[0].customerId})

            if (settingData.length) {

              const gDate = GreaterThanDate(settingData[0])
              const lDate = LessThanDate()

              const fetchRecord = await Campaign.find({custId: payload[0].customerId, createdDate: {$gte: gDate, $lte: lDate}})
              const GroupByRecord = _.groupBy(fetchRecord, "countryName")
              Object.keys(GroupByRecord).forEach(payload1 => {
                allPromises1.push(promiseBuilder1.updateAppPromise(payload1, GroupByRecord, settingData, payload))
              })

              await Promise.all(allPromises1).then(values => {
                if (values.some(value => value.success)) {
                  return resolve({ success: true })
                } 
                return resolve({ success: false })
              })
            }
            return resolve({ success: false })
          }
          return resolve({ success: false })
        })
      })
    }
    if (!accountId.length) {
      res.status(200).send({ success: false, message: "please send valid data" })
    } else {
      const customerList = await Customers.find({})
      const customer = []
      const allPromises = []
      accountId.forEach(x => {
        const c = customerList.filter(y => y.accountId === x)
        customer.push(c)
      })
      customer.forEach(payload => {
        allPromises.push(promiseBuilder.updateAppPromise(payload))
      })
      await Promise.all(allPromises).then(async values => {
        if (values.some(value => value.success)) {
          res.status(200).send({success: true, message: "Successfully Updated"})
        } else {
          res.status(200).send({success: false, message: "something went wrong"})
        }
      })
    }
  }
  catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}

// const manualEntry = async (req, res) => {
//   try{
//     const  accountId  = req.body
//     const promiseBuilder = {
//       updateAppPromise: (payload) => new Promise(async (resolve) => {
//         for (const x of payload) {
//           const promiseBuilderForExcel = {
//             updateAppPromise: (payload) => new Promise(async (resolve) => {
//               console.log("helloWorld")
//               console.log("payload",payload)
//               const date = moment(payload.Date).format("YYYY-MM-DD")
//               const Where = { "campaign.App": payload["App ID"], countryName: payload.Country, createdDate: date}
//               const campaign = await Campaign.findOne(Where)
//               if(campaign && campaign._id){
//                 const quary = { custId: campaign.custId}
//                 const settings = await Setting.findOne(quary)
//
//                 const cost = campaign && campaign.metrics && campaign.metrics.cost_micros_gst || 0
//                 const rShare = settings.share || 0
//
//                 const fromMicroCost = fromMicros(cost)
//                 const revenue = payload["Ad Exchange revenue (₹)"]
//                 const revenueShare = ((revenue * rShare)/100)
//                 const fnRevenue =  revenue - revenueShare
//                 const profitRs =  fnRevenue - fromMicroCost
//                 const profitPR = fromMicroCost === 0 ? ((profitRs/profitRs)) * 100 : ((profitRs/fromMicroCost)) * 100
//                 const updateColumns = {
//                   Ad_Exchange_revenue: revenue,
//                   Ad_Exchange_revenue_final: fnRevenue,
//                   profitRs,
//                   profitPR
//                 }
//
//                 const fromCPA = fromMicros(campaign.campaign.target_cpa.target_cpa_micros)
//
//                 const newBid = FindNewBid(settings,fromCPA,profitPR)
//
//                 const isUpdate = await Campaign.update(Where, { $set: updateColumns, newBid})
//                 if (isUpdate && isUpdate.ok) {
//                   resolve({ success: true })
//                 }
//                 return resolve({ success: false })
//               }
//               return resolve({ success: false, message:  "campaign is not found"})
//             })
//           }
//
//           const  startDate  = moment(new Date()).format("YYYY-MM-DD")
//           const  file  = x.customerId
//
//           console.log("startDate",startDate)
//           console.log("file",file)
//
//           const workbook = XLSX.readFile(`./upload_excel/${file}/${file}.xlsx`, {
//             cellDates: true
//           })
//           const data = processExcel(workbook)
//           console.log("data",data)
//           let filterData = []
//           const allPromises = []
//
//           Object.keys(data).forEach((v) => {
//             filterData = data[v].filter(r => r.Date && moment(getDate(r.Date)).isSame(startDate))
//           })
//           if (filterData && filterData.length > 0) {
//             console.log("hello")
//             console.log("filterData",filterData)
//             filterData.forEach(payload => {
//               allPromises.push(promiseBuilderForExcel.updateAppPromise(payload))
//             })
//             console.log("allPromises",allPromises)
//             await Promise.all(allPromises).then(async (values) => {
//               // deleteFile(`./upload_excel/${file}/${file}.xlsx`)
//               if (values.some(value => value.success)) {
//                 // return ({success : true})
//                 console.log("a")
//                 return resolve({success: true})
//                 // res.status(200).send({ success: true, message: "Successfully created"})
//               }
//               // return ({success : false})
//               console.log("b")
//               return resolve({success: false})
//               // res.status(200).send({ success: false })
//             })
//           } else {
//             // return ({success : true})
//             console.log("c")
//             return resolve({success: true})
//             // res.status(200).send({ success: true,  message: "No Data Found" })
//           }
//         }
//         // return resolve({success: false})
//       })
//     }
//     if (!accountId.length) {
//       res.status(200).send({ success: false, message: "please send valid data" })
//     } else {
//       const customerList = await Customers.find({})
//       const customer = []
//       accountId.forEach(x => {
//         const c = customerList.filter(y => y.accountId === x)
//         customer.push(c)
//       })
//       const allPromises = customer.map(payload => promiseBuilder.updateAppPromise(payload))
//       await Promise.all(allPromises).then(values => {
//         if (values.some(value => value.success)) {
//           res.status(200).send({success: true, message: "Successfully Updated"})
//         } else {
//           res.status(200).send({success: false, message: "something went wrong"})
//         }
//       })
//     }
//   }
//   catch (err) {
//     console.log(err)
//     res.status(422).send({ success: false, message: err.message })
//   }
// }

export default generateControllers(Accounts, {
  getAccounts,
  createAccount,
  deleteAccount,
  editAccount,
  manualEntry
})
