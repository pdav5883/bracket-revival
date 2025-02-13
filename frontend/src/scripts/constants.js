// const BASE_URL_LOCAL = "http://0.0.0.0:5000"
//const BASE_URL_AWS = "https://3en8z5ljfi.execute-api.us-east-1.amazonaws.com"
const BASE_URL_AWS = "https://4m9ecvr2k7.execute-api.us-east-1.amazonaws.com" // TODO: move to substitution

//const BASE_URL = window.location.host.includes("localhost") ? BASE_URL_LOCAL : BASE_URL_AWS
const BASE_URL = BASE_URL_AWS
//const BASE_URL = BASE_URL_LOCAL

export const API_URL = {
  scoreboard: BASE_URL + "/scoreboard",
  bracket: BASE_URL + "/bracket",
  start: BASE_URL + "/start",
  picks: BASE_URL + "/picks",
  competitions: BASE_URL + "/competitions",
  admin: BASE_URL + "/admin",
  add: BASE_URL + "/add"
}

export const ROUND_NAMES = [
  "First Round",
  "Second Round",
  "Sweet 16",
  "Elite 8",
  "Final 4",
  "Championship"
]


