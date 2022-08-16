import {fromMicros, toMicros} from "google-ads-api"
import _ from "lodash"
import moment from "moment"

export const LastDaysAvgCost = (payload) => {
  const cost1 = payload.map(x => fromMicros(x.metrics.cost_micros_gst))
  const finalCost = _.sumBy(cost1)
  return finalCost
}

export const LastDaysAvgRevenue = (payload) => {
  const revenue = payload.map(x => x.Ad_Exchange_revenue_final)
  const fnRevenue = _.sumBy(revenue)
  return fnRevenue
}

export const FindProfitInPer = (fnRevenue,finalCost) => {
  const profitRs = fnRevenue - finalCost
  const profitPR = finalCost === 0 ? ((profitRs / profitRs)) * 100 : ((profitRs / finalCost)) * 100
  return profitPR
}

export const FindNewBid = (settingData,fromCPA,profitPR) => {
  let sharValue = 0
  if (profitPR === null) {
    const CPAPR = ((fromCPA * 10) / 100)
    const newBid = toMicros((fromCPA + CPAPR))
    return newBid
  }
  (settingData[0].formula || []).forEach((v) => {
    if (profitPR > v.min && profitPR <= v.max) {
      sharValue = v.share
    }
  })
  const CPAPR = ((fromCPA * sharValue) / 100)
  const newBid = toMicros((fromCPA + CPAPR))
  return newBid
}

export const GreaterThanDate = (payload) => {
  const gDate = moment(new Date()).subtract(payload.cronJob, "days").format("YYYY-MM-DD")
  return gDate
}

export const LessThanDate = (payload) => {
  const lDate = moment(new Date()).subtract(1, "days").format("YYYY-MM-DD")
  return lDate
}

export const getDaysBetweenDates = (startDate, endDate) => {
  const now = moment(startDate).clone()
  const dates = []

  while (now.isSameOrBefore(endDate)) {
    dates.push(now.format("YYYY-MM-DD"))
    now.add(1, "days")
  }
  return dates
}