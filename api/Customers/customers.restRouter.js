import express from "express"
import multer from "multer"
import customerController from "./customers.controller"

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "./uploads")
  },
  filename (req, file, cb) {
    cb(null , file.originalname)
  }
})
const upload = multer({ storage })

export const customerRouter = express.Router()

customerRouter.route("/").get(customerController.createAndUpdateCustomers)
customerRouter.route("/create").post(customerController.createCustomer)
customerRouter.route("/export-data").post(customerController.exportDataFromFile)
customerRouter.route("/get").post(customerController.getCustomers)
customerRouter.route("/excelUpload").post(upload.single("file"), customerController.uploadExcel)
customerRouter.route("/delete/:id").delete(customerController.deleteCustomer)
customerRouter.route("/edit/:id").put(customerController.editCustomer)




