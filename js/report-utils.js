function cleanSpreadsheetText(text) {
  return String(text || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/""/g, '"')
    .replace(/\r\n/g, "\n")
    .trim();
}


function cleanCoordsText(text) {
  return cleanSpreadsheetText(text)
    .split("\n")
    .map(
      line =>
        line
          .trim()
          .replace(/^"+|"+$/g, "")
    )
    .filter(Boolean)
    .join("\n");
}


function getCoordCount(text) {
  const cleaned =
    cleanCoordsText(text);

  return cleaned
    ? cleaned
        .split("\n")
        .filter(Boolean)
        .length
    : 0;
}


function syncAmountWithCoords() {
  $("amountInput").value =
    getCoordCount(
      $("coordsInput").value
    ) || "";
}


function normalizeFlowerText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[🌸🌼🌺💐]/gu, "")
    .replace(/\d+\s*株/gu, "")
    .replace(
      /[「」『』【】()（）\[\]：:，,。.!！?？\s]/gu,
      ""
    )
    .trim();
}


function detectFlowerName(
  flowerLine,
  detectedColor = ""
) {
  let flowerText =
    normalizeFlowerText(
      flowerLine
    );

  if (
    detectedColor &&
    flowerText.startsWith(
      detectedColor
    )
  ) {
    flowerText =
      flowerText.slice(
        detectedColor.length
      );
  }

  const flowersByLength =
    [...FLOWERS].sort(
      (a, b) =>
        b.length - a.length
    );

  return (
    flowersByLength.find(
      flower => {
        const normalizedFlower =
          normalizeFlowerText(
            flower
          );

        return (
          flowerText ===
            normalizedFlower ||
          flowerText.startsWith(
            normalizedFlower
          )
        );
      }
    ) ||
    flowersByLength.find(
      flower =>
        flowerText.includes(
          normalizeFlowerText(
            flower
          )
        )
    ) ||
    ""
  );
}


function parseReportText(text) {
  const cleaned =
    cleanSpreadsheetText(text);

  const lines = cleaned
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const firstLine =
    lines[0] || "";

  const flowerLine =
    lines.find(
      line =>
        line.includes("🌸")
    ) || "";

  const timeLine =
    lines.find(
      line =>
        line.includes("⏰")
    ) || "";

  const noteLine =
    lines.find(
      line =>
        line.includes("📝")
    ) || "";

  const normalizedFlowerLine =
    normalizeFlowerText(
      flowerLine
    );

  const color =
    COLORS
      .filter(
        c => c !== "混色"
      )
      .sort(
        (a, b) =>
          b.length - a.length
      )
      .find(
        c =>
          normalizedFlowerLine.startsWith(
            c
          ) ||
          normalizedFlowerLine.includes(
            c
          )
      ) ||
    (
      normalizedFlowerLine.includes(
        "混色"
      )
        ? "混色"
        : ""
    );

  const flower =
    detectFlowerName(
      flowerLine,
      color
    );

  const amountMatch =
    flowerLine.match(
      /(\d+)\s*株/
    );

  const timeMatch =
    timeLine.match(
      /(\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/
    );

  return {
    place: firstLine,
    color,
    flower,

    amount:
      amountMatch
        ? amountMatch[1]
        : "",

    time:
      timeMatch
        ? timeMatch[1]
        : timeLine
            .replace("⏰", "")
            .trim(),

    note:
      noteLine
        .replace("📝", "")
        .trim(),

    raw: cleaned
  };
}


function normalizeFlowerName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .trim();
}


function getCanonicalFlowerName(
  value
) {
  const normalizedValue =
    normalizeFlowerName(
      value
    );

  if (!normalizedValue) {
    return "";
  }

  return (
    FLOWERS.find(
      flower =>
        normalizeFlowerName(
          flower
        ) === normalizedValue
    ) || ""
  );
}


function validateFlowerInput(
  showAlert = false
) {
  const input =
    $("flowerInput");

  const typedValue =
    input.value;

  const canonicalFlower =
    getCanonicalFlowerName(
      typedValue
    );

  const isValid =
    canonicalFlower !== "";

  input.setCustomValidity(
    isValid
      ? ""
      : "花朵種類必須是清單中的完整花名"
  );

  if (isValid) {
    input.value =
      canonicalFlower;

  } else if (showAlert) {
    const displayValue =
      typedValue.trim();

    alert(
      displayValue
        ? `「${displayValue}」不是有效花種。花朵種類必須從清單中選擇完整花名。`
        : "請輸入或選擇花朵種類。"
    );

    input.focus();
    input.select();
  }

  return isValid;
}


