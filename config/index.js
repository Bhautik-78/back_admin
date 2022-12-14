require("dotenv").config()

const config = {
  expireTime: process.env.JWTEXPIRE,
  secrets: {
    JWT_SECRET: process.env.JWTSECRET || "devlopment"
  },
  db: {
    url: process.env.DBURL
  },
  port: process.env.PORT,
}

export default config
