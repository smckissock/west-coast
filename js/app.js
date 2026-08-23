(function () {
  const app = document.getElementById("app");
  let trip = { title: "West Coast Trip", legs: [] };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function photoSrc(filename) {
    return "./photos/" + encodeURIComponent(filename);
  }

  function formatDateTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso || "";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function heroOf(leg) {
    const images = leg.images || [];
    return images.find(function (image) {
      return image.hero;
    }) || images[0];
  }

  function parseRoute() {
    const hash = (location.hash || "").replace(/^#/, "") || "/";
    const photoMatch = hash.match(/^\/leg\/(\d+)\/photo\/(\d+)\/?$/);
    if (photoMatch) {
      return {
        view: "photo",
        legIndex: Number(photoMatch[1]),
        photoIndex: Number(photoMatch[2]),
      };
    }
    const legMatch = hash.match(/^\/leg\/(\d+)\/?$/);
    if (legMatch) {
      return { view: "leg", legIndex: Number(legMatch[1]) };
    }
    return { view: "home" };
  }

  function go(hash) {
    location.hash = hash;
  }

  function renderHome() {
    const title = trip.title || "West Coast Trip";
    const legs = trip.legs || [];
    document.title = title;

    if (!legs.length) {
      app.innerHTML =
        '<div class="page">' +
        '<header class="masthead"><h1>' + escapeHtml(title) + "</h1></header>" +
        '<p class="empty">No legs yet.</p>' +
        "</div>";
      return;
    }

    const cards = legs
      .map(function (leg, index) {
        const hero = heroOf(leg);
        const image = hero
          ? '<div class="leg-card-image-wrap"><img class="leg-card-image" src="' +
            photoSrc(hero.filename) +
            '" alt="' +
            escapeHtml(leg.title) +
            '"></div>'
          : '<div class="leg-card-image-wrap"></div>';
        return (
          '<a class="leg-card" href="#/leg/' +
          index +
          '">' +
          image +
          '<h2 class="leg-card-title">' +
          escapeHtml(leg.title) +
          "</h2></a>"
        );
      })
      .join("");

    app.innerHTML =
      '<div class="page">' +
      '<header class="masthead"><h1>' +
      escapeHtml(title) +
      "</h1></header>" +
      '<div class="leg-grid">' +
      cards +
      "</div></div>";
  }

  function renderLeg(legIndex) {
    const title = trip.title || "West Coast Trip";
    const leg = (trip.legs || [])[legIndex];
    if (!leg) {
      go("#/");
      return;
    }

    document.title = leg.title + " — " + title;
    const images = leg.images || [];
    const thumbs = images
      .map(function (image, photoIndex) {
        return (
          '<a class="thumb" href="#/leg/' +
          legIndex +
          "/photo/" +
          photoIndex +
          '">' +
          '<div class="thumb-image-wrap"><img class="thumb-image" src="' +
          photoSrc(image.filename) +
          '" alt=""></div>' +
          '<p class="thumb-meta">' +
          escapeHtml(formatDateTime(image.datetime)) +
          "</p></a>"
        );
      })
      .join("");

    app.innerHTML =
      '<div class="page">' +
      '<a class="back" href="#/">Back to album</a>' +
      '<header class="masthead"><h1>' +
      escapeHtml(leg.title) +
      "</h1></header>" +
      (images.length
        ? '<div class="thumb-grid">' + thumbs + "</div>"
        : '<p class="empty">No photos in this leg.</p>') +
      "</div>";
  }

  function renderPhoto(legIndex, photoIndex) {
    const title = trip.title || "West Coast Trip";
    const leg = (trip.legs || [])[legIndex];
    const image = leg && (leg.images || [])[photoIndex];
    if (!image) {
      go(leg ? "#/leg/" + legIndex : "#/");
      return;
    }

    document.title = (leg.title || title) + " — photo";
    app.innerHTML =
      '<div class="viewer">' +
      '<div class="viewer-bar">' +
      '<button class="viewer-back" type="button" data-back>Back</button>' +
      '<p class="viewer-meta">' +
      escapeHtml(formatDateTime(image.datetime)) +
      "</p></div>" +
      '<div class="viewer-stage">' +
      '<img class="viewer-image" src="' +
      photoSrc(image.filename) +
      '" alt="' +
      escapeHtml(leg.title) +
      '"></div></div>';

    const back = app.querySelector("[data-back]");
    back.addEventListener("click", function () {
      go("#/leg/" + legIndex);
    });
  }

  function render() {
    const route = parseRoute();
    if (route.view === "photo") {
      renderPhoto(route.legIndex, route.photoIndex);
      return;
    }
    if (route.view === "leg") {
      renderLeg(route.legIndex);
      return;
    }
    if (location.hash && location.hash !== "#/" && route.view === "home") {
      go("#/");
      return;
    }
    renderHome();
  }

  function start(data) {
    trip = data && typeof data === "object" ? data : trip;
    if (!Array.isArray(trip.legs)) {
      trip.legs = [];
    }
    window.addEventListener("hashchange", render);
    render();
  }

  fetch("./trip.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load trip.json");
      }
      return response.json();
    })
    .then(start)
    .catch(function () {
      start(trip);
    });
})();
