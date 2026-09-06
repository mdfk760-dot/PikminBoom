function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


function sanitizeFileName(value) {
  return String(value || "收果路徑")
    .replace(/[\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "收果路徑";
}


function parseCoordinateLines(coordsText) {
  return cleanCoordsText(coordsText)
    .split("\n")
    .map(line => {
      const match = line.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
      );

      if (!match) return null;

      const lat = Number(match[1]);
      const lon = Number(match[2]);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      ) {
        return null;
      }

      return {
        lat,
        lon
      };
    })
    .filter(Boolean);
}


function buildFruitGpx(
  coordsText,
  trackName = "妖妖收果路徑"
) {
  const sourcePoints =
    parseCoordinateLines(coordsText);

  const longitudeOffsets = [
    -0.000045,
    0,
    0.000045
  ];

  const fruitPoints = [];

  const positionLabels = [
    "L",
    "M",
    "R"
  ];

  sourcePoints.forEach(
    (point, sourceIndex) => {

      longitudeOffsets.forEach(
        (offset, positionIndex) => {

          fruitPoints.push({
            lat: point.lat,
            lon: point.lon + offset,
            name:
              `P${sourceIndex + 1}-${positionLabels[positionIndex]}`
          });

        }
      );

    }
  );

  const wptContent = fruitPoints
    .map(
      point =>
        `  <wpt lat="${escapeXml(point.lat.toFixed(6))}" lon="${escapeXml(point.lon.toFixed(6))}"><name>${escapeXml(point.name)}</name></wpt>`
    )
    .join("\n");

  const trkptContent = sourcePoints
    .map(
      point =>
        `      <trkpt lat="${escapeXml(point.lat.toFixed(6))}" lon="${escapeXml(point.lon.toFixed(6))}"></trkpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="XiaoXiao">
${wptContent}
  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
${trkptContent}
    </trkseg>
  </trk>
</gpx>`;
}


async function arJumpHarvest(id) {
  const report =
    reports.find(
      item => item.id === id
    );

  if (
    !report ||
    !report.coords
  ) {
    showToast(
      "這筆公告沒有座標可以產生 AR 跳收內容"
    );

    return;
  }

  const sourcePoints =
    parseCoordinateLines(
      report.coords
    );

  const originalCoordCount =
    getCoordCount(
      report.coords
    );

  if (
    !sourcePoints.length ||
    sourcePoints.length !==
      originalCoordCount
  ) {
    alert(
      "座標格式有誤，請確認每一行皆為「緯度,經度」。"
    );

    return;
  }

  const trackName =
    buildDownloadGpxFileName(
      report,
      sourcePoints.length
    ).replace(
      /\.gpx$/i,
      ""
    );

  const gpx =
    buildFruitGpx(
      report.coords,
      trackName
    );

  try {
    await navigator.clipboard.writeText(
      gpx
    );

  } catch (error) {
    const temp =
      document.createElement(
        "textarea"
      );

    temp.value = gpx;
    temp.style.position = "fixed";
    temp.style.opacity = "0";

    document.body.appendChild(
      temp
    );

    temp.select();

    document.execCommand(
      "copy"
    );

    temp.remove();
  }

  showToast(
    `已複製 AR 跳收 GPX（${sourcePoints.length * 3} 個跳點）`
  );
}


function buildDownloadGpxFileName(
  report,
  coordCount
) {
  const flowerText =
    `${report.color || ""}` +
    `${report.flower || ""}` +
    `${coordCount || getReportCoordCount(report)}株`;

  return `${
    sanitizeFileName(
      `妖妖收果_${flowerText}`
    )
  }.gpx`;
}


function downloadTextFile(
  content,
  fileName,
  mimeType =
    "application/gpx+xml;charset=utf-8"
) {
  const blob =
    new Blob(
      [content],
      {
        type: mimeType
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download = fileName;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(
    url
  );
}


function downloadFruitGpx(id) {
  const report =
    reports.find(
      item => item.id === id
    );

  if (
    !report ||
    !report.coords
  ) {
    showToast(
      "這筆公告沒有座標可以下載 GPX"
    );

    return;
  }

  const sourcePoints =
    parseCoordinateLines(
      report.coords
    );

  const originalCoordCount =
    getCoordCount(
      report.coords
    );

  if (
    !sourcePoints.length ||
    sourcePoints.length !==
      originalCoordCount
  ) {
    alert(
      "座標格式有誤，請確認每一行皆為「緯度,經度」。"
    );

    return;
  }

  const fileName =
    buildDownloadGpxFileName(
      report,
      sourcePoints.length
    );

  const trackName =
    fileName.replace(
      /\.gpx$/i,
      ""
    );

  const gpx =
    buildFruitGpx(
      report.coords,
      trackName
    );

  downloadTextFile(
    gpx,
    fileName
  );

  showToast(
    `已下載 GPX：${fileName}`
  );
}
