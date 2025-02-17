import { API_URL } from "./constants.js"
import "../styles/custom.css"
import $ from "jquery"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"

// Common init of navbar
export function initCommon() {
  $(function() {
    $.get("assets/nav.html", navbar => {
      $("#nav-placeholder").replaceWith(navbar);
      
      // Determine whether to show signin button or user menu
      if (isAuthenticated()) {
        $("#signin-button").hide();
        $("#user-menu").show();
        const userFirstName = localStorage.getItem('blr-userFirstName');
        const userLastName = localStorage.getItem('blr-userLastName');
        const isAdmin = localStorage.getItem('blr-isAdmin') === 'true';
        $("#user-menu").text(`${userFirstName} ${userLastName[0]}`);

        if (isAdmin) {
          $("#admin-button").show();
        } else {
          $("#admin-button").hide();
        }
      }

      else {
        $("#signin-button").show();
        $("#user-menu").hide();
      }
      
      $("#signout-button").on("click", () => {
        signOut();
        $("#signin-button").show();
        $("#user-menu").hide();
      });

      $("#signin-button").on("click", () => {
        window.location.href = '/login.html';
      });

      $("#admin-button").on("click", () => {
        window.location.href = '/admin.html';
      });
    });
  });
}

export function signOut() {
  // Update Sign Out
  localStorage.removeItem('blr-accessToken');
  localStorage.removeItem('blr-userFirstName');
  localStorage.removeItem('blr-userLastName');
  localStorage.removeItem('blr-isAdmin');
}

export function isAuthenticated() {
  const accessToken = localStorage.getItem('blr-accessToken');
  return !!accessToken;
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

export function initIndexYears(setIndexCallback) {
  // need the setIndexCallback argument to allow calling script to set index,
  // since returning from this function will happen before ajax query completes
  $.ajax({
    method: "GET",
    url: API_URL.competitions,
    data: {},
    crossDomain: true,
    success: function(index) {

      //populate years
      let yearOpt
      for (const year in index) {
        yearOpt = document.createElement("option")
        yearOpt.value = year
        yearOpt.textContent = year
        $("#yearsel").append(yearOpt)
      }

      // this must happen before .change() below, which requires index
      setIndexCallback(index)
      
      // set to latest year with change to populate competitions
      if (yearOpt !== undefined) {
        $("#yearsel").val(yearOpt.value).change()
      }
    }
  })
}


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
  if (compOpt !== undefined) {
    $("#compsel").val(compOpt.value).change()
  }
}


export function populatePlayerNames(index, emptyLabel) {
  $("#playersel").empty()

  let playerOpt
  for (const playerName of index[$("#yearsel").val()][$("#compsel").val()].players) {
    playerOpt = document.createElement("option")
    playerOpt.value = playerName
    playerOpt.textContent = playerName
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
  if (playerOpt !== undefined) {
    $("#playersel").val(playerOpt.value).change()
  }
}

