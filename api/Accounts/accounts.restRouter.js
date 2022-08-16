import express from "express"
import accountController from "./accounts.controller"


export const accountRouter = express.Router()

accountRouter.route("/create").post(accountController.createAccount)
accountRouter.route("/get").get(accountController.getAccounts)
accountRouter.route("/delete/:id").delete(accountController.deleteAccount)
accountRouter.route("/edit/:id").put(accountController.editAccount)
accountRouter.route("/").post(accountController.manualEntry)



