import { API_URL } from "./constants.js"
import "../styles/custom.css"
import $ from "jquery"

import {
  InitiateAuthCommand,
  CognitoIdentityProviderClient
} from "@aws-sdk/client-cognito-identity-provider";

import {
  initNavbar
} from "blr-shared-frontend";

import { navbarConfig } from "../config/navbar-config.js";

export function initCommon() {
  initNavbar(navbarConfig)
}

export function initIndexOnly(setIndexCallback) {
  // need the setIndexCallback argument to allow calling script to set index,
  // since returning from this function will happen before ajax query completes
  $.ajax({
    method: "GET",
    url: API_URL.competitions,
    data: {},
    crossDomain: true,
    success: function(index) {

      // this must happen before .change() below, which requires index
      setIndexCallback(index)
    }
  })
}

export function initIndexYears(setIndexCallback, year, cid, pid) {
  // need the setIndexCallback argument to allow calling script to set index,
  // since returning from this function will happen before ajax query completes
  // year is the value that select gets set to, undefined set to latest. cid and pid are passed on
  $.ajax({
    method: "GET",
    url: API_URL.competitions,
    data: {},
    crossDomain: true,
    success: function(index) {

      //populate years
      let yearOpt
      for (const yr in index) {
        yearOpt = document.createElement("option")
        yearOpt.value = yr
        yearOpt.textContent = yr
        $("#yearsel").append(yearOpt)
      }

      // this must happen before .trigger() below, which requires index
      setIndexCallback(index)
      
      // set to latest year with change to populate competitions
      if (year == undefined) {
        $("#yearsel").val(yearOpt.value).trigger("change")
      }
      else {
        // don't trigger a change, instead directly call populateCompetitions
        $("#yearsel").val(year)
        populateCompetitions(index, cid, pid)
      }
    }
  })
}


export function populateCompetitions(index, cid, pid) {
  $("#compsel").empty()

  let compOpt
  for (const compName in index[$("#yearsel").val()]) {
    compOpt = document.createElement("option")
    compOpt.value = compName
    compOpt.textContent = compName
    $("#compsel").append(compOpt)
  }

  // set to last competition
  if (cid == undefined) {
    $("#compsel").val(compOpt.value).trigger("change")
  }
  else {
    // means there is no player select on this page
    if (pid == undefined) {
      $("#compsel").val(cid).trigger("change")
    }
    else {
      $("#compsel").val(cid)
      populatePlayerNames(index, pid)
    }
  }
}


export function populatePlayerNames(index, pid, emptyLabel) {
  $("#playersel").empty()

  let playerOpt
  const playerNames = index[$("#yearsel").val()][$("#compsel").val()].players
  const renderNames = getRenderNames(playerNames)

  for (let i = 0; i < playerNames.length; i++) {
    playerOpt = document.createElement("option")
    playerOpt.value = playerNames[i]
    playerOpt.textContent = renderNames[i]
    $("#playersel").append(playerOpt)
  }

  // can put empty option for "Results" in dropdown if arg is present
  if (emptyLabel !== undefined) {
    // Empty option
    playerOpt = document.createElement("option")
    playerOpt.value = ""
    playerOpt.textContent = emptyLabel
    $("#playersel").append(playerOpt)
  }

  // set to latest
  if (pid == undefined) {
    $("#playersel").val(playerOpt.value).trigger("change")
  }
  else {
    $("#playersel").val(pid)
  }
}


export function getRenderNames(names) {
  const renderNames = names.map(name => name.split(" ")[0]);
  const lastNames = names.map(name => " " + name.split(" ")[1]);

  for (let i = 0; i < renderNames.length; i++) {
    let nameOk = false

    while (!nameOk) {
      nameOk = true
      let origName = renderNames[i]
      for (let j = 0; j < renderNames.length; j++) {
        if (i == j) {
          continue
        }

        if (origName == renderNames[j]) {
          if (nameOk) {
            renderNames[i] = origName + lastNames[i][0]
            lastNames[i] = lastNames[i].substring(1)
            nameOk = false
          }

          renderNames[j] = origName + lastNames[j][0]
          lastNames[j] = lastNames[j].substring(1)
        }
      }
    }
  }
  return renderNames;
}
