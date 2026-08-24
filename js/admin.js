(function () {
  const IMAGE_EXTENSIONS = {
    ".jpg": true,
    ".jpeg": true,
    ".png": true,
    ".webp": true,
    ".heic": true,
    ".heif": true,
    ".tif": true,
    ".tiff": true,
  };

  const fileInput = document.getElementById("file-input");
  const inboxEl = document.getElementById("inbox");
  const inboxSection = document.getElementById("inbox-section");
  const legListEl = document.getElementById("leg-list");
  const editorEl = document.getElementById("leg-editor");
  const legTitleInput = document.getElementById("leg-title");
  const saveButton = document.getElementById("save-json");
  const saveStatus = document.getElementById("save-status");
  const thumbBanner = document.getElementById("thumb-banner");

  let nextId = 1;
  let activeLegId = null;
  let tripFileHandle = null;
  const photos = [];
  const legs = [];
  const selected = new Set();

  function extensionOf(name) {
    const index = name.lastIndexOf(".");
    return index === -1 ? "" : name.slice(index).toLowerCase();
  }

  function isImageFile(file) {
    return Boolean(IMAGE_EXTENSIONS[extensionOf(file.name)]);
  }

  function isoFromDate(date) {
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds())
    );
  }

  function exifToIso(value) {
    const match = String(value).match(
      /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
    );
    if (!match) {
      return null;
    }
    return (
      match[1] +
      "-" +
      match[2] +
      "-" +
      match[3] +
      "T" +
      match[4] +
      ":" +
      match[5] +
      ":" +
      match[6]
    );
  }

  function readAscii(view, offset, length) {
    const chars = [];
    const end = Math.min(offset + length, view.byteLength);
    for (let i = offset; i < end; i += 1) {
      const code = view.getUint8(i);
      if (code === 0) {
        break;
      }
      chars.push(String.fromCharCode(code));
    }
    return chars.join("");
  }

  function readIfdDates(view, tiffStart, ifdOffset, read16, read32) {
    const result = {};
    if (ifdOffset < 0 || ifdOffset + 2 > view.byteLength) {
      return result;
    }
    const count = read16(ifdOffset);
    let exifOffset = null;
    for (let i = 0; i < count; i += 1) {
      const entry = ifdOffset + 2 + i * 12;
      if (entry + 12 > view.byteLength) {
        break;
      }
      const tag = read16(entry);
      const type = read16(entry + 2);
      const num = read32(entry + 4);
      const valueAt = entry + 8;
      if (tag === 0x8769) {
        exifOffset = tiffStart + read32(valueAt);
      } else if ((tag === 0x9003 || tag === 0x0132) && type === 2) {
        let strOff = valueAt;
        if (num > 4) {
          strOff = tiffStart + read32(valueAt);
        }
        const text = readAscii(view, strOff, num);
        if (tag === 0x9003) {
          result.dateTimeOriginal = text;
        } else {
          result.dateTime = text;
        }
      }
    }
    if (exifOffset != null && !result.dateTimeOriginal) {
      const nested = readIfdDates(view, tiffStart, exifOffset, read16, read32);
      if (nested.dateTimeOriginal) {
        result.dateTimeOriginal = nested.dateTimeOriginal;
      }
      if (!result.dateTime && nested.dateTime) {
        result.dateTime = nested.dateTime;
      }
    }
    return result;
  }

  function parseTiffDate(view, tiffStart) {
    if (tiffStart + 8 > view.byteLength) {
      return null;
    }
    const order = view.getUint16(tiffStart);
    const little = order === 0x4949;
    if (!little && order !== 0x4d4d) {
      return null;
    }
    const read16 = function (offset) {
      return view.getUint16(offset, little);
    };
    const read32 = function (offset) {
      return view.getUint32(offset, little);
    };
    if (read16(tiffStart + 2) !== 0x002a) {
      return null;
    }
    const ifd0 = tiffStart + read32(tiffStart + 4);
    const dates = readIfdDates(view, tiffStart, ifd0, read16, read32);
    return exifToIso(dates.dateTimeOriginal || dates.dateTime);
  }

  function extractJpegDate(view) {
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
      return null;
    }
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) {
        break;
      }
      const marker = view.getUint8(offset + 1);
      const size = view.getUint16(offset + 2);
      if (size < 2) {
        break;
      }
      if (marker === 0xe1 && offset + 4 + 6 <= view.byteLength) {
        const start = offset + 4;
        const header =
          String.fromCharCode(view.getUint8(start)) +
          String.fromCharCode(view.getUint8(start + 1)) +
          String.fromCharCode(view.getUint8(start + 2)) +
          String.fromCharCode(view.getUint8(start + 3));
        if (header === "Exif") {
          return parseTiffDate(view, start + 6);
        }
      }
      if (marker === 0xda) {
        break;
      }
      offset += 2 + size;
    }
    return null;
  }

  async function readImageDateTime(file) {
    const fallback = isoFromDate(new Date(file.lastModified));
    try {
      const buffer = await file.arrayBuffer();
      const extracted = extractJpegDate(new DataView(buffer));
      return extracted || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function filenameOf(file) {
    const name = file.name.replace(/\\/g, "/");
    return name.split("/").pop();
  }

  function photoUrl(filename) {
    return "./photos/" + encodeURIComponent(filename);
  }

  function loadTrip(data) {
    const incoming = data && Array.isArray(data.legs) ? data.legs : [];
    incoming.forEach(function (legData) {
      const leg = {
        id: nextId,
        title: legData.title || "Untitled",
        state: legData.state || "",
        description: legData.description || "",
        heroId: null,
      };
      nextId += 1;
      legs.push(leg);
      (legData.images || []).forEach(function (image) {
        const photo = {
          id: nextId,
          filename: image.filename,
          url: photoUrl(image.filename),
          datetime: image.datetime || "",
          legId: leg.id,
        };
        nextId += 1;
        photos.push(photo);
        if (image.hero) {
          leg.heroId = photo.id;
        }
      });
      if (leg.heroId == null && photosInLeg(leg.id)[0]) {
        leg.heroId = photosInLeg(leg.id)[0].id;
      }
    });
    if (legs.length) {
      activeLegId = legs[0].id;
    }
  }

  async function addFiles(fileList) {
    const leg = activeLeg();
    if (!leg) {
      setStatus("Add or select a site first", "err");
      return;
    }
    const incoming = Array.from(fileList).filter(isImageFile);
    if (!incoming.length) {
      return;
    }
    let firstNewId = null;
    let addedCount = 0;
    let movedCount = 0;
    for (const file of incoming) {
      const filename = filenameOf(file);
      const existing = photos.find(function (photo) {
        return photo.filename === filename;
      });
      const datetime = await readImageDateTime(file);
      const url = URL.createObjectURL(file);
      if (existing) {
        if (existing.url.indexOf("blob:") === 0) {
          URL.revokeObjectURL(existing.url);
        }
        existing.file = file;
        existing.url = url;
        if (!existing.datetime) {
          existing.datetime = datetime;
        }
        if (existing.legId !== leg.id) {
          if (existing.legId != null) {
            movedCount += 1;
          } else {
            addedCount += 1;
          }
          movePhotoToLeg(existing, leg.id);
          if (firstNewId == null) {
            firstNewId = existing.id;
          }
        }
      } else {
        const photo = {
          id: nextId,
          file: file,
          filename: filename,
          url: url,
          datetime: datetime,
          legId: leg.id,
        };
        nextId += 1;
        photos.push(photo);
        addedCount += 1;
        if (firstNewId == null) {
          firstNewId = photo.id;
        }
      }
    }
    if (leg.heroId == null && firstNewId != null) {
      leg.heroId = firstNewId;
    }
    photos.sort(function (a, b) {
      if (a.datetime === b.datetime) {
        return a.filename.localeCompare(b.filename);
      }
      return a.datetime < b.datetime ? -1 : 1;
    });
    render();
    const changed = addedCount + movedCount;
    setStatus(addFilesStatus(addedCount, movedCount, leg), changed ? "ok" : "err");
  }

  function countLabel(count, noun) {
    return count + " " + noun + (count === 1 ? "" : "s");
  }

  function addFilesStatus(addedCount, movedCount, leg) {
    if (!addedCount && !movedCount) {
      return "Already on " + leg.title + " — nothing to add";
    }
    const parts = [];
    if (addedCount) {
      parts.push(countLabel(addedCount, "photo") + " added");
    }
    if (movedCount) {
      parts.push(countLabel(movedCount, "photo") + " moved from another site");
    }
    return parts.join(", ") + " — " + leg.title;
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

  function datesForLeg(legId) {
    return datesFromDatetimes(
      photosInLeg(legId).map(function (photo) {
        return photo.datetime;
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

  function earliestForLeg(legId) {
    return earliestDatetime(
      photosInLeg(legId).map(function (photo) {
        return photo.datetime;
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

  const SHORT_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function formatDateRangeShort(startDate, endDate) {
    const start = parseYmd(startDate);
    const end = parseYmd(endDate || startDate);
    if (!start) {
      return "";
    }
    if (!end || startDate === endDate) {
      return SHORT_MONTHS[start.month - 1] + " " + start.day + ", " + start.year;
    }
    if (start.year === end.year && start.month === end.month) {
      return (
        SHORT_MONTHS[start.month - 1] +
        " " +
        start.day +
        "-" +
        end.day +
        ", " +
        start.year
      );
    }
    if (start.year === end.year) {
      return (
        SHORT_MONTHS[start.month - 1] +
        " " +
        start.day +
        " - " +
        SHORT_MONTHS[end.month - 1] +
        " " +
        end.day +
        ", " +
        start.year
      );
    }
    return (
      SHORT_MONTHS[start.month - 1] +
      " " +
      start.day +
      ", " +
      start.year +
      " - " +
      SHORT_MONTHS[end.month - 1] +
      " " +
      end.day +
      ", " +
      end.year
    );
  }

  function sortLegsByStart() {
    legs.sort(function (a, b) {
      const aStart = earliestForLeg(a.id);
      const bStart = earliestForLeg(b.id);
      if (!aStart && !bStart) {
        return a.title.localeCompare(b.title);
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
      return a.title.localeCompare(b.title);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function photosInLeg(legId) {
    return photos.filter(function (photo) {
      return photo.legId === legId;
    });
  }

  function unassignedPhotos() {
    return photos.filter(function (photo) {
      return photo.legId == null;
    });
  }

  function movePhotoToLeg(photo, legId) {
    const oldLeg = legs.find(function (item) {
      return item.id === photo.legId;
    });
    const wasHero = !!oldLeg && oldLeg.heroId === photo.id;
    photo.legId = legId;
    if (wasHero) {
      const nextHero = photosInLeg(oldLeg.id)[0];
      oldLeg.heroId = nextHero ? nextHero.id : null;
    }
  }

  function activeLeg() {
    return legs.find(function (item) {
      return item.id === activeLegId;
    });
  }

  function photoCard(photo, options) {
    const selectedClass = selected.has(photo.id) ? " is-selected" : "";
    const heroClass = options.hero ? " is-hero" : "";
    const heroBadge = options.hero ? '<span class="badge">Hero</span>' : "";
    const unassign = options.unassign
      ? '<button type="button" class="mini" data-unassign="' +
        photo.id +
        '">Unassign</button>'
      : "";
    return (
      '<article class="photo-card' +
      selectedClass +
      heroClass +
      '" data-photo="' +
      photo.id +
      '">' +
      '<img src="' +
      photo.url +
      '" alt="' +
      escapeHtml(photo.filename) +
      '">' +
      '<div class="photo-meta">' +
      "<strong>" +
      escapeHtml(photo.filename) +
      "</strong>" +
      "<span>" +
      escapeHtml(formatDateTime(photo.datetime)) +
      "</span>" +
      heroBadge +
      unassign +
      "</div></article>"
    );
  }

  function renderInbox() {
    const items = unassignedPhotos();
    if (!items.length) {
      inboxSection.hidden = true;
      inboxEl.innerHTML = "";
      return;
    }
    inboxSection.hidden = false;
    inboxEl.innerHTML = items
      .map(function (photo) {
        return photoCard(photo, { hero: false, unassign: false });
      })
      .join("");
  }

  function renderLegList() {
    if (!legs.length) {
      legListEl.innerHTML = '<li class="empty">No sites yet.</li>';
      return;
    }
    legListEl.innerHTML = legs
      .map(function (leg) {
        const count = photosInLeg(leg.id).length;
        const active = leg.id === activeLegId ? " is-active" : "";
        const dates = datesForLeg(leg.id);
        const range = dates
          ? formatDateRangeShort(dates.startDate, dates.endDate)
          : "";
        const dateLine = range
          ? '<span class="leg-item-dates">' + escapeHtml(range) + "</span>"
          : "";
        return (
          '<li><button type="button" class="leg-item' +
          active +
          '" data-select-leg="' +
          leg.id +
          '"><span class="leg-item-text"><span class="leg-item-heading"><span class="leg-item-title">' +
          escapeHtml(leg.title) +
          "</span>" +
          (leg.state
            ? '<span class="leg-item-state">' +
              escapeHtml(leg.state) +
              "</span>"
            : "") +
          "</span>" +
          dateLine +
          '</span><span class="count">' +
          count +
          "</span></button></li>"
        );
      })
      .join("");
  }

  function renderEditor() {
    const leg = activeLeg();
    if (!leg) {
      editorEl.innerHTML =
        '<p class="empty">Select a site to edit, or add a new one.</p>';
      return;
    }
    const items = photosInLeg(leg.id);
    const cards = items.length
      ? items
          .map(function (photo) {
            return photoCard(photo, {
              hero: photo.id === leg.heroId,
              unassign: true,
            });
          })
          .join("")
      : '<p class="empty">No photos in this site yet. Use Add photos to add them here.</p>';
    const leftover = unassignedPhotos().length
      ? '<button type="button" data-assign="' +
        leg.id +
        '">Add selected</button>'
      : "";
    const dates = datesForLeg(leg.id);
    const range = dates ? formatDateRange(dates.startDate, dates.endDate) : "";
    const dateLine = range
      ? '<p class="leg-dates">' + escapeHtml(range) + "</p>"
      : "";
    editorEl.innerHTML =
      '<div class="leg-head">' +
      '<label class="title-label" for="edit-title">Editing</label>' +
      '<div class="title-row">' +
      '<input id="edit-title" type="text" value="' +
      escapeHtml(leg.title) +
      '">' +
      '<label class="state-label" for="edit-state">State</label>' +
      '<input id="edit-state" type="text" placeholder="California" value="' +
      escapeHtml(leg.state || "") +
      '">' +
      "</div>" +
      dateLine +
      '<label class="title-label" for="edit-description">Description</label>' +
      '<textarea id="edit-description" rows="4" placeholder="Optional notes for this site">' +
      escapeHtml(leg.description || "") +
      "</textarea>" +
      '<div class="row">' +
      leftover +
      '<button type="button" class="ghost" data-remove-leg="' +
      leg.id +
      '">Remove site</button>' +
      "</div></div>" +
      '<p class="hint">Add photos goes to this site. Click a photo to make it the hero.</p>' +
      '<div class="photo-grid">' +
      cards +
      "</div>";
  }

  function render() {
    sortLegsByStart();
    renderLegList();
    renderInbox();
    renderEditor();
  }

  function setStatus(message, kind) {
    saveStatus.textContent = message;
    saveStatus.className = "save-status" + (kind ? " is-" + kind : "");
  }

  function assignSelected(legId) {
    const leg = legs.find(function (item) {
      return item.id === legId;
    });
    if (!leg) {
      return;
    }
    selected.forEach(function (id) {
      const photo = photos.find(function (item) {
        return item.id === id;
      });
      if (photo) {
        movePhotoToLeg(photo, legId);
        if (leg.heroId == null) {
          leg.heroId = photo.id;
        }
      }
    });
    selected.clear();
    render();
  }

  function buildTrip() {
    sortLegsByStart();
    return {
      title: "West Coast Trip",
      legs: legs.map(function (leg) {
        const images = photosInLeg(leg.id).map(function (photo) {
          return {
            filename: photo.filename,
            datetime: photo.datetime,
            hero: photo.id === leg.heroId,
          };
        });
        const dates = datesFromDatetimes(
          images.map(function (image) {
            return image.datetime;
          })
        );
        const out = { title: leg.title };
        if (leg.state) {
          out.state = String(leg.state).trim();
        }
        if (leg.description && String(leg.description).trim()) {
          out.description = String(leg.description).trim();
        }
        if (dates) {
          out.startDate = dates.startDate;
          out.endDate = dates.endDate;
        }
        out.images = images;
        return out;
      }),
    };
  }

  function tripText() {
    return JSON.stringify(buildTrip(), null, 2) + "\n";
  }

  function tripBlob() {
    return new Blob([tripText()], { type: "application/json" });
  }

  function downloadTrip() {
    const url = URL.createObjectURL(tripBlob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "trip.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Downloaded trip.json — replace the file in the repo", "ok");
  }

  async function writeToHandle(handle) {
    const writable = await handle.createWritable();
    await writable.write(tripBlob());
    await writable.close();
    tripFileHandle = handle;
    setStatus("Saved", "ok");
  }

  async function saveWithPicker() {
    if (tripFileHandle) {
      const permission = await tripFileHandle.queryPermission({ mode: "readwrite" });
      if (permission === "granted") {
        await writeToHandle(tripFileHandle);
        return;
      }
      const next = await tripFileHandle.requestPermission({ mode: "readwrite" });
      if (next === "granted") {
        await writeToHandle(tripFileHandle);
        return;
      }
    }
    if (!window.showSaveFilePicker) {
      downloadTrip();
      return;
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: "trip.json",
      types: [
        {
          description: "Trip JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    await writeToHandle(handle);
  }

  async function saveTrip() {
    setStatus("Saving…");
    try {
      const response = await fetch("./trip.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: tripText(),
      });
      if (response.ok) {
        setStatus("Saved", "ok");
        return;
      }
    } catch (error) {
      // Fall through to the save dialog.
    }
    await saveWithPicker();
  }

  function addLeg() {
    const title = legTitleInput.value.trim();
    if (!title) {
      legTitleInput.focus();
      return;
    }
    const leg = { id: nextId, title: title, state: "", description: "", heroId: null };
    nextId += 1;
    legs.push(leg);
    activeLegId = leg.id;
    legTitleInput.value = "";
    render();
  }

  document.getElementById("add-photos").addEventListener("click", function () {
    if (!activeLeg()) {
      setStatus("Add or select a site first", "err");
      return;
    }
    setStatus("");
    fileInput.click();
  });
  document.getElementById("add-leg").addEventListener("click", addLeg);
  legTitleInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      addLeg();
    }
  });
  saveButton.addEventListener("click", function () {
    saveTrip().catch(function (error) {
      if (error && error.name === "AbortError") {
        setStatus("");
        return;
      }
      downloadTrip();
    });
  });
  fileInput.addEventListener("change", function () {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  editorEl.addEventListener("input", function (event) {
    const leg = activeLeg();
    if (!leg) {
      return;
    }
    if (event.target.id === "edit-title") {
      leg.title = event.target.value;
      sortLegsByStart();
      renderLegList();
      return;
    }
    if (event.target.id === "edit-state") {
      leg.state = event.target.value;
      renderLegList();
      return;
    }
    if (event.target.id === "edit-description") {
      leg.description = event.target.value;
    }
  });

  document.body.addEventListener("click", function (event) {
    const selectLeg = event.target.closest("[data-select-leg]");
    if (selectLeg) {
      activeLegId = Number(selectLeg.getAttribute("data-select-leg"));
      render();
      return;
    }
    const assign = event.target.closest("[data-assign]");
    if (assign) {
      assignSelected(Number(assign.getAttribute("data-assign")));
      return;
    }
    const unassign = event.target.closest("[data-unassign]");
    if (unassign) {
      const id = Number(unassign.getAttribute("data-unassign"));
      const photo = photos.find(function (item) {
        return item.id === id;
      });
      if (photo) {
        movePhotoToLeg(photo, null);
        selected.delete(id);
        render();
      }
      return;
    }
    const removeLeg = event.target.closest("[data-remove-leg]");
    if (removeLeg) {
      const id = Number(removeLeg.getAttribute("data-remove-leg"));
      photos.forEach(function (photo) {
        if (photo.legId === id) {
          photo.legId = null;
        }
      });
      const index = legs.findIndex(function (item) {
        return item.id === id;
      });
      if (index !== -1) {
        legs.splice(index, 1);
      }
      if (activeLegId === id) {
        activeLegId = legs[0] ? legs[0].id : null;
      }
      render();
      return;
    }
    const card = event.target.closest("[data-photo]");
    if (!card) {
      return;
    }
    const photoId = Number(card.getAttribute("data-photo"));
    const photo = photos.find(function (item) {
      return item.id === photoId;
    });
    if (!photo) {
      return;
    }
    if (photo.legId != null && !event.target.closest("button")) {
      const leg = legs.find(function (item) {
        return item.id === photo.legId;
      });
      if (leg) {
        leg.heroId = photo.id;
        render();
      }
      return;
    }
    if (selected.has(photoId)) {
      selected.delete(photoId);
    } else {
      selected.add(photoId);
    }
    render();
  });

  function refreshThumbStatus() {
    if (!thumbBanner) {
      return;
    }
    fetch("./thumb-status")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("no thumb status");
        }
        return response.json();
      })
      .then(function (data) {
        const missing = data && Array.isArray(data.missing) ? data.missing : [];
        if (!missing.length) {
          thumbBanner.hidden = true;
          thumbBanner.textContent = "";
          return;
        }
        thumbBanner.hidden = false;
        thumbBanner.innerHTML =
          missing.length +
          (missing.length === 1
            ? " photo has no thumbnail. "
            : " photos have no thumbnail. ") +
          "In this folder run <code>uv run python make_thumbs.py</code>, then refresh.";
      })
      .catch(function () {
        thumbBanner.hidden = true;
      });
  }

  fetch("./trip.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("missing trip.json");
      }
      return response.json();
    })
    .then(function (data) {
      loadTrip(data);
      render();
      refreshThumbStatus();
    })
    .catch(function () {
      render();
      refreshThumbStatus();
    });
})();
