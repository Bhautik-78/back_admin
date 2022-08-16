import XLSX from "xlsx"
import moment from"moment"
import { generateControllers } from "../../modules/query"
import { Customers } from "./customers.model"
import CustomersJson from "../../JsonData/CustomersJson"
import {deleteFile} from "../../comman"
import {fetchCustomers} from "../Ads"

const getDate = date => moment(date).format("l")
const todayDate = new Date()

const createCustomer = async (req, res) => {
  try {
    const customer = await Customers.create(req.body)
    res.status(200).send({ message: "Account created successfully.", customer })
  } catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}

const createAndUpdateCustomers = async (req, res) => {
  try {
    const { accountId } = req.query
    const promiseBuilder = {
      updateAppPromise: payload =>
        new Promise(async resolve => {
          const isUpdate = await Customers.findOne({
            customerId: payload.customerId
          })
          if (isUpdate && isUpdate._id) {
            const editedRecord = await Customers.updateOne(
              { _id: isUpdate._id },
              payload
            )
            if (editedRecord && editedRecord.ok) {
              return resolve({ success: true })
            }
            return resolve({ success: false })
          }
          const isCreated = await Customers.create(payload)
          if (isCreated && isCreated._id) {
            return resolve({ success: true })
          }
          return resolve({ success: false })
        })
    }
    const { xtoken } = req.headers
    const filterList = await fetchCustomers(xtoken)
    if (filterList && filterList.length > 0){
      filterList.forEach(payload => {
        payload.accountId = accountId
      })
    }

    const allPromises = []
    filterList.forEach(payload => {
      allPromises.push(promiseBuilder.updateAppPromise(payload))
    })
    await Promise.all(allPromises).then(values => {
      if (values.some(value => value.success)) {
        res
          .status(200)
          .send({ success: true, message: "Successfully created" })
      } else {
        res.status(200).send({ success: false })
      }
    })
  } catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}

const exportDataFromFile = async (req, res) => {
  try {
    const customers = await Customers.findOne({
      customerId: req.body.customerId
    })
    if (customers && customers._id) {
      req.body.lastUpdated = getDate(todayDate)
      const editedRecord = await Customers.updateOne(
        { _id: customers._id },
        req.body
      )
      res.status(200).send(editedRecord)
    } else {
      req.body.status = "active"
      req.body.createdDate = getDate(todayDate)
      req.body.lastUpdated = getDate(todayDate)
      const customers = await Customers.create(req.body)
      res
        .status(200)
        .send({ message: "Customers created successfully.", customers })
    }
  } catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}

const processExcel = workbook => {
  const sheetNamesList = workbook.SheetNames
  let filesData = []
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
    filesData = data
  })
  return filesData
}

const uploadExcel = async (req, res) => {
  try {
    const promiseBuilderForExcel = {
      updateAppPromise: payload =>
        new Promise(async resolve => {
          const customers = await Customers.findOne({
            customerId: payload.customerId
          })
          if (customers && customers._id) {
            payload.lastUpdated = getDate(todayDate)
            const editedRecord = await Customers.updateOne(
              { _id: customers._id },
              payload
            )
            if (editedRecord) {
              resolve({ success: true })
            } else {
              resolve({ success: false })
            }
          } else {
            payload.status = "active"
            payload.createdDate = getDate(todayDate)
            payload.lastUpdated = getDate(todayDate)
            const customers = await Customers.create(payload)
            if (customers) {
              resolve({ success: true })
            } else {
              resolve({ success: false })
            }
          }
        })
    }

    const { file } = req
    const workbook = XLSX.readFile(`./uploads/${file.originalname}`, {
      cellDates: true
    })
    const excelList = processExcel(workbook)
    const allPromises = []
    if (excelList && excelList.length > 0) {
      excelList.forEach(payload => {
        allPromises.push(promiseBuilderForExcel.updateAppPromise(payload))
      })
      await Promise.all(allPromises).then(async values => {
        deleteFile(file.originalname)
        if (values.some(value => value.success)) {
          res.status(200).send({ success: true })
        } else {
          res.status(200).send({ success: false })
        }
      })
    } else {
      res.status(200).send({ success: true, message: "No Data Found" })
    }
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const getCustomers = async (req, res) => {
  try {
    let query = {}
    if (req.body && req.body.accountId) {
      query = { accountId: req.body.accountId }
    }
    const customer = await Customers.find(query)
    res.status(200).send(customer)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await Customers.deleteOne({ _id: id })
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const editCustomer = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await Customers.updateOne({ _id: id }, req.body)
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

export default generateControllers(Customers, {
  createAndUpdateCustomers,
  getCustomers,
  exportDataFromFile,
  uploadExcel,
  createCustomer,
  deleteCustomer,
  editCustomer
})