function getFormData() {
  const raw =
    cleanSpreadsheetText(
      $("rawInput").value
    );

  return {
    id:
      editingId ||
      crypto.randomUUID(),

    place:
      $("placeInput")
        .value
        .trim(),

    color:
      $("colorInput").value,

    flower:
      $("flowerInput")
        .value
        .trim(),

    amount:
      String(
        getCoordCount(
          $("coordsInput").value
        )
      ),

    time:
      $("timeInput")
        .value
        .trim(),

    note:
      $("noteInput")
        .value
        .trim(),

    raw,

    coords:
      cleanCoordsText(
        $("coordsInput").value
      ),

    updatedAt:
      new Date().toISOString()
  };
}


function setFormData(report) {
  editingId = report.id;

  $("rawInput").value =
    report.raw || "";

  $("coordsInput").value =
    report.coords || "";

  $("placeInput").value =
    report.place || "";

  $("colorInput").value =
    report.color ||
    COLORS[0];

  $("flowerInput").value =
    report.flower || "";

  $("amountInput").value =
    report.coords
      ? getCoordCount(
          report.coords
        )
      : (
          report.amount || ""
        );

  $("timeInput").value =
    formatDisplayTime(
      report.time
    ) || "";

  $("noteInput").value =
    report.note || "";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function clearForm() {
  editingId = null;

  $("rawInput").value = "";
  $("coordsInput").value = "";
  $("placeInput").value = "";
  $("timeInput").value = "";
  $("amountInput").value = "";
  $("noteInput").value = "";

  $("colorInput").value =
    COLORS[0];

  $("flowerInput").value = "";
}


function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function pad2(value) {
  return String(value)
    .padStart(2, "0");
}


function formatDisplayTime(
  timeText
) {
  const value =
    String(timeText || "")
      .trim();

  if (!value) return "";

  const normalMatch =
    value.match(
      /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/
    );

  if (normalMatch) {
    return (
      `${Number(normalMatch[1])}/` +
      `${Number(normalMatch[2])} ` +
      `${pad2(Number(normalMatch[3]))}:` +
      `${normalMatch[4]}`
    );
  }

  const date =
    new Date(value);

  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {
    return (
      `${date.getMonth() + 1}/` +
      `${date.getDate()} ` +
      `${pad2(date.getHours())}:` +
      `${pad2(date.getMinutes())}`
    );
  }

  return value;
}


function parseOpeningDate(
  timeText
) {
  const value =
    String(timeText || "")
      .trim();

  if (!value) return null;

  const dateFromSheet =
    new Date(value);

  if (
    !Number.isNaN(
      dateFromSheet.getTime()
    ) &&
    /\d{4}-\d{2}-\d{2}T/.test(
      value
    )
  ) {
    return dateFromSheet;
  }

  const displayValue =
    formatDisplayTime(
      value
    );

  const match =
    displayValue.match(
      /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

  const now = new Date();

  const month =
    Number(match[1]);

  const day =
    Number(match[2]);

  const hour =
    Number(match[3]);

  const minute =
    Number(match[4]);

  const openedAt =
    new Date(
      now.getFullYear(),
      month - 1,
      day,
      hour,
      minute,
      0,
      0
    );

  if (
    openedAt.getTime() -
      now.getTime() >
    180 *
      24 *
      60 *
      60 *
      1000
  ) {
    openedAt.setFullYear(
      openedAt.getFullYear() -
      1
    );
  }

  return openedAt;
}


function getReportCoordCount(
  report
) {
  if (report.coords) {
    return report.coords
      .split("\n")
      .filter(Boolean)
      .length;
  }

  return Number(
    report.amount || 0
  );
}


function getPreviewCompleteMinutes(
  report
) {
  const coordCount =
    getReportCoordCount(
      report
    );

  if (coordCount <= 25) {
    return 20;
  }

  if (coordCount <= 40) {
    return 25;
  }

  return 30;
}


function isUpcomingReport(report) {
  const openedAt =
    parseOpeningDate(
      report.time
    );

  if (!openedAt) {
    return false;
  }

  const moveToActiveAt =
    openedAt.getTime() +
    getPreviewCompleteMinutes(
      report
    ) *
    60 *
    1000;

  return (
    Date.now() <
    moveToActiveAt
  );
}


function getPreviewStatus(
  report
) {
  const openedAt =
    parseOpeningDate(
      report.time
    );

  if (!openedAt) {
    return "未開花";
  }

  return Date.now() <
    openedAt.getTime()
    ? "未開花"
    : "開花中";
}


function getPreviewCompleteTime(
  report
) {
  const openedAt =
    parseOpeningDate(
      report.time
    );

  if (!openedAt) {
    return "未填時間";
  }

  const moveToActiveAt =
    new Date(
      openedAt.getTime() +
      getPreviewCompleteMinutes(
        report
      ) *
      60 *
      1000
    );

  return formatDisplayTime(
    moveToActiveAt.toISOString()
  );
}


function isExpiredReport(report) {
  const openedAt =
    parseOpeningDate(
      report.time
    );

  if (!openedAt) {
    return false;
  }

  const expireAt =
    openedAt.getTime() +
    CONFIG.FRUIT_AVAILABLE_MINUTES *
    60 *
    1000;

  return Date.now() >= expireAt;
}
