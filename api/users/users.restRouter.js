import express from "express"
import usersController from "./users.controller"


export const usersRouter = express.Router()

usersRouter
  .route("/")
  .get(usersController.getAll)
  .post(usersController.createOne)

usersRouter.route("/create").post(usersController.createNewUser)
usersRouter.route("/delete/:id").delete(usersController.deleteUser)


usersRouter
  .route("/edit/:id")
  .get(usersController.getUser)
  .put(usersController.updateUser)
  .delete(usersController.createOne)
