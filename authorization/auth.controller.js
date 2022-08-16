import bcrypt from "bcrypt-nodejs"
import jwt from "jsonwebtoken"
import configkeys from "../config"
import { Users } from "../api/users/users.model"
import { getUserDetails } from "../commonDbFunctions"
// Send email
const nodemailer = require("nodemailer")

const smtpTransport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAILER_EMAIL_ID,
    pass: process.env.MAILER_PASSWORD
  }
})

const expirationInterval =
  process.env.NODE_ENV === "development"
    ? 30 * 24 * 60 * 60
    : (parseInt(process.env.JWTSECRET) || 1) * 24 * 60 * 60

const tokenForUser = (user, loginDetails) => {
  try {
    const timestamp = new Date().getTime()
    return jwt.sign(
      {
        sub: user.email,
        iat: timestamp,
        // entityDetails: loginDetails.relatedFaEntities[0],
        exp: Math.floor(Date.now() / 1000) + expirationInterval
      },
      configkeys.secrets.JWT_SECRET
    )
  } catch (err) {
    throw err
  }
}

export const signup = async (req, res) => {
  const { mobileNo, displayName,lastName } = req.body
  let { email, password } = req.body
  email = email.toLowerCase()
  const emailRegexp = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
  if (!emailRegexp.test(email)) {
    return res.status(422).send({ success: false, message: "Invalid Email" })
  }
  const isEmailExist = await Users.findOne({
    email: req.body.email
  }).then(data => !!data)
  if (isEmailExist) {
    return res
      .status(422)
      .send({ success: false, message: "Email is alrady exist" })
  }
  password = bcrypt.hashSync(password)
  try {
    await Users.create({
      displayName,
      lastName,
      email,
      password,
      mobileNo,
      onboardingStatus: "active",
      role : "user"
    })
    const token = tokenForUser(req.body)
    const data = {
      to: email,
      from: process.env.MAILER_EMAIL_ID,
      subject: "Confirm your email address to get started ",
      text:
        `${"Confirm your email address to get started.\n\n" +
          "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
          "http://localhost:8080/auth/signupconfirm?token="}${token}\n\n` +
        "If you did not request this, please ignore this email and your password will remain unchanged.\n"
    }
    // smtpTransport.sendMail(data, err =>
    //   err
    //     ? res.status(422).send({
    //       success: false,
    //       message: err
    //     })
    res.status(201).send({
      success: true,
      message: "User created successfully."
    })
    // )
  } catch (err) {
    res.status(422).send({success: false, message: err.message})
  }
}

export const signin = async (req, res) => {
  const { email } = req.body
  try {
    const [userDetails] = await Promise.all([getUserDetails(email)])
    if (Object.keys(userDetails).length > 0) {
      const status = req.user.onboardingStatus
      if (status === "active") {
        res.status(200).send({
          success: true,
          token: tokenForUser(userDetails),
          user : userDetails
        })
      } else if (status === "disable") {
        res.status(422).send({
          success: false,
          message: "your account is disabled!"
        })
      } else {
        res.status(422).send({
          success: false,
          message: "your account in not active"
        })
      }
    } else {
      res.status(422).send({
        success: false,
        error: `Incorrect email ID : ${email}`
      })
    }
  } catch (e) {
    console.log("The error while sign in is", e)
    res.status(422).send({
      success: false,
      error: `Unable to Login using email - ${email}`
    })
  }
}

export const checkAuth = async (req, res) => {
  const userEmail = req.user.email
  const token = req.headers.authorization
  const decoded = await jwt.verify(token, configkeys.secrets.JWT_SECRET)
  // console.log("headers : ", JSON.stringify(req.headers, null, 2))
  if (userEmail) {
    try {
      const userDetails = await getUserDetails(userEmail)

      if (Object.keys(userDetails).length > 0) {
        res.send({
          success: true,
          exp: (decoded && decoded.exp) || 0,
          loginDetails: userDetails,
          error: ""
        })
      } else {
        res.send({
          success: false,
          token: "",
          loginDetails: {},
          exp: (decoded && decoded.exp) || 0,
          error: { message: `Incorrect email ID : ${userEmail}` }
        })
      }
    } catch (e) {
      res.send({
        success: false,
        token: "",
        loginDetails: {},
        exp: (decoded && decoded.exp) || 0,
        error: { message: `Unable to Login using email - ${userEmail}` }
      })
    }
  } else {
    res.send({
      success: false,
      token: "",
      loginDetails: {},
      exp: (decoded && decoded.exp) || 0,
      error: { message: `Email ID doesn't exist - ${userEmail}` }
    })
  }
}
export const changePassword = async (req, res) => {
  const token = req.headers.authorization
  try {
    const decoded = await jwt.verify(token, configkeys.secrets.JWT_SECRET)
    const password = bcrypt.hashSync(req.body.password)
    try {
      await Users.findOneAndUpdate(
        { email: decoded.sub },
        { password }
      )
      return res.status(200).send({
        success: true,
        message: "your password changed successfully!"
      })
    } catch (err) {
      res.status(422).send({ success: false, message: err.message })
    }
  } catch (error) {
    res.status(422).send({ success: false, message: "unauthorized" })
  }
}

export const forgotPassword = async (req, res) => {
  let { email } = req.body
  email = email.toLowerCase()
  const emailRegexp = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

  if (!emailRegexp.test(email)) {
    return res.status(422).send({ success: false, message: "Invalid Email" })
  }

  const isEmailExist = await Users.findOne({
    email
  }).then(data => !!data)
  if (!isEmailExist) {
    return res
      .status(422)
      .send({ success: false, message: "email in not registered" })
  }
  const token = tokenForUser(req.body)
  const data = {
    to: email,
    from: process.env.MAILER_EMAIL_ID,
    subject: "Password help has arrived!",
    text:
      `${"You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
      "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
      "http://localhost:8080/auth/resetpassword?token="}${
        token
      }\n\n` +
      "If you did not request this, please ignore this email and your password will remain unchanged.\n"
  }
  smtpTransport.sendMail(data, err => err
    ? res.status(422).send({
      success: false,
      message: err
    })
    : res.status(200).send({
      success: true,
      message: "please check your email to reset your password!"
    }))
}

export const resetPassword = async (req, res) => {
  const token = req.query.token
  try {
    const decoded = await jwt.verify(token, configkeys.secrets.JWT_SECRET)
    const password = bcrypt.hashSync(req.body.password)
    try {
      await Users.findOneAndUpdate(
        { email: decoded.sub },
        { password }
      )
      return res.status(200).send({
        success: true,
        message: "your password changed successfully!"
      })
    } catch (err) {
      res.status(422).send({ success: false, message: err.message })
    }
  } catch (error) {
    res.status(422).send({ success: false, message: "unauthorized" })
  }
}