(function () {
  "use strict";
  if (window.BlueEyeNative) return;
  document.documentElement.classList.add("web-app");
  const byId = (id) => document.getElementById(id);
  const temporaryUrls = new Set();
  let pendingExport = null;
  let registration = null;
  let beforeUpdate = null;
  let reloadForUpdate = false;
  let applyingUpdate = false;
  let registrationStarted = false;
  let updateCheckPending = false;
  let lastUpdateCheck = 0;
  const abortError = () => new DOMException("已取消导出", "AbortError");

  function releaseUrl(url) {
    if (temporaryUrls.delete(url)) URL.revokeObjectURL(url);
  }

  function finishExport(job, error, method) {
    if (pendingExport !== job) return;
    pendingExport = null;
    byId("web-save-dialog").close();
    byId("web-save-filename").textContent = "";
    byId("web-save-open").removeAttribute("href");
    if (error) releaseUrl(job.url);
    else window.setTimeout(() => releaseUrl(job.url), 60000);
    if (error) job.reject(error);
    else job.resolve({ method });
  }

  function validExport(job) {
    if (pendingExport !== job) return false;
    if (job.stillValid()) return true;
    finishExport(job, abortError());
    return false;
  }

  function saveBlob(blob, filename, stillValid = () => true) {
    if (!stillValid()) return Promise.reject(abortError());
    if (pendingExport) return Promise.reject(new Error("请先完成或关闭当前文件保存"));
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      temporaryUrls.add(url);
      const file = new File([blob], filename, { type: blob.type });
      const job = { file, filename, url, stillValid, resolve, reject };
      pendingExport = job;
      byId("web-save-filename").textContent = filename;
      byId("web-save-open").href = url;
      let shareable = false;
      try { shareable = Boolean(navigator.share && navigator.canShare?.({ files: [file] })); } catch { /* Download remains available. */ }
      byId("web-save-share").hidden = !shareable;
      byId("web-save-share").disabled = false;
      byId("web-save-status").textContent = blob.type.startsWith("image/")
        ? "可通过系统分享保存图片，或打开图片后长按保存。"
        : "请选择下载，或在系统分享中保存到“文件”。";
      byId("web-save-dialog").showModal();
    });
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch { /* Try the selectable fallback below. */ }
    const active = document.activeElement;
    const area = document.createElement("textarea");
    area.value = value;
    area.readOnly = true;
    area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:.01;font-size:16px";
    // The field must be inside the active modal to receive focus.
    const dialogs = document.querySelectorAll("dialog[open]");
    (dialogs[dialogs.length - 1] || document.body).append(area);
    let copied = false;
    try {
      area.focus({ preventScroll: true });
      area.select();
      area.setSelectionRange(0, area.value.length);
      copied = document.execCommand?.("copy") === true;
    } catch { /* Offer manual selection if automatic copying is blocked. */ }
    area.value = "";
    area.remove();
    active?.focus?.({ preventScroll: true });
    if (copied) return true;
    const input = byId("web-copy-value");
    input.value = value;
    byId("web-copy-dialog").showModal();
    input.focus({ preventScroll: true });
    input.select();
    input.setSelectionRange(0, input.value.length);
    return false;
  }

  function openInstallHelp(prompt) {
    const standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/.test(navigator.userAgent);
    const steps = byId("web-install-steps");
    steps.replaceChildren();
    const texts = standalone ? ["已经从桌面打开蓝瞳，可以直接使用。"] : ios
      ? ["使用 Safari 打开当前蓝瞳网址。", "点 Safari 的分享按钮，找到“添加到主屏幕”。", "如有“作为网页 App 打开”，保持开启，再点“添加”。"]
      : android
        ? ["用 Chrome 打开蓝瞳网址。", "点右上角菜单，选择“安装应用”或“添加到主屏幕”。", "添加后从桌面的蓝瞳图标打开。"]
        : ["在浏览器菜单中选择“安装应用”或“添加到主屏幕”。", "确认添加后，从桌面的蓝瞳图标打开。"];
    texts.forEach((text) => { const li = document.createElement("li"); li.textContent = text; steps.append(li); });
    byId("web-install-description").textContent = standalone ? "你的桌面入口已经准备好啦。" : "把蓝瞳放到桌面，下次不用再找网址。";
    byId("web-install-status").textContent = "首次联网打开并准备好离线资源后，可离线取用本机资料和手册。";
    const button = byId("web-install-now");
    button.hidden = !prompt || standalone;
    button.disabled = false;
    button.onclick = async () => {
      button.disabled = true;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        byId("web-install-status").textContent = choice.outcome === "accepted" ? "已确认添加，请从桌面图标打开。" : "暂时没添加，之后仍可从设置打开这份说明。";
        button.hidden = true;
      } catch { byId("web-install-status").textContent = "请按上面的步骤，从浏览器菜单手动添加。"; }
      finally { button.disabled = false; }
    };
    byId("web-install-dialog").showModal();
  }

  function showWaitingUpdate() {
    const waiting = Boolean(registration?.waiting);
    document.querySelectorAll("[data-web-update]").forEach((button) => { button.hidden = !waiting; });
    if (waiting) byId("web-offline-state").textContent = "新版已准备好。保存正在编辑的内容后，即可更新蓝瞳。";
    return waiting;
  }

  async function checkForUpdate(manual = false) {
    if (!registration || updateCheckPending || showWaitingUpdate()) return;
    const status = byId("web-offline-state");
    if (navigator.onLine === false) {
      if (manual) status.textContent = "连上网络后就可以检查新版。";
      return;
    }
    if (!manual && Date.now() - lastUpdateCheck < 60000) return;
    const button = byId("web-check-update-button");
    lastUpdateCheck = Date.now();
    updateCheckPending = true;
    button.disabled = true;
    if (manual) status.textContent = "正在检查更新…";
    try {
      await registration.update();
      if (!showWaitingUpdate() && manual) status.textContent = registration.installing
        ? "正在下载新版。资料仍可正常使用。"
        : "已是最新版。";
    } catch {
      if (manual) status.textContent = "暂时无法检查更新。请稍后重试。";
    } finally {
      updateCheckPending = false;
      button.disabled = false;
    }
  }

  async function registerOffline(options = {}) {
    if (options.beforeUpdate) beforeUpdate = options.beforeUpdate;
    if (registrationStarted) return;
    registrationStarted = true;
    beforeUpdate = beforeUpdate || (async () => {
      if (!window.askConfirm || !window.lockVault) return false;
      if (!await window.askConfirm({ title: "更新蓝瞳网页版？", message: "请先保存正在编辑的表单。当前记录会保存后重新载入，随后重新解锁密钥簿。", acceptLabel: "保存并更新" })) return false;
      await window.lockVault(false);
      return true;
    });
    if (!navigator.serviceWorker || !window.isSecureContext) {
      byId("web-offline-state").textContent = "当前浏览器未提供离线缓存，联网时可正常使用。";
      return;
    }
    try {
      registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      byId("web-check-update-button").hidden = false;
      lastUpdateCheck = Date.now();
      showWaitingUpdate();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") window.setTimeout(showWaitingUpdate, 0);
          if (worker.state === "redundant" && !showWaitingUpdate()) {
            byId("web-offline-state").textContent = "新版未下载完成。可稍后重新检查。";
          }
        });
      });
      navigator.serviceWorker.ready.then(() => {
        if (!registration.waiting) byId("web-offline-state").textContent = "离线资源已准备好 · 本机密钥簿和手册可离线使用。";
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadForUpdate) window.location.reload();
      });
    } catch {
      byId("web-offline-state").textContent = "离线资源暂未准备好，当前仍可联网使用。下次打开会再试。";
    }
  }

  async function applyWaitingUpdate() {
    if (applyingUpdate || reloadForUpdate || !registration?.waiting) return;
    applyingUpdate = true;
    try {
      if (!await beforeUpdate()) return;
      const waiting = registration.waiting;
      if (!waiting) return;
      reloadForUpdate = true;
      waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {
      reloadForUpdate = false;
      byId("web-offline-state").textContent = "暂时无法更新，请重试。";
    } finally {
      applyingUpdate = false;
    }
  }

  function clearPrivateState() {
    if (pendingExport) finishExport(pendingExport, abortError());
    byId("web-copy-value").value = "";
    if (byId("web-copy-dialog").open) byId("web-copy-dialog").close();
    for (const url of Array.from(temporaryUrls)) releaseUrl(url);
  }

  window.BlueEyeWeb = { saveBlob, copyText, openInstallHelp, registerOffline, clearPrivateState };
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-web-only]").forEach((el) => { el.hidden = false; });
    document.querySelectorAll("[data-web-install]").forEach((button) => button.addEventListener("click", () => window.installApp()));
    document.querySelectorAll("[data-web-close]").forEach((button) => button.addEventListener("click", () => byId(button.dataset.webClose).close()));
    const version = document.querySelector(".app-version");
    if (version?.dataset.version) version.textContent = `蓝瞳密钥簿 ${version.dataset.version} · 线上版 · 竹笋`;
    const updateNetwork = () => { byId("web-offline-banner").hidden = navigator.onLine !== false; };
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    byId("web-copy-dialog").addEventListener("close", () => { if (!byId("web-copy-dialog").open) byId("web-copy-value").value = ""; });
    byId("web-save-dialog").addEventListener("close", () => { if (pendingExport && !byId("web-save-dialog").open) finishExport(pendingExport, abortError()); });
    byId("web-save-download").addEventListener("click", () => {
      const job = pendingExport;
      if (!job || !validExport(job)) return;
      const anchor = document.createElement("a");
      anchor.href = job.url; anchor.download = job.filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
      finishExport(job, null, "download");
    });
    byId("web-save-open").addEventListener("click", (event) => {
      const job = pendingExport;
      if (!job || !validExport(job)) { event.preventDefault(); return; }
      window.setTimeout(() => finishExport(job, null, "open"), 0);
    });
    byId("web-save-share").addEventListener("click", async () => {
      const job = pendingExport;
      if (!job || !validExport(job)) return;
      const button = byId("web-save-share"); button.disabled = true;
      try {
        await navigator.share({ files: [job.file] });
        if (validExport(job)) finishExport(job, null, "share");
      } catch (error) {
        if (pendingExport === job) byId("web-save-status").textContent = error.name === "AbortError"
          ? "已取消系统分享，可重新选择保存方式。"
          : "系统分享暂不可用，请选择下载或打开文件。";
      } finally { button.disabled = false; }
    });
    document.querySelectorAll("[data-web-update]").forEach((button) => button.addEventListener("click", applyWaitingUpdate));
    byId("web-check-update-button").addEventListener("click", () => checkForUpdate(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    window.addEventListener("online", () => checkForUpdate());
    registerOffline();
  });
})();
