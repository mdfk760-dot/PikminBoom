const REPORT_FETCH_TIMEOUT = 15000;
const ACCESS_VERIFY_TIMEOUTS = [12000, 25000];

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = REPORT_FETCH_TIMEOUT
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store"
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function wait(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

async function loadReports() {
  const requestRole = accessRole;
  const requestPassword = accessPassword;

  try {
    let res;

    if (
      requestRole === "private" ||
      requestRole === "admin"
    ) {
      res = await fetchWithTimeout(
        CONFIG.API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },
          body: JSON.stringify({
            action: "list",
            accessPassword:
              requestPassword
          })
        }
      );
    } else {
      res = await fetchWithTimeout(
        `${CONFIG.API_URL}?action=list&ts=${Date.now()}`
      );
    }

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status}`
      );
    }

    const data = await res.json();

    if (!data.success) {
      if (
        (
          requestRole === "private" ||
          requestRole === "admin"
        ) &&
        data.code === "INVALID_ACCESS"
      ) {
        clearAccessSession();
        setAccessMode("public");
        restoreReportsSnapshot("public");
        showToast(
          "登入已失效，已切回公開模式"
        );

        return await loadReports();
      }

      throw new Error(
        data.message ||
        "讀取資料失敗"
      );
    }

    if (
      requestRole !== accessRole
    ) {
      return false;
    }

    reports = Array.isArray(
      data.reports
    )
      ? data.reports
      : [];

    if (
      data.dataVersion != null
    ) {
      currentDataVersion =
        String(data.dataVersion);
    }

    saveReportsSnapshot(
      requestRole,
      reports
    );

    hasDisplayedReportSnapshot = true;

    return true;

  } catch (error) {
    console.error(error);

    const timedOut =
      error &&
      error.name === "AbortError";

    const hasFallback =
      requestRole === accessRole &&
      (
        hasDisplayedReportSnapshot ||
        restoreReportsSnapshot(
          requestRole
        )
      );

    if (hasFallback) {
      showToast(
        timedOut
          ? "連線逾時，目前顯示上次成功資料"
          : "暫時無法更新，目前顯示上次成功資料"
      );
    } else {
      showToast(
        timedOut
          ? "資料載入逾時，稍後會自動重試"
          : "讀取 Google Sheet 失敗"
      );
    }

    return false;
  }
}

async function verifyAccessPasswordOnce(
  password,
  timeoutMs
) {
  const res =
    await fetchWithTimeout(
      CONFIG.API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action: "verify",
          accessPassword: password
        })
      },
      timeoutMs
    );

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status}`
    );
  }

  const data = await res.json();

  return {
    success: !!data.success,
    role: data.role || "public",
    reports:
      Array.isArray(data.reports)
        ? data.reports
        : null,
    dataVersion:
      data.dataVersion != null
        ? String(data.dataVersion)
        : null,
    message: data.message || ""
  };
}

async function verifyAccessPassword(
  password
) {
  let lastError = null;

  for (
    let attempt = 0;
    attempt <
    ACCESS_VERIFY_TIMEOUTS.length;
    attempt++
  ) {
    try {
      return await verifyAccessPasswordOnce(
        password,
        ACCESS_VERIFY_TIMEOUTS[
          attempt
        ]
      );

    } catch (error) {
      lastError = error;

      console.warn(
        `登入驗證第 ${attempt + 1} 次失敗`,
        error
      );

      if (
        attempt <
        ACCESS_VERIFY_TIMEOUTS.length -
        1
      ) {
        await wait(600);
      }
    }
  }

  const timedOut =
    lastError &&
    lastError.name === "AbortError";

  return {
    success: false,
    role: "public",
    message: timedOut
      ? "驗證逾時，Google Apps Script 暫時回應較慢，請稍後再試。"
      : "暫時無法連線驗證，請稍後再試。"
  };
}

async function saveReportToSheet(
  report
) {
  try {
    const res = await fetch(
      CONFIG.API_URL,
      {
        method: "POST",
        body: JSON.stringify({
          action: "save",
          adminPassword,
          report
        })
      }
    );

    const data = await res.json();

    if (!data.success) {
      alert(
        data.message ||
        "儲存失敗"
      );

      return false;
    }

    return true;

  } catch (error) {
    console.error(error);

    alert(
      "儲存失敗，請確認 Apps Script 已部署為 Web App，且存取權限為任何人。"
    );

    return false;
  }
}

async function deleteReportFromSheet(
  id
) {
  try {
    const res = await fetch(
      CONFIG.API_URL,
      {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          adminPassword,
          id
        })
      }
    );

    const data = await res.json();

    if (!data.success) {
      alert(
        data.message ||
        "刪除失敗"
      );

      return false;
    }

    return true;

  } catch (error) {
    console.error(error);

    alert(
      "刪除失敗，請確認 Apps Script 已部署為 Web App，且存取權限為任何人。"
    );

    return false;
  }
}

async function updateSiteUrlOnServer(
  siteUrl
) {
  
  if (
    !adminPassword ||
    !siteUrl
  ) {
    return false;
  }

  try {
    const res = await fetch(
      CONFIG.API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action: "updateSiteUrl",
          adminPassword,
          siteUrl
        })
      }
    );

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status}`
      );
    }

    const data =
      await res.json();

    if (!data.success) {
      console.warn(
        "網站網址同步失敗：",
        data.message
      );

      return false;
    }

    console.debug(
      "網站網址已同步：",
      data.siteUrl
    );

    return true;

  } catch (error) {
    console.warn(
      "網站網址同步失敗：",
      error
    );

    return false;
  }
}
