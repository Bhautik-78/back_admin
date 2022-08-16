import express from "express"
import fs from "fs"
import path from "path"
import cors from "cors"
import setupMiddware from "./middlewares"
import { authRouter } from "./authorization"
import { restRouter, apiErrorHandler } from "./api"
import { connect } from "./db"
import { google } from "googleapis"
import { GoogleAdsApi, types, enums, toMicros } from "google-ads-api"
import { requireAuth } from "./authorization/auth.middleware"
import account, { Accounts } from "./api/Accounts/accounts.model"

// const CronJob = require("cron").CronJob

console.log("THIS IS THE ENVIRONMENT", process.env.NODE_ENV)
// Declare an app from express
const app = express()
let oauth2Client
export let CLIENT
export let LOGIN_CUSTOMERID
export let CUSTOMERID


setupMiddware(app)

require("dotenv").config()

connect()
const env = process.env.NODE_ENV || "development"

app.use(cors())
app.use(express.static("uploads"))
app.use("/auth", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Authorization, Accept, Access-Control-Al" +
    "low-Methods"
  )
  res.header("X-Frame-Options", "deny")
  res.header("X-Content-Type-Options", "nosniff")

  next()
})

// const job = new CronJob("*/30 * * * * *", (() => {
//   console.log("Every Tenth Minute:")
// }))
//
// job.start()


async function getAccountId(id) {
  const accountData = await Accounts.findOne({ _id: id })
  if (accountData && accountData._id) {
    // CUSTOMERID = "3522476678"
    return { GOOGLE_CLIENT_ID: accountData.clientId, GOOGLE_CLIENT_SECRET: accountData.secretKey, CALLBACK: accountData.callBack, DEVELOPERTOKEN: accountData.devlopToken, CUSTOMERID, LOGIN_CUSTOMERID: accountData.loginCustomerId }
  }
  return { GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", CALLBACK: "", DEVELOPERTOKEN: "", CUSTOMERID: "", LOGIN_CUSTOMERID: "" }
}

async function setGAuth(id) {
  const {GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,CALLBACK,DEVELOPERTOKEN} = await getAccountId(id)
  oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    CALLBACK
  )
  CLIENT = new GoogleAdsApi({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    developer_token: DEVELOPERTOKEN,
  })
}

async function getGoogleAuthURL(id) {
  const scopes = [
    "https://www.googleapis.com/auth/adwords",
  ]
  
  await setGAuth(id)
  
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes, // If you only need one scope you can pass it as string
  })
}

app.get("/setAuth", async (req, res) => {
  await setGAuth("602d0447d2c57e2024f1794b")
  res.send("done")
})

app.get("/google/auth/:id", async (req, res) => {
  const { id } = req.params
  const data = await getGoogleAuthURL(id)
  res.send(data)
})
app.get("/auth/exchange", (req, res) => {
  const code = req.query.code
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      res.send(err)
      return
    }
    oauth2Client.setCredentials(tokens)
    res.send(tokens)
  })
})

app.use("/auth", authRouter)
// app.use("/uploads", express.static("uploads"))
app.use("/api", requireAuth, (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Authorization, Accept, Access-Control-Al" +
    "low-Methods"
  )
  res.header("X-Frame-Options", "deny")
  res.header("X-Content-Type-Options", "nosniff")
  next()
})
app.use("/api", restRouter)
app.use(apiErrorHandler)

const appRoot = fs.realpathSync(process.cwd())

if (env === "production") {
  console.log("The root of the application is", appRoot)
  const clientPath = path.resolve(appRoot, "build/client")
  const indexPath = path.join(clientPath, "index.html")
  console.log(clientPath)
  console.log(indexPath)

  app.use(express.static(clientPath))
  app.get("/*", (req, res) => {
    res.sendFile(indexPath)
  })
}

export default app
