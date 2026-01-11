const BASE_URL_AWS = "https://" + SUB_ApiId + ".execute-api.us-east-1.amazonaws.com"

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

export const LOGO_URL = (teamId) => `https://a1.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${teamId}.png&w=40&h=40&scale=crop&cquality=40`
