import $ from "jquery"

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
})

