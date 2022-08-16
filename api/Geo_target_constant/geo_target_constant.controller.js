import {generateControllers} from "../../modules/query"
import {Gtc} from "./geo_target_constant.model"

const createGtc = async (req, res) => {
  try {
    const gtc = await Gtc.create(req.body)
    res.status(200).send({message: "gtc  created successfully.", gtc})
  } catch (err) {
    console.log(err)
    res.status(422).send({success: false, message: err.message})
  }
}

const getGtc = async ( req, res ) => {
  try {
    let query = {}
    if (req.body) {
      query = req.body
    }
    const gtc = await Gtc.find(query)
    res.status(200).send(gtc)
  } catch ( err ) {
    res.status(422).send({success: false, message: err.message})
  }
}

const deleteGtc = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const deleteRecord = await Gtc.deleteOne({_id: id})
    res.status(200).send(deleteRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}

const editGtcAccount = async (req, res) => {
  try {
    const id = req.params.id.toString()
    const editedRecord = await Gtc.updateOne({_id: id}, req.body)
    res.status(200).send(editedRecord)
  } catch (err) {
    res.status(422).send({ success: false, message: err.message })
  }
}
export default generateControllers(Gtc, {
  getGtc,
  createGtc,
  deleteGtc,
  editGtcAccount
})
