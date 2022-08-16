import {generateControllers} from "../../modules/query"
import {Users} from "./users.model"
import {Customers} from "../Customers"
import {Gtc} from "../Geo_target_constant"

const {ObjectID} = require("mongodb")

const updateUser = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const editedRecord = await Users.updateOne({_id: id}, req.body)
    res.status(200).send(editedRecord)
  } catch (err) {
    console.log("Error", err)
    res.status(422).send({error: "Error in getting user details"})
  }
}

const getUser = async (req, res) => {
  try {
    const _id = req.params.id
    const user = await Users.aggregate([
      {
        $match: {_id: ObjectID(_id)}
      },
      {
        $lookup: {
          from: "applications",
          let: {appid: "$applications"},
          pipeline: [{$match: {$expr: {$in: ["$_id", "$$appid"]}}}],
          as: "applications"
        }
      },
      {
        $project: {
          name: 1,
          emailId: 1,
          password: 1,
          mobileNo: 1,
          onboardingStatus: 1
        }
      }
    ])
    res.status(200).send({success: true, message: (user && user.length && user[0]) || {}})
  } catch (err) {
    console.log("Error", err)
    res.status(422).send({error: "Error in getting user details"})
  }
}

const createNewUser = async (req, res) => {
  try {
    const user = await Users.create(req.body)
    res.status(200).send({message: "User created successfully.", user})
  } catch (err) {
    console.log(err)
    res.status(422).send({success: false, message: err.message})
  }
}

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await Users.deleteOne({_id: id})
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

export default generateControllers(Users, {
  updateUser,
  getUser,
  createNewUser,
  deleteUser
})
