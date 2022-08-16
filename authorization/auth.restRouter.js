import express from "express"
import {
  signin,
  signup,
  checkAuth,
  changePassword,
  forgotPassword,
  resetPassword
} from "./auth.controller"
import { requireAuth, requireSignIn } from "./auth.middleware"

export const authRouter = express.Router()

authRouter.get("/", requireAuth, (req, res) => {
  res.send({ message: "You are accessing a protected route" })
})

authRouter.post("/signin", requireSignIn, signin)
authRouter.post("/signup", signup)
authRouter.get("/checkauth", requireAuth, checkAuth)
authRouter.post("/changepassword", requireAuth, changePassword)
authRouter.post("/forgotpassword", forgotPassword)
authRouter.post("/resetpassword", resetPassword)