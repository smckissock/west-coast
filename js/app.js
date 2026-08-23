(function () {
  const app = document.getElementById("app");
  let trip = { title: "West Coast Trip", legs: [] };

  const ICON_LEFT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const ICON_RIGHT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

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
      '" loading="lazy" decoding="async"' +
      " onerror=\"this.onerror=null;this.src='" +
      photoSrc(filename) +
      "'\">"
    );
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

  function formatTime(iso) {
    const match = String(iso || "").match(/T(\d{2}):(\d{2})/);
    if (!match) {
      return "";
    }
    let hour = Number(match[1]);
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) {
      hour = 12;
    }
    return hour + ":" + match[2] + " " + suffix;
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

  function formatFullDateTime(iso) {
    const parts = parseYmd(datePart(iso));
    if (!parts) {
      return iso || "";
    }
    const time = formatTime(iso);
    return formatDay(parts, true) + (time ? " \u00b7 " + time : "");
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
    return range ? '<p class="trip-dates">' + escapeHtml(range) + "</p>" : "";
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
    return (
      images.find(function (image) {
        return image.hero;
      }) || images[0]
    );
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

  const DOT_RADIUS = 11;
  const LABEL_OFFSET = 17;

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
        const dir =
          dx === 0 ? (stops[j].index > stops[i].index ? 1 : -1) : dx > 0 ? 1 : -1;
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
      return (
        samples[0].to + ((y - samples[0].from) / span) * (samples[1].to - samples[0].to)
      );
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
        const flip = Math.abs(stops[i].x - mid) <= Math.abs(stops[j].x - mid) ? i : j;
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

  function stopLabelHtml(stop, x, y) {
    const slash = stop.label.indexOf(" / ");
    if (slash === -1) {
      return escapeHtml(stop.label);
    }
    return (
      '<tspan x="' +
      x +
      '">' +
      escapeHtml(stop.label.slice(0, slash)) +
      '</tspan><tspan x="' +
      x +
      '" dy="18">' +
      escapeHtml("/ " + stop.label.slice(slash + 3)) +
      "</tspan>"
    );
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
    const first = stops[0];
    const last = stops[stops.length - 1];
    const defs =
      '<defs><linearGradient id="routeGradient" gradientUnits="userSpaceOnUse" x1="' +
      first.x.toFixed(1) +
      '" y1="' +
      first.y.toFixed(1) +
      '" x2="' +
      last.x.toFixed(1) +
      '" y2="' +
      last.y.toFixed(1) +
      '"><stop class="route-grad-start" offset="0"></stop>' +
      '<stop class="route-grad-end" offset="1"></stop></linearGradient></defs>';
    const dots = stops
      .map(function (stop, order) {
        const offset = stop.anchor === "end" ? -LABEL_OFFSET : LABEL_OFFSET;
        const labelX = (stop.x + offset).toFixed(1);
        const labelY = (stop.y + 6).toFixed(1);
        const cx = stop.x.toFixed(1);
        const cy = stop.y.toFixed(1);
        return (
          '<g class="route-stop" data-leg="' +
          stop.index +
          '">' +
          '<a href="#/leg/' +
          stop.index +
          '" aria-label="' +
          escapeHtml(stop.title) +
          '">' +
          '<circle class="route-halo" cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="19"></circle>' +
          '<circle class="route-dot" cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="' +
          DOT_RADIUS +
          '"></circle>' +
          '<text class="route-num" x="' +
          cx +
          '" y="' +
          (stop.y + 4.6).toFixed(1) +
          '">' +
          (order + 1) +
          "</text>" +
          '<text class="route-label" x="' +
          labelX +
          '" y="' +
          labelY +
          '" text-anchor="' +
          stop.anchor +
          '">' +
          stopLabelHtml(stop, labelX, labelY) +
          "</text></a></g>"
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
      defs +
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

  /* ---------- home ---------- */

  let routeAnimated = false;
  let teardown = null;
  let keyHandler = null;

  function renderHome() {
    const title = trip.title || "West Coast Trip";
    const legs = trip.legs || [];
    document.title = title;

    const masthead =
      '<header class="masthead"><h1>' +
      escapeHtml(title) +
      "</h1>" +
      tripDatesHtml() +
      '<hr class="masthead-rule"></header>';

    if (!legs.length) {
      app.innerHTML =
        '<div class="page">' + masthead + '<p class="empty">No sites yet.</p></div>';
      return;
    }

    const cards = legs
      .map(function (leg, index) {
        const hero = heroOf(leg);
        const state = leg.state
          ? '<p class="leg-card-state micro">' + escapeHtml(leg.state) + "</p>"
          : "";
        const image =
          '<div class="leg-card-image-wrap">' +
          (hero ? thumbImg(hero.filename, "leg-card-image", leg.title) : "") +
          '<span class="leg-card-num">' +
          (index + 1) +
          "</span>" +
          state +
          "</div>";
        const range = dateRangeLabel(leg);
        const dates = range
          ? '<p class="leg-card-dates">' + escapeHtml(range) + "</p>"
          : "";
        return (
          '<a class="leg-card" href="#/leg/' +
          index +
          '" data-leg="' +
          index +
          '">' +
          image +
          '<div class="leg-card-body"><h2 class="leg-card-title">' +
          escapeHtml(leg.title) +
          "</h2>" +
          dates +
          "</div></a>"
        );
      })
      .join("");

    app.innerHTML =
      '<div class="page">' +
      masthead +
      '<div class="home-body">' +
      routeMapHtml(legs) +
      '<div class="leg-grid">' +
      cards +
      "</div></div></div>";

    drawRouteLine();
    teardown = bindHomeInteractions();
  }

  function drawRouteLine() {
    const line = app.querySelector(".route-line");
    if (!line || routeAnimated || typeof line.getTotalLength !== "function") {
      return;
    }
    const length = line.getTotalLength();
    if (!length) {
      return;
    }
    line.style.setProperty("--route-len", length.toFixed(1));
    line.classList.add("is-drawing");
    routeAnimated = true;
  }

  function bindHomeInteractions() {
    const home = app.querySelector(".home-body");
    if (!home) {
      return null;
    }
    const map = home.querySelector(".route-map");
    const grid = home.querySelector(".leg-grid");
    const nearby = new Set();
    let hovered = null;
    let hoveredSource = null;
    let pinned = null;
    let pinnedSource = null;

    function nodesFor(leg) {
      return home.querySelectorAll('[data-leg="' + leg + '"]');
    }

    function sourceOf(el) {
      return map && map.contains(el) ? "map" : "grid";
    }

    function paint() {
      const fromHover = hovered !== null;
      const active = fromHover ? hovered : pinned;
      const source = fromHover ? hoveredSource : pinnedSource;
      home.querySelectorAll(".is-hot").forEach(function (node) {
        node.classList.remove("is-hot");
      });
      if (map) {
        map.querySelectorAll(".is-near").forEach(function (node) {
          node.classList.remove("is-near");
        });
        nearby.forEach(function (leg) {
          const stop = map.querySelector('.route-stop[data-leg="' + leg + '"]');
          if (stop) {
            stop.classList.add("is-near");
          }
        });
      }
      if (active === null) {
        if (map) {
          map.classList.remove("is-dimming");
        }
        if (grid) {
          grid.classList.remove("is-dimming");
        }
        return;
      }
      nodesFor(active).forEach(function (node) {
        node.classList.add("is-hot");
      });
      if (map) {
        map.classList.toggle(
          "is-dimming",
          !!map.querySelector('[data-leg="' + active + '"]')
        );
      }
      if (grid) {
        grid.classList.toggle(
          "is-dimming",
          source === "map" &&
            !!grid.querySelector('.leg-card[data-leg="' + active + '"]')
        );
      }
    }

    function revealCard(leg) {
      const card = grid && grid.querySelector('.leg-card[data-leg="' + leg + '"]');
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function onOver(event) {
      const el = event.target.closest("[data-leg]");
      if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) {
        return;
      }
      hovered = el.getAttribute("data-leg");
      hoveredSource = sourceOf(el);
      if (hoveredSource === "map") {
        revealCard(hovered);
      }
      paint();
    }

    function onOut(event) {
      const el = event.target.closest("[data-leg]");
      if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) {
        return;
      }
      hovered = null;
      hoveredSource = null;
      paint();
    }

    function onFocusIn(event) {
      const el = event.target.closest("[data-leg]");
      if (!el) {
        return;
      }
      pinned = el.getAttribute("data-leg");
      pinnedSource = sourceOf(el);
      if (pinnedSource === "map") {
        revealCard(pinned);
      }
      paint();
    }

    function onFocusOut() {
      pinned = null;
      pinnedSource = null;
      paint();
    }

    home.addEventListener("pointerover", onOver);
    home.addEventListener("pointerout", onOut);
    home.addEventListener("focusin", onFocusIn);
    home.addEventListener("focusout", onFocusOut);

    let observer = null;
    if (grid && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            const leg = entry.target.getAttribute("data-leg");
            if (entry.isIntersecting) {
              nearby.add(leg);
            } else {
              nearby.delete(leg);
            }
          });
          paint();
        },
        { threshold: 0.6 }
      );
      grid.querySelectorAll(".leg-card").forEach(function (card) {
        observer.observe(card);
      });
    }

    return function () {
      home.removeEventListener("pointerover", onOver);
      home.removeEventListener("pointerout", onOut);
      home.removeEventListener("focusin", onFocusIn);
      home.removeEventListener("focusout", onFocusOut);
      if (observer) {
        observer.disconnect();
      }
    };
  }

  /* ---------- site ---------- */

  function groupByDay(images) {
    const order = [];
    const groups = {};
    images.forEach(function (image, index) {
      const key = datePart(image.datetime);
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push({ image: image, index: index });
    });
    return order.map(function (key) {
      return { key: key, items: groups[key] };
    });
  }

  function siteNavLink(legIndex, direction) {
    const leg = (trip.legs || [])[legIndex];
    if (!leg) {
      return '<span class="site-nav-spacer"></span>';
    }
    const isNext = direction === "next";
    const label = isNext ? "Next site" : "Previous site";
    return (
      '<a class="site-nav-link ' +
      (isNext ? "is-next" : "is-prev") +
      '" href="#/leg/' +
      legIndex +
      '"><span class="micro site-nav-dir">' +
      label +
      '</span><span class="site-nav-title">' +
      escapeHtml(leg.title) +
      "</span></a>"
    );
  }

  function renderLeg(legIndex) {
    const title = trip.title || "West Coast Trip";
    const leg = (trip.legs || [])[legIndex];
    if (!leg) {
      go("#/");
      return;
    }

    document.title = leg.title + " \u2014 " + title;
    const range = dateRangeLabel(leg);
    const dates = range ? '<p class="leg-dates">' + escapeHtml(range) + "</p>" : "";
    const state = leg.state
      ? '<p class="site-state micro">' + escapeHtml(leg.state) + "</p>"
      : "";
    const description = (leg.description || "").trim()
      ? '<p class="site-description">' + escapeHtml(leg.description.trim()) + "</p>"
      : "";
    const images = leg.images || [];

    const groups = groupByDay(images)
      .map(function (group) {
        const parts = parseYmd(group.key);
        const heading = parts
          ? '<h2 class="day-heading"><span class="day-heading-label">' +
            escapeHtml(formatDay(parts, false)) +
            "</span></h2>"
          : "";
        const thumbs = group.items
          .map(function (item) {
            const time = formatTime(item.image.datetime);
            return (
              '<a class="thumb" href="#/leg/' +
              legIndex +
              "/photo/" +
              item.index +
              '" aria-label="' +
              escapeHtml(
                "Photo " +
                  (item.index + 1) +
                  " of " +
                  images.length +
                  (time ? ", " + time : "")
              ) +
              '">' +
              '<div class="thumb-image-wrap">' +
              thumbImg(item.image.filename, "thumb-image", "") +
              "</div>" +
              (time ? '<p class="thumb-meta">' + escapeHtml(time) + "</p>" : "") +
              "</a>"
            );
          })
          .join("");
        return (
          '<section class="day-group">' +
          heading +
          '<div class="thumb-grid">' +
          thumbs +
          "</div></section>"
        );
      })
      .join("");

    app.innerHTML =
      '<div class="page">' +
      '<a class="back" href="#/">' +
      ICON_LEFT +
      "Back to " +
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
      (images.length ? groups : '<p class="empty">No photos in this site.</p>') +
      '<nav class="site-nav" aria-label="Nearby sites">' +
      siteNavLink(legIndex - 1, "prev") +
      siteNavLink(legIndex + 1, "next") +
      "</nav>" +
      "</div>";
  }

  /* ---------- photo viewer ---------- */

  const ZOOM_SCALE = 2.6;
  let hintShown = false;

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
    const touch = window.matchMedia("(hover: none)").matches;
    const hint =
      hintShown || images.length < 2
        ? ""
        : '<p class="viewer-hint">' +
          (touch
            ? "Swipe to browse \u00b7 Double-tap to zoom"
            : "Arrow keys to browse \u00b7 Click to zoom") +
          "</p>";
    hintShown = true;

    document.title = (leg.title || title) + " \u2014 photo";
    app.innerHTML =
      '<div class="viewer" data-viewer>' +
      '<div class="viewer-bar">' +
      '<div class="viewer-actions">' +
      '<button class="viewer-back" type="button" data-back>' +
      ICON_LEFT +
      '<span class="label">Back to ' +
      escapeHtml(leg.title) +
      "</span></button>" +
      '<button class="viewer-nav" type="button" data-prev' +
      (photoIndex > 0 ? "" : " disabled") +
      ">" +
      ICON_LEFT +
      '<span class="label">Previous</span></button>' +
      '<button class="viewer-nav" type="button" data-next' +
      (photoIndex < lastIndex ? "" : " disabled") +
      '><span class="label">Next</span>' +
      ICON_RIGHT +
      "</button>" +
      "</div>" +
      '<p class="viewer-meta">' +
      escapeHtml(formatFullDateTime(image.datetime)) +
      "</p></div>" +
      '<div class="viewer-stage" data-stage>' +
      '<img class="viewer-image" data-image src="' +
      photoSrc(image.filename) +
      '" alt="' +
      escapeHtml(leg.title) +
      '"></div>' +
      hint +
      "</div>";

    teardown = bindViewer(legIndex, photoIndex, images.length);
  }

  function bindViewer(legIndex, photoIndex, total) {
    const viewer = app.querySelector("[data-viewer]");
    const stage = app.querySelector("[data-stage]");
    const img = app.querySelector("[data-image]");
    const lastIndex = total - 1;

    let zoomed = false;
    let tx = 0;
    let ty = 0;
    let base = null;
    let idleTimer = null;
    let lastTap = 0;
    let drag = null;

    function goTo(index) {
      if (index < 0 || index > lastIndex) {
        return;
      }
      go("#/leg/" + legIndex + "/photo/" + index);
    }

    function wake() {
      viewer.classList.remove("is-idle");
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(function () {
        const focused = document.activeElement;
        if (focused && viewer.contains(focused) && focused !== document.body) {
          return;
        }
        viewer.classList.add("is-idle");
      }, 3000);
    }

    function measure() {
      const previous = img.style.transform;
      img.style.transform = "none";
      const rect = img.getBoundingClientRect();
      img.style.transform = previous;
      return rect;
    }

    function clamp() {
      if (!base) {
        return;
      }
      const stageRect = stage.getBoundingClientRect();
      const width = base.width * ZOOM_SCALE;
      const height = base.height * ZOOM_SCALE;
      const maxX = stageRect.left - base.left;
      const minX = stageRect.right - base.left - width;
      const maxY = stageRect.top - base.top;
      const minY = stageRect.bottom - base.top - height;
      tx = minX > maxX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, tx));
      ty = minY > maxY ? (minY + maxY) / 2 : Math.min(maxY, Math.max(minY, ty));
    }

    function apply(animate) {
      img.classList.toggle("is-animating", !!animate);
      img.style.transform = zoomed
        ? "translate(" + tx + "px, " + ty + "px) scale(" + ZOOM_SCALE + ")"
        : "";
      if (animate) {
        window.setTimeout(function () {
          img.classList.remove("is-animating");
        }, 300);
      }
    }

    function zoomOut() {
      zoomed = false;
      tx = 0;
      ty = 0;
      base = null;
      stage.classList.remove("is-zoomed");
      apply(true);
    }

    function zoomIn(clientX, clientY) {
      base = measure();
      zoomed = true;
      const localX = clientX - base.left;
      const localY = clientY - base.top;
      tx = localX * (1 - ZOOM_SCALE);
      ty = localY * (1 - ZOOM_SCALE);
      clamp();
      stage.classList.add("is-zoomed");
      apply(true);
    }

    function toggleZoom(clientX, clientY) {
      if (zoomed) {
        zoomOut();
      } else {
        zoomIn(clientX, clientY);
      }
    }

    function onPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }
      drag = {
        id: event.pointerId,
        type: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        originX: tx,
        originY: ty,
        moved: 0,
        time: Date.now(),
      };
      if (zoomed) {
        stage.classList.add("is-panning");
      }
      try {
        stage.setPointerCapture(event.pointerId);
      } catch (error) {
        /* pointer already released */
      }
    }

    function onPointerMove(event) {
      wake();
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
      if (zoomed) {
        tx = drag.originX + dx;
        ty = drag.originY + dy;
        clamp();
        apply(false);
      }
    }

    function onPointerUp(event) {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      const current = drag;
      drag = null;
      stage.classList.remove("is-panning");
      try {
        if (stage.hasPointerCapture(event.pointerId)) {
          stage.releasePointerCapture(event.pointerId);
        }
      } catch (error) {
        /* pointer already released */
      }

      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;

      if (!zoomed && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        goTo(dx < 0 ? photoIndex + 1 : photoIndex - 1);
        return;
      }

      if (current.moved > 8 || Date.now() - current.time > 500) {
        return;
      }

      if (current.type === "touch") {
        const now = Date.now();
        if (now - lastTap < 300) {
          lastTap = 0;
          toggleZoom(event.clientX, event.clientY);
        } else {
          lastTap = now;
          viewer.classList.contains("is-idle")
            ? wake()
            : viewer.classList.add("is-idle");
        }
        return;
      }

      toggleZoom(event.clientX, event.clientY);
    }

    function onResize() {
      if (zoomed) {
        zoomOut();
      }
    }

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    viewer.addEventListener("pointermove", wake);
    window.addEventListener("resize", onResize);

    const back = app.querySelector("[data-back]");
    back.addEventListener("click", function () {
      go("#/leg/" + legIndex);
    });
    const prevButton = app.querySelector("[data-prev]");
    prevButton.addEventListener("click", function () {
      goTo(photoIndex - 1);
    });
    const nextButton = app.querySelector("[data-next]");
    nextButton.addEventListener("click", function () {
      goTo(photoIndex + 1);
    });

    keyHandler = function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          goTo(photoIndex + 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          goTo(photoIndex - 1);
          break;
        case "Home":
          event.preventDefault();
          goTo(0);
          break;
        case "End":
          event.preventDefault();
          goTo(lastIndex);
          break;
        case "Escape":
          event.preventDefault();
          if (zoomed) {
            zoomOut();
          } else {
            go("#/leg/" + legIndex);
          }
          break;
        default:
          return;
      }
      wake();
    };

    wake();

    return function () {
      window.clearTimeout(idleTimer);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerUp);
      viewer.removeEventListener("pointermove", wake);
      window.removeEventListener("resize", onResize);
    };
  }

  /* ---------- routing ---------- */

  const scrollMemory = {};
  let lastHash = location.hash || "#/";

  function render() {
    if (teardown) {
      teardown();
      teardown = null;
    }
    keyHandler = null;

    const route = parseRoute();
    if (route.view === "photo") {
      renderPhoto(route.legIndex, route.photoIndex);
    } else if (route.view === "leg") {
      renderLeg(route.legIndex);
    } else if (location.hash && location.hash !== "#/" && route.view === "home") {
      go("#/");
      return;
    } else {
      renderHome();
    }

    const hash = location.hash || "#/";
    const saved = scrollMemory[hash] || 0;
    window.scrollTo(0, saved);
    lastHash = hash;
  }

  function onHashChange() {
    scrollMemory[lastHash] = window.scrollY;
    render();
  }

  function start(data) {
    trip = data && typeof data === "object" ? data : trip;
    if (!Array.isArray(trip.legs)) {
      trip.legs = [];
    }
    sortTripLegs();
    document.addEventListener("keydown", function (event) {
      if (keyHandler) {
        keyHandler(event);
      }
    });
    window.addEventListener("hashchange", onHashChange);
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
