import $ from "jquery"

let index

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
})

