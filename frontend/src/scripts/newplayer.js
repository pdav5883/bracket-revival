import { API_URL } from "./constants.js" 
import { initIndexOnly, initIndexYears, populateCompetitions } from "./shared.js"
import $ from "jquery"

let index

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
 
  $("#scoreboarddiv").hide()
  $("#submitbutton").on("click", submitNewPlayer)
  $("#yearsel").on("change", populateCompetitionsWrapper)
  $("#compsel").on("change", checkHideEmailWrapper)

  initNewPlayerPage()
})


function initNewPlayerPage() {
  const params = new URLSearchParams(window.location.search)
  
  if (params.has("year") && params.has("compname")) {
    initIndexOnly(function(ind) {
      index = ind
    })

    initSingleYearCompetition(params.get("year"), params.get("compname"))
  }
  else {
    initIndexYears(function(ind) {
      index = ind
    })
  }
}


function initSingleYearCompetition(year, compName) {
  let opt = document.createElement("option")
  opt.value = year
  opt.textContent = year
  $("#yearsel").append(opt)
  $("#yearsel").val(year)

  opt = document.createElement("option")
  opt.value = compName
  opt.textContent = compName
  $("#compsel").append(opt)
  $("#compsel").val(compName)

  // hide email if not required
  if (index.hasOwn(year) && index[year].hasOwn(compname)) {
    checkHideEmail(year, compname)
  }
  else {
    $("#statustext").text("Invalid url params: " + year + ", " + compname)
  }
}


function checkHideEmail(year, compname) {
  if (index[year][compname].require_secret === false) {
    $("#emaildiv").hide()
  }
  else {
    $("#emaildiv").show()
  }

}


function checkHideEmailWrapper() {
  checkHideEmail($("#yearsel").val(), $("#compsel").val())
}


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function submitNewPlayer() {
  // disable button until response received
  $("#statustext").text()
  $("#submitbutton").prop("disabled", true)

  // client validation
  let validateId = ["yearsel", "compsel", "nameinput"]
  
  if (index[$("#yearsel").val()][$("#compsel").val()].require_secret === true) {
    validateId.push("emailinput")
  }

  let validationErr = false
  validateId.forEach(v => {
    if ($("#" + v).val() == "") {
      $("#" + v).addClass("is-invalid")
      validationErr = true
    }
    else {
      $("#" + v).addClass("is-valid")
    }
  })

  if (validationErr) {
    $("#statustext").text("Missing entries")
    $("#submitbutton").prop("disabled", false)
    return
  }

  const data = {"type": "player",
    "year": $("#yearsel").val(),
    "compname": $("#compsel").val(),
    "playername": $("#nameinput").val(),
    "playeremail": $("#emailinput").val()
  }

  $.ajax({
    method: "PUT",
    url: API_URL.add,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data),
    crossDomain: true,
    success: function() {
      $("#submitbutton").prop("disabled", false)
      $("#statustext").text("Success! Check your email to make picks.")

      $("#submitdiv").hide()
      $("#scoreboarddiv").show()
      $("#scoreboardbutton").attr("href", "/scoreboard.html?year=" + data.year + "&cid=" + data.compname)
    },
    error: function(err) {
      $("#submitbutton").prop("disabled", false)
      $("#statustext").text(err.responseText)
      // TODO: wait for deployment to test case where picks are locked for competition
    }
  }) 
}

