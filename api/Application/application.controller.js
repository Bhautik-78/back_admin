import {generateControllers} from "../../modules/query"
import {Application} from "./application.model"

const createUpdateApplication = async (req, res) => {
  try {
    const application = await Application.findOne({custId: req.body.custId})
    if (application && application._id) {
      const editedRecord = await Application.updateOne({ _id: application._id }, req.body)
      res.status(200).send(editedRecord)
    } else {
      const payload = {
        custId : req.body.custId,
        appId : req.body.appId,
        appName : req.body.appName,
        status : "active"
      }
      const apps = await Application.create(payload)
      res
        .status(200)
        .send({ message: "Settings created successfully.", apps })
    }
  } catch (err) {
    console.log(err)
    res.status(422).send({ success: false, message: err.message })
  }
}

const getApplicaton = async (req, res) => {
  try {
    let query = {}
    if (req.body) {
      query = {
        custId: req.body.custId
      }
    }
    const application = await Application.find(query)
    res.status(200).send(application)
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

const deleteApplication = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await Application.deleteOne({ _id: id })
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const editApplication = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const editedRecord = await Application.updateOne(
      { _id: id },
      req.body
    )
    res.status(200).send(editedRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const getActiveApplication = async (req,res) => {
  try {
    const application = await Application.find({status : "active"})
    res.status(200).send(application)
  }catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

export default generateControllers(Application, {
  createUpdateApplication,
  getApplicaton,
  deleteApplication,
  editApplication,
  getActiveApplication
})
