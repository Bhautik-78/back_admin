import axios from "axios"
import { CLIENT, LOGIN_CUSTOMERID } from "../../server"

import { GoogleAdsApi, types, enums, toMicros } from "google-ads-api"

export const finalfetchCampaign = async (xToken, xCustomer, startDate) => {
  const response = await axios.get(`http://localhost:8080/getCampaigns/${xCustomer}?xToken=${xToken}&dt=${startDate}&appId=`)
  if(response.data.length){
    const filterList = response.data.filter(x => !(x.campaign.name.includes("Worlwide")))
    return filterList
  }
  return []
}

export const appWiseFetchCampaign = async (xToken, custId,appId, Date) => {
  const response = await axios.get(`http://localhost:8080/getCampaigns/${custId}?xToken=${xToken}&dt=${Date}&appId=${appId}`)
  return response.data
}

export const fetchCampaign = async (xToken, xCustomer,appId, startDate, endDate) => {
  // console.log("date", date, `${date}`)
  // const customer = CLIENT.Customer({
  //   customer_account_id: xCustomer,
  //   refresh_token: xToken,
  //   login_customer_id: LOGIN_CUSTOMERID,
  // })
  //   const response = await customer.query(`
  //     SELECT
  //         campaign.id,
  //         campaign.campaign_budget,
  //         campaign.name,
  //         campaign.app_campaign_setting.app_id,
  //         campaign.target_cpa.target_cpa_micros,
  //         campaign_budget.amount_micros,
  //         metrics.cost_micros
  //       FROM
  //       campaign
  //     WHERE
  //         campaign.status = ENABLED
  //         AND segments.date = '${date}'
  // `)
  if(appId === "all"){
    if(endDate){
      const response = await axios.get(`http://localhost:8080/getCampaigns/${xCustomer}?xToken=${xToken}&dt=${startDate}_${endDate}&appId=`)
      const filterList = response.data.filter(x => !(x.campaign.name.includes("Worlwide")))
      return filterList
    }
    const response = await axios.get(`http://localhost:8080/getCampaigns/${xCustomer}?xToken=${xToken}&dt=${startDate}&appId=`)
    const filterList = response.data.filter(x => !(x.campaign.name.includes("Worlwide")))
    return filterList
  }
  if(endDate){
    const response = await axios.get(`http://localhost:8080/getCampaigns/${xCustomer}?xToken=${xToken}&dt=${startDate}_${endDate}&appId=${appId}`)
    const filterList = response.data.filter(x => !(x.campaign.name.includes("Worlwide")))
    return filterList
  }
  const response = await axios.get(`http://localhost:8080/getCampaigns/${xCustomer}?xToken=${xToken}&dt=${startDate}&appId=${appId}`)
  const filterList = response.data.filter(x => !(x.campaign.name.includes("Worlwide")))
  return filterList

}

export const fetchCampaignCriteria = async (xToken, xCustomer) => {
  //   const customer = CLIENT.Customer({
  //     customer_account_id: xCustomer,
  //     refresh_token: xToken,
  //     login_customer_id: LOGIN_CUSTOMERID,
  //   })
  //   const response = await customer.query(`
  //         SELECT
  //             campaign.id,
  //             campaign.name,
  //             campaign_criterion.type,
  //             campaign.app_campaign_setting.app_id,
  //             campaign_criterion.location.geo_target_constant
  //         FROM
  //             campaign_criterion
  //         WHERE
  //             campaign.status = 'ENABLED' AND campaign_criterion.type = 'LOCATION'
  // `)

  const response = await axios.get(`http://localhost:8080/getCampaignsCriteria/${xCustomer}?xToken=${xToken}`)
  const filterList = response.data.filter(x => !(x.campaign.name.includes("Worlwide")))
  return filterList
}

export const updateCampaignBudges = async (xToken, xCustomer, payloads) => {
  // campaign_budget.resource_name;
  // const payload = {
  //     resource_name: "xxxxx",
  //     amount_micros: toMicros(300),
  // }
  const customer = CLIENT.Customer({
    customer_account_id: xCustomer,
    refresh_token: xToken,
    login_customer_id: LOGIN_CUSTOMERID
  })
  const response = await customer.campaignBudgets.update(payloads)
  return response
}

export const updateCampaignBids = async (xToken, xCustomer, payloads) => {
  // const payload = {
  //     resource_name: "xxxxxx",
  //     target_cpa: {
  //         target_cpa_micros: toMicros(25)
  //     }
  // };
  //  const customer = CLIENT.Customer({
  //      customer_account_id: xCustomer,
  //      refresh_token: xToken,
  //      login_customer_id: LOGIN_CUSTOMERID
  //    })
  // const respons1e = await customer.campaigns.update(payloads)
  //    return response
  const data = JSON.stringify(payloads)

  const config = {
    method: "post",
    url: `http://localhost:8080/updateCampaignBid/${xCustomer}`,
    headers: {
      xToken,
      "Content-Type": "application/json"
    },
    data
  }


  return new Promise((resolve) => {
    axios(config)
      .then((response) => {
        resolve(response.data)
      })
      .catch((error) => {
        console.log(error)
      })
  })
}

export const fetchCustomers = async xToken => {

  // .then(response => {
  //   console.log("response", response.data)
  //   return response.data
  // })
  // .catch(error => {
  //   console.log(error)
  // })
  // const response = await (`http://localhost:8080/getAccessibleCustomers?xToken=${xToken}`)
  // const response = await CLIENT.listAccessibleCustomers(xToken)
  // const customer = CLIENT.Customer({
  //   customer_account_id: "3049664258",
  //   refresh_token: xToken,
  //   login_customer_id: LOGIN_CUSTOMERID,
  // })
  // const campaigns = await customer.report({
  //   entity: "campaign",
  //   attributes: [
  //     "campaign.id",
  //     "campaign.name",
  //     "campaign.bidding_strategy_type",
  //     "campaign_budget.amount_micros",
  //   ],
  //   metrics: [
  //     "metrics.cost_micros",
  //     "metrics.clicks",
  //     "metric.impressions",
  //     "metrics.all_conversions",
  //   ],
  //   constraints: {
  //     "campaign.status": enums.CampaignStatus.ENABLED,
  //   },
  //   limit: 20,
  // })
  // console.log("----Camp", campaigns)

  // console.log("response",response)
  const response = await axios.get(`http://localhost:8080/getCustomerClient?xToken=${xToken}`)
  return response.data
}
