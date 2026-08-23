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
      (includeYear ? ", " + parts.year : "")
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

  const SITE_COORDS = {
    "Santa Monica": [34.02, -118.49],
    Hollywood: [34.09, -118.33],
    "Pasadena / Gamble House": [34.15, -118.16],
    "Las Vegas": [36.17, -115.14],
    "Hoover Dam": [36.02, -114.74],
    "Grand Canyon": [36.06, -112.14],
    "Horseshoe Bend": [36.88, -111.51],
    "Zion National Park": [37.3, -113.03],
    "Bryce Canyon": [37.63, -112.17],
    "Death Valley": [36.46, -116.87],
    "Manzanar - Japanese Internment Camp": [36.73, -118.15],
    Yosemite: [37.75, -119.59],
    Monterey: [36.6, -121.89],
    "San Francisco": [37.77, -122.42],
    "Charles Shultz Museum": [38.44, -122.71],
    "Pacific Coast Highway / Redwoods": [41.21, -124.0],
    Seattle: [47.61, -122.33],
  };

  const SITE_LABELS = {
    "Santa Monica": "Santa Monica",
    Hollywood: "Hollywood",
    "Pasadena / Gamble House": "Pasadena",
    "Las Vegas": "Las Vegas",
    "Hoover Dam": "Hoover Dam",
    "Grand Canyon": "Grand Canyon",
    "Horseshoe Bend": "Horseshoe Bend",
    "Zion National Park": "Zion",
    "Bryce Canyon": "Bryce Canyon",
    "Death Valley": "Death Valley",
    "Manzanar - Japanese Internment Camp": "Manzanar",
    Yosemite: "Yosemite",
    Monterey: "Monterey",
    "San Francisco": "San Francisco",
    "Charles Shultz Museum": "Schulz Museum",
    "Pacific Coast Highway / Redwoods": "Pacific Coast Highway / Redwoods",
    Seattle: "Seattle",
  };

  const MAP = {
    west: -125.5,
    east: -109,
    south: 31.3,
    north: 49.2,
    width: 360,
    height: 920,
  };

  const LAND_COORDS = [
    [32.53, -117.12],
    [33.35, -117.55],
    [34.03, -118.55],
    [34.45, -120.47],
    [35.65, -121.25],
    [36.3, -121.9],
    [37.78, -122.52],
    [38.55, -123.25],
    [39.6, -123.82],
    [40.45, -124.4],
    [42.0, -124.38],
    [43.3, -124.4],
    [46.18, -124.05],
    [47.95, -124.68],
    [48.38, -124.73],
    [49.0, -123.2],
    [49.0, -109],
    [31.33, -109],
    [31.33, -111.07],
    [31.75, -114.72],
    [32.53, -117.12],
  ];

  const COAST_INLAND = {
    "Santa Monica": 12,
    Hollywood: 16,
    Monterey: 10,
    "San Francisco": 10,
    "Charles Shultz Museum": 8,
    "Pacific Coast Highway / Redwoods": 10,
    Seattle: 12,
  };

  function project(lat, lon) {
    return {
      x: ((lon - MAP.west) / (MAP.east - MAP.west)) * MAP.width,
      y: ((MAP.north - lat) / (MAP.north - MAP.south)) * MAP.height,
    };
  }

  function shortLabel(title) {
    return SITE_LABELS[title] || title;
  }

  function spaceStops(stops) {
    const ordered = stops.slice().sort(function (a, b) {
      return a.y - b.y || a.x - b.x;
    });
    const minGap = 56;
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].y < ordered[i - 1].y + minGap) {
        ordered[i].y = ordered[i - 1].y + minGap;
      }
    }
    const first = ordered[0].y;
    const last = ordered[ordered.length - 1].y;
    const span = last - first || 1;
    const top = 24;
    const usable = MAP.height - 48;
    ordered.forEach(function (stop) {
      stop.y = top + ((stop.y - first) / span) * usable;
    });
    for (let i = 0; i < stops.length; i += 1) {
      for (let j = i + 1; j < stops.length; j += 1) {
        const dx = stops[j].x - stops[i].x;
        const dy = stops[j].y - stops[i].y;
        if (Math.abs(dy) > 36) {
          continue;
        }
        const gap = Math.abs(dx);
        if (gap >= 28) {
          continue;
        }
        const dir = dx === 0 ? (stops[j].index > stops[i].index ? 1 : -1) : dx > 0 ? 1 : -1;
        const push = (28 - gap) / 2;
        stops[i].x -= dir * push;
        stops[j].x += dir * push;
      }
    }
    stops.forEach(function (stop) {
      stop.x = Math.max(22, Math.min(MAP.width - 22, stop.x));
    });
    return stops;
  }

  function interpolateY(y, samples) {
    if (samples.length < 2) {
      return y;
    }
    if (y <= samples[0].from) {
      const span = samples[1].from - samples[0].from || 1;
      return samples[0].to + ((y - samples[0].from) / span) * (samples[1].to - samples[0].to);
    }
    for (let i = 1; i < samples.length; i += 1) {
      if (y <= samples[i].from) {
        const span = samples[i].from - samples[i - 1].from || 1;
        return (
          samples[i - 1].to +
          ((y - samples[i - 1].from) / span) * (samples[i].to - samples[i - 1].to)
        );
      }
    }
    const a = samples[samples.length - 2];
    const b = samples[samples.length - 1];
    const span = b.from - a.from || 1;
    return a.to + ((y - a.from) / span) * (b.to - a.to);
  }

  function assignLabelSides(stops) {
    stops.forEach(function (stop) {
      stop.anchor = stop.x < MAP.width * 0.55 ? "start" : "end";
    });
    for (let i = 0; i < stops.length; i += 1) {
      for (let j = i + 1; j < stops.length; j += 1) {
        if (stops[i].anchor !== stops[j].anchor) {
          continue;
        }
        if (Math.abs(stops[i].y - stops[j].y) > 28) {
          continue;
        }
        const mid = MAP.width / 2;
        const flip =
          Math.abs(stops[i].x - mid) <= Math.abs(stops[j].x - mid) ? i : j;
        stops[flip].anchor = stops[flip].anchor === "start" ? "end" : "start";
      }
    }
    return stops;
  }

  function routeStops(legs) {
    const stops = [];
    legs.forEach(function (leg, index) {
      const coords = SITE_COORDS[leg.title];
      if (!coords) {
        return;
      }
      const point = project(coords[0], coords[1]);
      stops.push({
        index: index,
        title: leg.title,
        label: shortLabel(leg.title),
        x: point.x,
        y: point.y,
      });
    });
    const geoY = stops.map(function (stop) {
      return stop.y;
    });
    spaceStops(stops);
    stops.forEach(function (stop) {
      stop.x += COAST_INLAND[stop.title] || 0;
    });
    assignLabelSides(stops);
    const samples = stops
      .map(function (stop, i) {
        return { from: geoY[i], to: stop.y };
      })
      .sort(function (a, b) {
        return a.from - b.from;
      });
    return {
      stops: stops,
      remapY: function (y) {
        return interpolateY(y, samples);
      },
    };
  }

  function routeMapHtml(legs) {
    const route = routeStops(legs);
    const stops = route.stops;
    if (stops.length < 2) {
      return "";
    }
    const land = LAND_COORDS.map(function (coord) {
      const point = project(coord[0], coord[1]);
      return point.x.toFixed(1) + "," + route.remapY(point.y).toFixed(1);
    }).join(" ");
    const line = stops
      .map(function (stop) {
        return stop.x.toFixed(1) + "," + stop.y.toFixed(1);
      })
      .join(" ");
    const dots = stops
      .map(function (stop, order) {
        const offset = stop.anchor === "end" ? -11 : 11;
        const x = (stop.x + offset).toFixed(1);
        const y = (stop.y + 4).toFixed(1);
        const slash = stop.label.indexOf(" / ");
        const text =
          slash === -1
            ? escapeHtml(order + 1 + "  " + stop.label)
            : '<tspan x="' +
              x +
              '">' +
              escapeHtml(order + 1 + "  " + stop.label.slice(0, slash)) +
              '</tspan><tspan x="' +
              x +
              '" dy="18">' +
              escapeHtml("/ " + stop.label.slice(slash + 3)) +
              "</tspan>";
        return (
          '<a href="#/leg/' +
          stop.index +
          '" data-leg="' +
          stop.index +
          '">' +
          '<circle class="route-dot" cx="' +
          stop.x.toFixed(1) +
          '" cy="' +
          stop.y.toFixed(1) +
          '" r="6.5"></circle>' +
          '<text class="route-label" x="' +
          x +
          '" y="' +
          y +
          '" text-anchor="' +
          stop.anchor +
          '">' +
          text +
          "</text></a>"
        );
      })
      .join("");
    return (
      '<figure class="route-map">' +
      '<svg viewBox="-36 -20 ' +
      (MAP.width + 36) +
      " " +
      (MAP.height + 40) +
      '" role="img" aria-label="Route map of the western United States">' +
      '<polygon class="route-land" points="' +
      land +
      '"></polygon>' +
      '<polyline class="route-line" points="' +
      line +
      '" fill="none"></polyline>' +
      dots +
      "</svg></figure>"
    );
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
          '" data-leg="' +
          index +
          '">' +
          image +
          '<div class="leg-card-body"><div class="leg-card-heading"><h2 class="leg-card-title"><span class="leg-card-num">' +
          (index + 1) +
          "</span> " +
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
      '<div class="home-body">' +
      routeMapHtml(legs) +
      '<div class="leg-grid">' +
      cards +
      "</div></div></div>";
    bindRouteHighlights();
  }

  function bindRouteHighlights() {
    const home = document.querySelector(".home-body");
    if (!home) {
      return;
    }
    function setHot(leg, on) {
      home.querySelectorAll('[data-leg="' + leg + '"]').forEach(function (node) {
        node.classList.toggle("is-hot", on);
      });
      const map = home.querySelector(".route-map");
      if (map) {
        const onMap = home.querySelector('.route-map [data-leg="' + leg + '"]');
        map.classList.toggle("is-dimming", on && !!onMap);
      }
    }
    home.addEventListener("pointerover", function (event) {
      const el = event.target.closest("[data-leg]");
      if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) {
        return;
      }
      setHot(el.getAttribute("data-leg"), true);
    });
    home.addEventListener("pointerout", function (event) {
      const el = event.target.closest("[data-leg]");
      if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) {
        return;
      }
      setHot(el.getAttribute("data-leg"), false);
    });
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
