const BASE_URL_LOCAL = "http://0.0.0.0:5000"
const BASE_URL_AWS = "OTHER"

const BASE_URL = window.location.host.includes("localhost") ? BASE_URL_LOCAL : BASE_URL_AWS

const API_URL = {
  scoreboard: BASE_URL + "/scoreboard",
  bracket: BASE_URL + "/bracket",
  start: BASE_URL + "/start",
  update: BASE_URL + "/update",
  competitions: BASE_URL + "/competitions"
}
