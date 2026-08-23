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

  function thumbSrc(filename) {
    return "./thumbs/" + encodeURIComponent(filename);
  }

  function thumbImg(filename, className, alt) {
    return (
      '<img class="' +
      className +
      '" src="' +
      thumbSrc(filename) +
      '" alt="' +
      escapeHtml(alt || "") +
      '" onerror="this.onerror=null;this.src=\'' +
      photoSrc(filename) +
      '\'">'
    );
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

  const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function datePart(iso) {
    const match = String(iso || "").match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  }

  function parseYmd(ymd) {
    const match = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  function datesFromDatetimes(datetimes) {
    const dates = [];
    datetimes.forEach(function (iso) {
      const day = datePart(iso);
      if (day) {
        dates.push(day);
      }
    });
    if (!dates.length) {
      return null;
    }
    dates.sort();
    return { startDate: dates[0], endDate: dates[dates.length - 1] };
  }

  function datesOf(leg) {
    if (leg.startDate) {
      return {
        startDate: leg.startDate,
        endDate: leg.endDate || leg.startDate,
      };
    }
    return datesFromDatetimes(
      (leg.images || []).map(function (image) {
        return image.datetime;
      })
    );
  }

  function earliestDatetime(datetimes) {
    let earliest = "";
    datetimes.forEach(function (iso) {
      const value = String(iso || "");
      if (!datePart(value)) {
        return;
      }
      if (!earliest || value < earliest) {
        earliest = value;
      }
    });
    return earliest;
  }

  function earliestOf(leg) {
    return earliestDatetime(
      (leg.images || []).map(function (image) {
        return image.datetime;
      })
    );
  }

  function weekdayName(parts) {
    const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
    return WEEKDAYS[date.getDay()];
  }

  function formatDay(parts, includeYear) {
    return (
      weekdayName(parts) +
      " " +
      MONTHS[parts.month - 1] +
      " " +
      parts.day +
      (includeYear ? " " + parts.year : "")
    );
  }

  function formatDateRange(startDate, endDate) {
    const start = parseYmd(startDate);
    const end = parseYmd(endDate || startDate);
    if (!start) {
      return "";
    }
    if (!end || startDate === endDate) {
      return formatDay(start, true);
    }
    if (start.year === end.year) {
      return formatDay(start, false) + " - " + formatDay(end, true);
    }
    return formatDay(start, true) + " - " + formatDay(end, true);
  }

  function dateRangeLabel(leg) {
    const dates = datesOf(leg);
    return dates ? formatDateRange(dates.startDate, dates.endDate) : "";
  }

  function tripDateRange() {
    const datetimes = [];
    (trip.legs || []).forEach(function (leg) {
      (leg.images || []).forEach(function (image) {
        datetimes.push(image.datetime);
      });
      if (leg.startDate) {
        datetimes.push(leg.startDate);
      }
      if (leg.endDate) {
        datetimes.push(leg.endDate);
      }
    });
    const dates = datesFromDatetimes(datetimes);
    return dates ? formatDateRange(dates.startDate, dates.endDate) : "";
  }

  function tripDatesHtml() {
    const range = tripDateRange();
    return range
      ? '<p class="trip-dates">' + escapeHtml(range) + "</p>"
      : "";
  }

  function sortTripLegs() {
    trip.legs.sort(function (a, b) {
      const aStart = earliestOf(a);
      const bStart = earliestOf(b);
      if (!aStart && !bStart) {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (!aStart) {
        return 1;
      }
      if (!bStart) {
        return -1;
      }
      if (aStart !== bStart) {
        return aStart < bStart ? -1 : 1;
      }
      return (a.title || "").localeCompare(b.title || "");
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
        '<header class="masthead"><h1>' +
        escapeHtml(title) +
        "</h1>" +
        tripDatesHtml() +
        "</header>" +
        '<p class="empty">No legs yet.</p>' +
        "</div>";
      return;
    }

    const cards = legs
      .map(function (leg, index) {
        const hero = heroOf(leg);
        const image = hero
          ? '<div class="leg-card-image-wrap">' +
            thumbImg(hero.filename, "leg-card-image", leg.title) +
            "</div>"
          : '<div class="leg-card-image-wrap"></div>';
        const range = dateRangeLabel(leg);
        const dates = range
          ? '<p class="leg-card-dates">' + escapeHtml(range) + "</p>"
          : "";
        const state = leg.state
          ? '<p class="leg-card-state">' + escapeHtml(leg.state) + "</p>"
          : "";
        return (
          '<a class="leg-card" href="#/leg/' +
          index +
          '">' +
          image +
          '<div class="leg-card-body"><div class="leg-card-heading"><h2 class="leg-card-title">' +
          escapeHtml(leg.title) +
          "</h2>" +
          state +
          "</div>" +
          dates +
          "</div></a>"
        );
      })
      .join("");

    app.innerHTML =
      '<div class="page">' +
      '<header class="masthead"><h1>' +
      escapeHtml(title) +
      "</h1>" +
      tripDatesHtml() +
      "</header>" +
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
    const range = dateRangeLabel(leg);
    const dates = range
      ? '<p class="leg-dates">' + escapeHtml(range) + "</p>"
      : "";
    const state = leg.state
      ? '<p class="site-state">' + escapeHtml(leg.state) + "</p>"
      : "";
    const description = (leg.description || "").trim()
      ? '<p class="site-description">' + escapeHtml(leg.description.trim()) + "</p>"
      : "";
    const images = leg.images || [];
    const thumbs = images
      .map(function (image, photoIndex) {
        return (
          '<a class="thumb" href="#/leg/' +
          legIndex +
          "/photo/" +
          photoIndex +
          '">' +
          '<div class="thumb-image-wrap">' +
          thumbImg(image.filename, "thumb-image", "") +
          "</div>" +
          '<p class="thumb-meta">' +
          escapeHtml(formatDateTime(image.datetime)) +
          "</p></a>"
        );
      })
      .join("");

    app.innerHTML =
      '<div class="page">' +
      '<a class="back" href="#/">Back to ' +
      escapeHtml(title) +
      "</a>" +
      '<header class="masthead"><div class="masthead-title-row"><h1>' +
      escapeHtml(leg.title) +
      "</h1>" +
      state +
      "</div>" +
      dates +
      description +
      "</header>" +
      (images.length
        ? '<div class="thumb-grid">' + thumbs + "</div>"
        : '<p class="empty">No photos in this site.</p>') +
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

    const images = leg.images || [];
    const lastIndex = images.length - 1;
    const prev =
      photoIndex > 0
        ? '<button class="viewer-nav" type="button" data-prev>Previous</button>'
        : "";
    const next =
      photoIndex < lastIndex
        ? '<button class="viewer-nav" type="button" data-next>Next</button>'
        : "";

    document.title = (leg.title || title) + " — photo";
    app.innerHTML =
      '<div class="viewer">' +
      '<div class="viewer-bar">' +
      '<div class="viewer-actions">' +
      '<button class="viewer-back" type="button" data-back>Back to ' +
      escapeHtml(leg.title) +
      "</button>" +
      prev +
      next +
      "</div>" +
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
    const prevButton = app.querySelector("[data-prev]");
    if (prevButton) {
      prevButton.addEventListener("click", function () {
        go("#/leg/" + legIndex + "/photo/" + (photoIndex - 1));
      });
    }
    const nextButton = app.querySelector("[data-next]");
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        go("#/leg/" + legIndex + "/photo/" + (photoIndex + 1));
      });
    }
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
    sortTripLegs();
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
