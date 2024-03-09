import { API_URL } from "./constants.js"
import "../styles/custom.css"
import $ from "jquery"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"


export function populateCompetitions(index) {
  $("#compsel").empty()

  let compOpt
  for (const compName in index[$("#yearsel").val()]) {
    compOpt = document.createElement("option")
    compOpt.value = compName
    compOpt.textContent = compName
    $("#compsel").append(compOpt)
  }

  // set to last competition
  $("#compsel").val(compOpt.value).change()
}


export function populatePlayerNames(index, emptyLabel) {
  $("#playersel").empty()

  let playerOpt
  for (const playerName of index[$("#yearsel").val()][$("#compsel").val()]) {
    playerOpt = document.createElement("option")
    playerOpt.value = playerName
    playerOpt.textContent = playerName
    $("#playersel").append(playerOpt)
  }

  if (emptyLabel !== undefined) {
    // Empty option
    playerOpt = document.createElement("option")
    playerOpt.value = ""
    playerOpt.textContent = emptyLabel
    $("#playersel").append(playerOpt)
  }

  // set to latest 
  $("#playersel").val(playerOpt.value).change()
}

