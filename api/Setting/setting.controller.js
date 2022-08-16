import {generateControllers} from "../../modules/query"
import {Setting} from "./setting.model"
import {Application} from "../Application"

const createSetting = async (req, res) => {
  try {
    const setting = await Setting.create(req.body)
    res.status(200).send({message: "setting  created successfully.", setting})
  } catch (err) {
    console.log(err)
    res.status(422).send({success: false, message: err.message})
  }
}

const getSettingData = async (req, res) => {
  try {
    const application = await Application.findOne({appId: req.body.appId})
    let query = {}
    if (application) {
      query = {
        custId: application.custId
      }
    } else {
      query = {}
    }
    const setting = await Setting.find(query)
    res.status(200).send(setting)
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const createUpdateSetting = async (req, res) => {
  try {
    const application = await Application.findOne({appId : req.body.appId})
    const {custId} = application
    const customers = await Setting.findOne({custId})
    if (customers && customers._id) {
      const editedRecord = await Setting.updateOne({ _id: customers._id, custId }, req.body)
      res.status(200).send(editedRecord)
    } else {
      const settings = await Setting.create(req.body)
      res
        .status(200)
        .send({ message: "Settings created successfully.", settings })
    }
  } catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}


export default generateControllers(Setting, {
  getSettingData,
  createSetting,
  createUpdateSetting,
})
