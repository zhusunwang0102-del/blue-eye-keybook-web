"use strict";

const APP_ID = "blue-eye-keybook";
const APP_NAME = "蓝瞳密钥簿";
const DB_NAME = "blue-eye-keybook-db";
const DB_STORE = "vault";
const DB_KEY = "encrypted-vault";
const THEME_PREFERENCE_KEY = "blue-eye-keybook-theme";
const FORMAT_VERSION = 1;
const KDF_ITERATIONS = 310000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const $ = (id) => document.getElementById(id);

const dom = {
  lockScreen: $("lock-screen"),
  vaultApp: $("vault-app"),
  unlockForm: $("unlock-form"),
  unlockPassword: $("unlock-password"),
  unlockError: $("unlock-error"),
  biometricUnlockArea: $("biometric-unlock-area"),
  biometricUnlockButton: $("biometric-unlock-button"),
  setupForm: $("setup-form"),
  setupPassword: $("setup-password"),
  setupPasswordConfirm: $("setup-password-confirm"),
  setupError: $("setup-error"),
  setupImportButton: $("setup-import-button"),
  lockedImportButton: $("locked-import-button"),
  searchInput: $("search-input"),
  groupFilters: $("group-filters"),
  filterStrip: document.querySelector(".filter-strip"),
  listMeta: document.querySelector(".list-meta"),
  entryList: $("entry-list"),
  homePage: $("home-page"),
  overviewPage: $("overview-page"),
  overviewButton: $("overview-button"),
  overviewRows: $("overview-rows"),
  overviewTotals: $("overview-totals"),
  overviewModeAccount: $("overview-mode-account"),
  overviewModeToken: $("overview-mode-token"),
  overviewModeSpent: $("overview-mode-spent"),
  overviewSort: $("overview-sort"),
  overviewUnit: $("overview-unit"),
  overviewStatus: $("overview-status"),
  overviewGroup: $("overview-group"),
  overviewSearch: $("overview-search"),
  overviewRefresh: $("overview-refresh"),
  overviewEnableAll: $("overview-enable-all"),
  bulkQueryDialog: $("bulk-query-dialog"),
  bulkQueryRefresh: $("bulk-query-refresh"),
  bulkQueryAccept: $("bulk-query-accept"),
  entryCount: $("entry-count"),
  saveStatus: $("save-status"),
  emptyState: $("empty-state"),
  emptyTitle: $("empty-title"),
  emptyCopy: $("empty-copy"),
  emptyActions: document.querySelector(".empty-actions"),
  siteDetailDialog: $("site-detail-dialog"),
  siteDetailInitial: $("site-detail-initial"),
  siteDetailKicker: $("site-detail-kicker"),
  siteDetailTitle: $("site-detail-title"),
  siteDetailBody: $("site-detail-body"),
  siteDetailMoveUp: $("site-detail-move-up"),
  siteDetailMoveDown: $("site-detail-move-down"),
  siteDetailDelete: $("site-detail-delete"),
  siteDetailPin: $("site-detail-pin"),
  siteDetailPinLabel: $("site-detail-pin-label"),
  siteDetailEdit: $("site-detail-edit"),
  editorDialog: $("editor-dialog"),
  editorForm: $("editor-form"),
  editorKicker: $("editor-kicker"),
  editorTitle: $("editor-title"),
  editorError: $("editor-error"),
  smartResultNote: $("smart-result-note"),
  siteNameInput: $("site-name-input"),
  siteGroupInput: $("site-group-input"),
  websiteUrlInput: $("website-url-input"),
  baseUrlEditorList: $("base-url-editor-list"),
  sitePinnedInput: $("site-pinned-input"),
  tokenEditorList: $("token-editor-list"),
  groupOptions: $("group-options"),
  smartDialog: $("smart-dialog"),
  smartForm: $("smart-form"),
  smartInput: $("smart-input"),
  smartError: $("smart-error"),
  settingsDialog: $("settings-dialog"),
  themeSelect: $("theme-select"),
  autoLockSelect: $("auto-lock-select"),
  groupManager: $("group-manager"),
  newGroupInput: $("new-group-input"),
  backupStatus: $("backup-status"),
  settingsSiteCount: $("settings-site-count"),
  settingsTokenCount: $("settings-token-count"),
  changePasswordDialog: $("change-password-dialog"),
  changePasswordForm: $("change-password-form"),
  currentPasswordInput: $("current-password-input"),
  newPasswordInput: $("new-password-input"),
  newPasswordConfirmInput: $("new-password-confirm-input"),
  changePasswordError: $("change-password-error"),
  biometricSettingsButton: $("biometric-settings-button"),
  biometricSettingsTitle: $("biometric-settings-title"),
  biometricSettingsStatus: $("biometric-settings-status"),
  customBackupDialog: $("custom-backup-dialog"),
  customBackupForm: $("custom-backup-form"),
  customBackupPassword: $("custom-backup-password"),
  customBackupConfirm: $("custom-backup-confirm"),
  customBackupError: $("custom-backup-error"),
  importDialog: $("import-dialog"),
  importForm: $("import-form"),
  importPasswordInput: $("import-password-input"),
  importBiometricButton: $("import-biometric-button"),
  importError: $("import-error"),
  importFileInput: $("import-file-input"),
  confirmDialog: $("confirm-dialog"),
  confirmTitle: $("confirm-title"),
  confirmMessage: $("confirm-message"),
  confirmCancel: $("confirm-cancel"),
  confirmAccept: $("confirm-accept"),
  balanceDialog: $("balance-dialog"),
  balanceForm: $("balance-form"),
  balanceTitle: $("balance-dialog-title"),
  balanceEnabled: $("balance-enabled-input"),
  balanceOrigin: $("balance-origin-input"),
  balanceMode: $("balance-mode-input"),
  balanceUserId: $("balance-user-id-input"),
  balanceCredential: $("balance-credential-input"),
  balanceUnit: $("balance-unit-input"),
  balanceDivisor: $("balance-divisor-input"),
  balanceHome: $("balance-home-input"),
  balanceError: $("balance-error"),
  activityDialog: $("activity-dialog"),
  activityTitle: $("activity-title"),
  activityForm: $("activity-form"),
  activityRows: $("activity-rows"),
  activityStatus: $("activity-status"),
  activityEnable: $("activity-enable"),
  activityQueryButton: $("activity-query-button"),
  activityRange: $("activity-range"),
  activityStart: $("activity-start"),
  activityEnd: $("activity-end"),
  activityType: $("activity-type"),
  activityModel: $("activity-model"),
  activityToken: $("activity-token"),
  balanceAutoRefresh: $("balance-auto-refresh-input"),
  refreshBalancesButton: $("refresh-balances-button"),
  arrangeButton: $("arrange-sites-button"),
  arrangeHint: $("arrange-hint"),
  toastRegion: $("toast-region")
};

const state = {
  db: null,
  envelope: null,
  key: null,
  keyBytes: null,
  data: null,
  selectedGroup: "all",
  query: "",
  revealedTokens: new Set(),
  viewingSiteId: null,
  editingSiteId: null,
  smartDraft: false,
  pendingImport: null,
  biometricImport: null,
  customBackupRun: 0,
  saveTimer: null,
  saveChain: Promise.resolve(),
  autoLockTimer: null,
  installPrompt: null,
  biometricPromptPending: false,
  balanceEditingSiteId: null,
  activitySiteId: null,
  activityTab: "logs",
  activityQuery: null,
  activityDirty: false,
  activityBusy: false,
  activityGeneration: 0,
  activityError: "",
  activityStatError: "",
  activitySummaryError: "",
  balanceRequests: new Map(),
  balanceBusySiteIds: new Set(),
  balanceEpoch: 0,
  balanceBatchBusy: false,
  mainView: "sites",
  pageScroll: {sites:0, overview:0},
  overviewMode: "account",
  overviewQuery: "",
  overviewGroup: "all",
  arranging: false,
  drag: null,
  dragCandidate: null,
  suppressTileClickUntil: 0,
  webMcpLifecycle: null
};

function uid(prefix = "id") {
  if (crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createIcon(name, className = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  if (className) svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

function makeElement(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.title) node.title = options.title;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value !== null && value !== undefined) node.setAttribute(key, String(value));
    });
  }
  const normalized = Array.isArray(children) ? children : [children];
  normalized.filter(Boolean).forEach((child) => node.append(child));
  return node;
}

function makeIconButton(iconName, label, className = "mini-icon-button") {
  return makeElement(
    "button",
    {
      className,
      type: "button",
      title: label,
      attrs: { "aria-label": label }
    },
    createIcon(iconName)
  );
}

function showToast(message, type = "success", timeout = 2200) {
  const toast = makeElement("div", {
    className: `toast${type === "error" ? " is-error" : ""}`,
    text: message
  });
  dom.toastRegion.append(toast);
  window.setTimeout(() => {
    toast
      .animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(6px)" }
        ],
        { duration: 160, easing: "ease-in", fill: "forwards" }
      )
      .finished.finally(() => toast.remove());
  }, timeout);
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) {
        request.result.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function databaseGet(key) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(DB_STORE, "readonly");
    const request = transaction.objectStore(DB_STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

function databasePut(key, value) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function importVaultKey(keyBytes) {
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function deriveKeyMaterial(password, salt, iterations = KDF_ITERATIONS) {
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    material,
    256
  );
  const keyBytes = new Uint8Array(derived);
  const key = await importVaultKey(keyBytes);
  return { key, keyBytes };
}

async function deriveKey(password, salt, iterations = KDF_ITERATIONS) {
  const result = await deriveKeyMaterial(password, salt, iterations);
  result.keyBytes.fill(0);
  return result.key;
}

async function encryptEnvelope(data, key, salt, iterations = KDF_ITERATIONS) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: textEncoder.encode(APP_ID),
      tagLength: 128
    },
    key,
    plaintext
  );
  return {
    appId: APP_ID,
    appName: APP_NAME,
    format: FORMAT_VERSION,
    updatedAt: nowIso(),
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt: bytesToBase64(salt)
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    }
  };
}

function isValidEnvelope(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.appId === APP_ID &&
      value.format === FORMAT_VERSION &&
      value.kdf?.name === "PBKDF2" &&
      value.kdf?.hash === "SHA-256" &&
      Number.isInteger(value.kdf?.iterations) &&
      value.kdf.iterations >= 100000 &&
      typeof value.kdf?.salt === "string" &&
      value.cipher?.name === "AES-GCM" &&
      typeof value.cipher?.iv === "string" &&
      typeof value.cipher?.data === "string"
  );
}

async function decryptEnvelope(envelope, password) {
  if (!isValidEnvelope(envelope)) throw new Error("INVALID_BACKUP");
  const salt = base64ToBytes(envelope.kdf.salt);
  const { key, keyBytes } = await deriveKeyMaterial(password, salt, envelope.kdf.iterations);
  try {
    const data = await decryptEnvelopeWithKey(envelope, key);
    return { key, keyBytes, data };
  } catch (error) {
    keyBytes.fill(0);
    throw error;
  }
}

async function decryptEnvelopeWithKey(envelope, key) {
  if (!isValidEnvelope(envelope)) throw new Error("INVALID_BACKUP");
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(envelope.cipher.iv),
      additionalData: textEncoder.encode(APP_ID),
      tagLength: 128
    },
    key,
    base64ToBytes(envelope.cipher.data)
  );
  const parsed = JSON.parse(textDecoder.decode(decrypted));
  return normalizeData(parsed);
}

function defaultData() {
  return {
    version: 3,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sites: [],
    groups: [],
    settings: {
      theme: "system",
      autoLockMinutes: 15,
      balanceAutoRefresh: false,
      overviewSort: "balance-asc",
      balanceThresholds: {USD: 0, CNY: 0, points: 0, credits: 0},
      lastBackupAt: null
    }
  };
}

function normalizeData(raw) {
  if (!raw || typeof raw !== "object") throw new Error("INVALID_DATA");
  const result = {
    version: 3,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
    sites: Array.isArray(raw.sites) ? raw.sites : [],
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    settings: {
      theme: ["system", "light", "dark", "cream"].includes(raw.settings?.theme) ? raw.settings.theme : "system",
      autoLockMinutes: [0, 5, 15, 30, 60].includes(Number(raw.settings?.autoLockMinutes))
        ? Number(raw.settings.autoLockMinutes)
        : 15,
      lastBackupAt: typeof raw.settings?.lastBackupAt === "string" ? raw.settings.lastBackupAt : null,
      balanceAutoRefresh: raw.settings?.balanceAutoRefresh === true,
      overviewSort: ["balance-asc", "balance-desc", "name", "updated"].includes(raw.settings?.overviewSort) ? raw.settings.overviewSort : "balance-asc",
      balanceThresholds: Object.fromEntries(["USD", "CNY", "points", "credits"].map((unit) => {
        const value = Number(raw.settings?.balanceThresholds?.[unit]);
        return [unit, Number.isFinite(value) && value >= 0 && value <= 1e12 ? value : 0];
      }))
    }
  };

  result.groups = result.groups
    .filter((group) => group && typeof group.name === "string" && group.name.trim())
    .map((group, index) => ({
      id: typeof group.id === "string" ? group.id : uid("group"),
      name: group.name.trim().slice(0, 30),
      order: Number.isFinite(group.order) ? group.order : index
    }));

  const validGroupIds = new Set(result.groups.map((group) => group.id));
  result.sites = result.sites
    .filter((site) => site && typeof site === "object")
    .map((site, index) => {
      const baseUrlSource = Array.isArray(site.baseUrls)
        ? site.baseUrls
        : typeof site.baseUrl === "string" && site.baseUrl.trim()
          ? [{ value: site.baseUrl, name: "" }]
          : [];
      const baseUrls = baseUrlSource
        .filter((baseUrl) => baseUrl && typeof baseUrl.value === "string" && baseUrl.value.trim())
        .map((baseUrl, baseUrlIndex) => ({
          id: typeof baseUrl.id === "string" ? baseUrl.id : uid("base"),
          name:
            typeof baseUrl.name === "string" && baseUrl.name.trim()
              ? baseUrl.name.trim().slice(0, 50)
              : defaultBaseUrlName(baseUrlIndex),
          value: baseUrl.value.trim(),
          createdAt: typeof baseUrl.createdAt === "string" ? baseUrl.createdAt : nowIso(),
          updatedAt: typeof baseUrl.updatedAt === "string" ? baseUrl.updatedAt : nowIso()
        }));
      const tokens = Array.isArray(site.tokens)
        ? site.tokens
            .filter((token) => token && typeof token.value === "string" && token.value.trim())
            .map((token, tokenIndex) => ({
              id: typeof token.id === "string" ? token.id : uid("token"),
              name:
                typeof token.name === "string" && token.name.trim()
                  ? token.name.trim().slice(0, 50)
                  : defaultTokenName(tokenIndex),
              value: token.value.trim(),
              createdAt: typeof token.createdAt === "string" ? token.createdAt : nowIso(),
              updatedAt: typeof token.updatedAt === "string" ? token.updatedAt : nowIso()
            }))
        : [];
      return {
        id: typeof site.id === "string" ? site.id : uid("site"),
        name:
          typeof site.name === "string" && site.name.trim()
            ? site.name.trim().slice(0, 60)
            : defaultSiteName(index),
        websiteUrl: typeof site.websiteUrl === "string" ? site.websiteUrl.trim() : "",
        baseUrl: baseUrls[0]?.value || "",
        baseUrls,
        groupId: validGroupIds.has(site.groupId) ? site.groupId : null,
        pinned: Boolean(site.pinned),
        tags: normalizeSiteTags(site.tags),
        note: normalizeSiteNote(site.note),
        order: Number.isFinite(site.order) ? site.order : index,
        createdAt: typeof site.createdAt === "string" ? site.createdAt : nowIso(),
        updatedAt: typeof site.updatedAt === "string" ? site.updatedAt : nowIso(),
        balance: normalizeBalance(site.balance?.mode === "token" ? null : site.balance),
        tokenBalance: normalizeBalance({...((site.tokenBalance && typeof site.tokenBalance === "object")
          ? site.tokenBalance : site.balance?.mode === "token" ? site.balance : {}), mode: "token"}),
        activity: normalizeSiteActivity(site.activity, normalizeBalance(site.balance?.mode === "token" ? null : site.balance), tokens.map((token) => token.value)),
        ...(window.BlueEyeModelStatus ? { modelStatus: window.BlueEyeModelStatus.normalizeSettings(
          site.modelStatus, window.BlueEyeModelStatus.getSources({ websiteUrl: site.websiteUrl, baseUrls, tokens })
        ) } : {}),
        tokens
      };
    })
    .filter((site) => (site.websiteUrl || site.baseUrls.length) && site.tokens.length);

  result.reviewDraft = normalizeReviewDraft(raw.reviewDraft,result.sites);
  return result;
}

function defaultSiteName(index) {
  return `未命名站点 ${String(index + 1).padStart(2, "0")}`;
}

function defaultTokenName(index) {
  return `令牌 ${String(index + 1).padStart(2, "0")}`;
}

function defaultBaseUrlName(index) {
  return `地址 ${String(index + 1).padStart(2, "0")}`;
}

function getBaseUrls(site) {
  if (Array.isArray(site?.baseUrls)) return site.baseUrls;
  if (site?.baseUrl) return [{ id: "legacy-base", name: defaultBaseUrlName(0), value: site.baseUrl }];
  return [];
}

function getPrimaryBaseUrl(site) {
  return getBaseUrls(site)[0]?.value || "";
}

function validBalanceQuota(value) {
  const text = String(value ?? "");
  return /^-?\d+(?:\.\d+)?$/.test(text) && text.length <= 32
    && Number.isFinite(Number(text)) && Math.abs(Number(text)) <= Number.MAX_SAFE_INTEGER;
}

function normalizeBalance(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const origin = normalizeBalanceOrigin(source.origin);
  const mode = source.mode === "token" ? "token" : "account";
  const userId = typeof source.userId === "string" ? source.userId.slice(0, 16) : "";
  const credential = typeof source.credential === "string" ? source.credential.slice(0, 4096) : "";
  const unit = ["points", "USD", "CNY", "credits"].includes(source.unit) ? source.unit : "points";
  const divisor = Number(source.divisor) >= 0.000001 && Number(source.divisor) <= 1e12
    && Number.isFinite(Number(source.divisor)) ? Number(source.divisor) : 1;
  const cached = source.cache;
  const cache = cached && validBalanceQuota(cached.rawQuota)
    && cached.mode === mode && cached.origin === origin && Number.isFinite(Date.parse(cached.checkedAt))
    ? { rawQuota: String(cached.rawQuota), unlimited: mode === "token" && cached.unlimited === true,
        mode, origin, checkedAt: cached.checkedAt,
        usedQuota:mode === "account" ? historyNumber(cached.usedQuota) : null,
        requestCount:mode === "account" ? historyNumber(cached.requestCount,true) : null }
    : null;
  return {
    enabled: source.enabled === true && Boolean(origin) && Boolean(credential),
    origin, mode, userId, credential, unit, divisor, showOnHome: source.showOnHome === true,
    cache,
    lastError: typeof source.lastError === "string" && BALANCE_ERROR_MESSAGES[source.lastError] ? source.lastError : "",
    lastAttemptAt: Number.isFinite(Date.parse(source.lastAttemptAt)) ? source.lastAttemptAt : null
  };
}

const BALANCE_ERROR_MESSAGES = {
  auth: "认证未通过，请检查凭证、用户 ID 或站点访问限制",
  unsupported: "本站未开放这一接口，或接口版本不同",
  rate_limit: "查询太频繁，请稍后重试",
  redirect: "站点要求跳转，已停止查询以保护凭证",
  http: "站点暂时无法查询，请稍后重试",
  timeout: "查询超时，请稍后重试",
  network: "连接失败，请检查网络或站点状态",
  configuration: "查询配置无效；请核对凭证，并使用公网 HTTPS 地址",
  response: "站点返回格式不兼容，未更新余额",
  api: "站点拒绝查询，请检查凭证或接口是否开放",
  cancelled: "查询已取消",
  browser: "浏览器未能读取此站，请检查网络，或请站方允许蓝瞳网页跨域查询",
  native: "当前设备暂不支持余额查询"
};

function supportsBalanceQuery() {
  return typeof window.BlueEyeNative?.requestBalance === "function"
    || (typeof window.fetch === "function" && typeof window.AbortController === "function");
}

function normalizeBalanceOrigin(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname;
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
      || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(host)
      || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(host)
      || url.pathname.length > 1024) return "";
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.some((part) => !/^[A-Za-z0-9_~.-]+$/.test(part) || part === "." || part === "..")) return "";
    return url.origin + (segments.length ? `/${segments.join("/")}` : "");
  } catch { return ""; }
}

function detectBalanceOrigin(site) {
  for (const value of [site.websiteUrl, ...getBaseUrls(site).map((item) => item.value)]) {
    try {
      const origin = new URL(value).origin;
      if (normalizeBalanceOrigin(origin)) return origin;
    } catch { /* Invalid saved endpoints never become query destinations. */ }
  }
  return "";
}

function formatBalanceValue(balance) {
  if (!balance.cache) return "尚未查询";
  if (balance.cache.unlimited) return "无限额度";
  const amount = Number(balance.cache.rawQuota) / (balance.unit === "points" ? 1 : balance.divisor);
  const money = balance.unit === "USD" || balance.unit === "CNY";
  const number = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: money ? 2 : 0,
    maximumFractionDigits: money ? 2 : balance.unit === "points" ? 4 : 6 }).format(amount);
  const prefix = balance.unit === "USD" ? "$" : balance.unit === "CNY" ? "¥" : "";
  const suffix = balance.unit === "points" ? " 点" : balance.unit === "credits" ? " 积分" : "";
  return `${prefix}${number}${suffix}`;
}

function balanceIsStale(balance) {
  return Boolean(balance.cache && (!balance.enabled || balance.lastError
    || Date.now() - Date.parse(balance.cache.checkedAt) > 5 * 60 * 1000));
}

function balanceSnapshotKey(balance) {
  return JSON.stringify([balance.origin, balance.mode, balance.userId, balance.credential]);
}

function updateBalanceForm() {
  const account = dom.balanceMode.value === "account";
  $("balance-user-id-field").hidden = !account;
  dom.balanceUserId.required = dom.balanceEnabled.checked && account;
  dom.balanceCredential.required = dom.balanceEnabled.checked;
  dom.balanceOrigin.required = dom.balanceEnabled.checked;
  $("balance-credential-label").textContent = account ? "用户级访问令牌" : "API 密钥（只查询这个令牌）";
  dom.balanceCredential.placeholder = account ? "不是登录密码，也不是普通聊天 API Key" : "sk-…；仅表示这个令牌的额度";
  $("balance-credential-help").textContent = account
    ? "请在站点个人设置查找“访问令牌 / Access Token”。它可能有较高账户权限，请优先使用站点提供的只读凭证，不要填写登录密码。若找不到，先不要开启。"
    : "可以粘贴本站某个 API 密钥。结果仅为该密钥的剩余额度，不会当作账户总余额。";
  $("balance-divisor-field").hidden = dom.balanceUnit.value === "points";
  dom.balanceDivisor.required = dom.balanceEnabled.checked && dom.balanceUnit.value !== "points";
}

function balanceProperty(mode) { return mode === "token" ? "tokenBalance" : "balance"; }
function balanceBusyKey(siteId, mode) { return `${siteId}:${mode}`; }

function fillBalanceForm(site, mode) {
  const config = normalizeBalance(site[balanceProperty(mode)]);
  const detectedOrigin = detectBalanceOrigin(site);
  dom.balanceTitle.textContent = `${site.name} · ${mode === "token" ? "令牌额度" : "账户余额"}`;
  dom.balanceEnabled.checked = config.enabled;
  dom.balanceOrigin.value = config.origin || detectedOrigin;
  dom.balanceMode.value = mode;
  dom.balanceUserId.value = config.userId;
  dom.balanceCredential.value = config.credential;
  dom.balanceUnit.value = config.unit;
  dom.balanceDivisor.value = config.unit === "points" ? "" : String(config.divisor);
  dom.balanceHome.checked = config.showOnHome;
  dom.balanceError.textContent = supportsBalanceQuery() ? "" : "当前浏览器无法查询，请更新浏览器后重试。";
  updateBalanceForm();
}

function openBalanceSettings(site, mode = "account") {
  if (!state.data) return;
  state.balanceEditingSiteId = site.id;
  fillBalanceForm(site, mode);
  setDialogCloseLabel(dom.balanceDialog, dom.activityDialog.open ? "返回用量与日志"
    : dom.siteDetailDialog.open ? "返回站点详情" : "关闭查询配置");
  dom.balanceDialog.showModal();
}

async function saveBalanceSettings(event) {
  event.preventDefault();
  const site = state.data?.sites.find((item) => item.id === state.balanceEditingSiteId);
  if (!site) return;
  dom.balanceError.textContent = "";
  try {
    const enabled = dom.balanceEnabled.checked;
    const origin = normalizeBalanceOrigin(dom.balanceOrigin.value);
    const mode = dom.balanceMode.value;
    const userId = dom.balanceUserId.value.trim();
    const credential = dom.balanceCredential.value.trim().replace(/^Bearer\s+/i, "");
    if (!origin && (enabled || dom.balanceOrigin.value.trim())) throw new Error("请填写公开站点的 HTTPS 地址，不要附带账号、查询参数或锚点");
    if (enabled && !/^[!-~]{8,4096}$/.test(credential)) throw new Error("请填写有效查询凭证，不要填登录密码");
    if (enabled && mode === "account" && !/^[1-9]\d{0,15}$/.test(userId)) throw new Error("账户查询需要站点个人资料中的数字用户 ID");
    const divisor = dom.balanceUnit.value === "points" ? 1 : Number(dom.balanceDivisor.value);
    if (!Number.isFinite(divisor) || divisor < 0.000001 || divisor > 1e12) throw new Error("请填写有效换算点数（0.000001～1000000000000）；不确定时选择额度点");
    const property = balanceProperty(mode);
    const before = normalizeBalance(site[property]);
    const next = normalizeBalance({enabled, origin, mode, userId, credential, divisor,
      unit: dom.balanceUnit.value, showOnHome: dom.balanceHome.checked});
    const sameDestination = balanceSnapshotKey(before) === balanceSnapshotKey(next);
    if (enabled && (!before.enabled || !sameDestination)) {
      const confirmed = await askConfirm({
        title: "允许手机向本站查询？",
        message: `仅向 ${origin} 发送你填写的查询凭证。${mode === "account" ? "用户级令牌可能拥有修改账户等权限；蓝瞳仅使用只读查询。" : "只查询令牌额度，不代表账户余额。"}不会经由我们的服务器。`,
        acceptLabel: "确认开启"
      });
      if (!confirmed || !state.data?.sites.includes(site)) return;
    }
    if (sameDestination) {
      next.cache = before.cache;
      next.lastError = before.lastError;
      next.lastAttemptAt = before.lastAttemptAt;
    }
    site[property] = next;
    if (mode === "account" && !sameDestination) site.activity = normalizeSiteActivity(null, next);
    site.updatedAt = nowIso();
    dom.balanceDialog.close();
    scheduleSave();
    renderAll();
    showToast(enabled ? "查询已开启，可点“刷新”获取余额" : "配置已保存，查询保持关闭");
  } catch (error) {
    dom.balanceError.textContent = error.message || "请检查余额查询配置";
  }
}

async function forgetBalanceSettings() {
  const site = state.data?.sites.find((item) => item.id === state.balanceEditingSiteId);
  if (!site) return;
  const mode = dom.balanceMode.value;
  const confirmed = await askConfirm({title: `清除${mode === "token" ? "令牌" : "账户"}查询配置？`, message: "仅清除当前类型的查询凭证和缓存，另一类查询、API 令牌与网址记录保留。旧备份中的内容不会被改写。", acceptLabel: "清除配置", danger: true});
  if (!confirmed || !state.data?.sites.includes(site)) return;
  site[balanceProperty(mode)] = normalizeBalance({mode});
  if (mode === "account") site.activity = normalizeSiteActivity(null, site.balance);
  dom.balanceDialog.close();
  scheduleSave();
  renderAll();
  showToast("查询凭证和缓存已清除");
}

function makeBalanceSection(site, mode = "account") {
  const balance = normalizeBalance(site[balanceProperty(mode)]);
  const busy = state.balanceBusySiteIds.has(balanceBusyKey(site.id, mode));
  const section = makeElement("section", { className: `balance-section balance-${mode}` });
  const heading = makeElement("div", { className: "balance-section-heading" }, [
    makeElement("h3", { text: balance.mode === "token" ? "令牌额度 · 非账户余额" : "账户余额" })
  ]);
  const actions = makeElement("div", { className: "balance-panel-actions" });
  const configure = makeElement("button", { type: "button", className: "balance-panel-button balance-configure", text: "配置" }, createIcon("settings"));
  configure.addEventListener("click", () => openBalanceSettings(site, mode));
  const refresh = makeIconButton("refresh", "刷新本站余额");
  refresh.disabled = !supportsBalanceQuery() || !balance.enabled || busy;
  refresh.addEventListener("click", () => refreshSiteBalance(site.id, false, mode));
  actions.append(configure);
  if (mode === "account") {
    const history = makeElement("button", {type:"button",className:"balance-panel-button balance-history",text:"用量与日志"},createIcon("log"));
    history.addEventListener("click", () => openSiteActivity(site.id));
    actions.prepend(history);
    if (window.BlueEyeModelStatus) {
      const statusEntry = makeElement("button", {type:"button",className:"balance-panel-button model-status-entry",text:"模型状态"},createIcon("pulse"));
      statusEntry.addEventListener("click", () => window.BlueEyeModelStatus.open(site, {
        save: scheduleSave, copy: (name) => copyText(name, "模型名已复制")
      }));
      actions.append(statusEntry);
    }
  }
  heading.append(refresh);
  const value = makeElement("strong", { className: "balance-value", text: formatBalanceValue(balance) });
  const status = busy ? "正在查询…"
    : balance.lastError ? `${BALANCE_ERROR_MESSAGES[balance.lastError]}${balance.cache ? "；下方是上次结果" : ""}`
    : !balance.enabled ? "查询未开启 · 点配置后可启用"
    : !supportsBalanceQuery() ? "当前浏览器无法查询，显示上次结果"
    : balance.cache ? "仅为最近查询结果，不代表实时余额" : "已配置，点刷新获取余额";
  section.append(heading, value, makeElement("p", { className: `balance-status${balance.lastError ? " is-error" : ""}`, text: status }));
  if (balance.cache) {
    section.append(makeElement("p", { className: "balance-updated", text: `${balanceIsStale(balance) ? "旧结果 · " : ""}更新于 ${formatDateTime(balance.cache.checkedAt)}` }));
  }
  section.append(actions);
  return section;
}

async function browserBalanceRequest(config) {
  const origin = normalizeBalanceOrigin(config.origin);
  const credential = String(config.credential || "").trim().replace(/^Bearer\s+/i, "").trim();
  const account = config.mode === "account";
  if (!origin || !["account", "token"].includes(config.mode)
    || !/^[!-~]{8,4096}$/.test(credential)
    || (account && !/^[1-9][0-9]{0,15}$/.test(String(config.userId)))) {
    return { ok: false, code: "configuration" };
  }
  const controller = new AbortController();
  const id = uid("web-balance");
  let timedOut = false;
  const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
  state.balanceRequests.set(id, { timer, resolve() { controller.abort(); } });
  const maxBytes = 128 * 1024;
  try {
    const headers = { Accept: "application/json", Authorization: `Bearer ${credential}` };
    if (account) headers["New-Api-User"] = config.userId;
    const path = account ? "/api/user/self" : "/api/usage/token/";
    const response = await fetch(origin + path, {
      method: "GET", headers, credentials: "omit", referrerPolicy: "no-referrer",
      redirect: "manual", mode: "cors", cache: "no-store", signal: controller.signal
    });
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      return { ok: false, code: "redirect" };
    }
    if (response.status === 401 || response.status === 403) return { ok: false, code: "auth" };
    if (response.status === 404 || response.status === 405) return { ok: false, code: "unsupported" };
    if (response.status === 429) return { ok: false, code: "rate_limit" };
    if (!response.ok) return { ok: false, code: "http" };
    if (Number(response.headers.get("content-length")) > maxBytes || !response.body) {
      return { ok: false, code: "response" };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0, text = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          controller.abort();
          return { ok: false, code: "response" };
        }
        text += decoder.decode(value, { stream: true });
      }
    } finally { reader.releaseLock(); }
    if (controller.signal.aborted) return { ok: false, code: timedOut ? "timeout" : "cancelled" };
    let body;
    try { body = JSON.parse(text + decoder.decode()); }
    catch { return { ok: false, code: "response" }; }
    if (body?.success !== true && body?.code !== true) return { ok: false, code: "api" };
    const data = body.data;
    const unlimited = !account && data?.unlimited_quota === true;
    const rawQuota = unlimited ? "0" : data?.[account ? "quota" : "total_available"];
    if (!["number", "string"].includes(typeof rawQuota) || !validBalanceQuota(rawQuota)) {
      return { ok: false, code: "response" };
    }
    return { ok: true, mode: config.mode, rawQuota: String(rawQuota), unlimited,
      usedQuota: account ? historyNumber(data.used_quota) : null,
      requestCount: account ? historyNumber(data.request_count, true) : null };
  } catch {
    return { ok: false, code: controller.signal.aborted ? (timedOut ? "timeout" : "cancelled") : "browser" };
  } finally {
    controller.abort();
    window.clearTimeout(timer);
    state.balanceRequests.delete(id);
  }
}

function requestBalance(config) {
  if (typeof window.BlueEyeNative?.requestBalance !== "function") return browserBalanceRequest(config);
  return new Promise((resolve) => {
    if (!supportsBalanceQuery()) return resolve({ok: false, code: "native"});
    const id = uid("balance");
    const timer = window.setTimeout(() => {
      state.balanceRequests.delete(id);
      resolve({ok: false, code: "timeout"});
    }, 30000);
    state.balanceRequests.set(id, {resolve, timer});
    try {
      window.BlueEyeNative.requestBalance(id, config.origin, config.mode, config.credential, config.userId);
    } catch {
      window.clearTimeout(timer);
      state.balanceRequests.delete(id);
      resolve({ok: false, code: "network"});
    }
  });
}

window.BlueEyeBalance = {
  onResult(id, encoded) {
    const request = state.balanceRequests.get(id);
    if (!request) return;
    window.clearTimeout(request.timer);
    state.balanceRequests.delete(id);
    try { request.resolve(JSON.parse(encoded)); }
    catch { request.resolve({ok: false, code: "response"}); }
  }
};

function cancelBalanceQueries() {
  if (dom.bulkQueryDialog.open) dom.bulkQueryDialog.close("cancel");
  state.activityGeneration += 1;
  state.activityBusy = false;
  state.balanceEpoch += 1;
  state.balanceRequests.forEach((request) => {
    window.clearTimeout(request.timer);
    request.resolve({ok: false, code: "cancelled"});
  });
  state.balanceRequests.clear();
  state.balanceBusySiteIds.clear();
  state.balanceBatchBusy = false;
  try { window.BlueEyeNative?.cancelBalanceRequests?.(); } catch { /* Already stopped. */ }
}

function parseBalanceResult(result, config) {
  if (!result || result.ok !== true || result.mode !== config.mode || !validBalanceQuota(result.rawQuota)) {
    throw new Error("response");
  }
  return {mode: config.mode, origin: config.origin, rawQuota: String(result.rawQuota),
    unlimited: config.mode === "token" && result.unlimited === true, checkedAt: nowIso(),
    usedQuota:config.mode === "account" ? historyNumber(result.usedQuota) : null,
    requestCount:config.mode === "account" ? historyNumber(result.requestCount,true) : null};
}

async function refreshSiteBalance(siteId, quiet = false, mode = "account") {
  const site = state.data?.sites.find((item) => item.id === siteId);
  const property = balanceProperty(mode);
  const busyKey = balanceBusyKey(siteId, mode);
  if (!site || !site[property]?.enabled || state.balanceBusySiteIds.has(busyKey)) return false;
  const config = normalizeBalance(site[property]);
  if (!supportsBalanceQuery()) {
    if (!quiet) showToast(BALANCE_ERROR_MESSAGES.native, "error");
    return false;
  }
  if (config.lastAttemptAt && Date.now() - Date.parse(config.lastAttemptAt) < 10000) {
    if (!quiet) showToast("刚刚查询过，稍等几秒再刷新");
    return false;
  }
  const epoch = state.balanceEpoch;
  const snapshot = balanceSnapshotKey(config);
  const configObject = site[property];
  state.balanceBusySiteIds.add(busyKey);
  refreshSiteViews();
  const result = await requestBalance(config);
  if (epoch !== state.balanceEpoch || !state.data?.sites.includes(site)) return false;
  state.balanceBusySiteIds.delete(busyKey);
  if (site[property] !== configObject || !site[property].enabled || balanceSnapshotKey(site[property]) !== snapshot) {
    refreshSiteViews();
    return false;
  }
  site[property].lastAttemptAt = nowIso();
  let ok = false;
  try {
    if (!result?.ok) throw new Error(result?.code || "response");
    site[property].cache = parseBalanceResult(result, config);
    site[property].lastError = "";
    ok = true;
    if (!quiet) showToast("余额已更新");
  } catch (error) {
    site[property].lastError = BALANCE_ERROR_MESSAGES[error.message] ? error.message : "response";
    if (!quiet) showToast(BALANCE_ERROR_MESSAGES[site[property].lastError], "error", 3600);
  }
  scheduleSave();
  refreshSiteViews();
  return ok;
}

async function refreshAllBalances(automatic = false, onlyMode = null, approvedQueries = null) {
  if (!state.data || state.balanceBatchBusy || !supportsBalanceQuery()) return;
  const approved = approvedQueries ? new Map(approvedQueries.map((item)=>[item.site.id,item])) : null;
  const matchesApproval = (site,mode) => {
    if (!approved) return true;
    const item=approved.get(site.id), config=site[balanceProperty(mode)];
    return item && item.site === site && item.object === config && balanceSnapshotKey(config) === item.snapshot;
  };
  const ids = state.data.sites.flatMap((site) => ["account", "token"].filter((mode) => {
    const balance = site[balanceProperty(mode)];
    return matchesApproval(site,mode) && (!onlyMode || mode === onlyMode) && balance?.enabled && (!automatic
      || !balance.lastAttemptAt || Date.now() - Date.parse(balance.lastAttemptAt) > 5 * 60 * 1000);
  }).map((mode) => ({id: site.id, mode})));
  if (!ids.length) {
    if (!automatic) showToast("还没有开启余额查询的站点");
    return;
  }
  const epoch = state.balanceEpoch;
  state.balanceBatchBusy = true;
  refreshSiteViews();
  let success = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < ids.length && state.data && epoch === state.balanceEpoch) {
      const item = ids[cursor++];
      const site=state.data.sites.find((entry)=>entry.id===item.id);
      if (!site || !matchesApproval(site,item.mode)) continue;
      if (await refreshSiteBalance(item.id, true, item.mode)) success += 1;
    }
  };
  await Promise.all([worker(), worker()]);
  if (epoch !== state.balanceEpoch || !state.data) return;
  state.balanceBatchBusy = false;
  refreshSiteViews();
  if (!automatic) showToast(`已更新 ${success}/${ids.length} 项查询，失败原因可在详情查看`, success ? "success" : "error", 3600);
}

function buildBulkQueryPlan(data, mode = "account") {
  const property = balanceProperty(mode), ready = [], skipped = [];
  for (const site of data.sites) {
    const config = normalizeBalance(site[property]);
    const reason = !config.origin ? "缺少有效查询地址"
      : !/^[!-~]{8,4096}$/.test(config.credential) ? "缺少有效查询凭证"
      : mode === "account" && !/^[1-9]\d{0,15}$/.test(config.userId) ? "缺少数字用户 ID" : "";
    if (reason) skipped.push({site, reason});
    else ready.push({site, object:site[property], snapshot:balanceSnapshotKey(config), enabled:config.enabled, origin:config.origin});
  }
  return {mode, ready, skipped, pending:ready.filter((item)=>!item.enabled)};
}

function bulkQueryPlanUnchanged(data, plan) {
  if (state.data !== data) return false;
  const current = buildBulkQueryPlan(data, plan.mode);
  return current.ready.length === plan.ready.length && current.skipped.length === plan.skipped.length
    && plan.ready.every((item,index)=>{
      const next=current.ready[index];
      return next.site === item.site && next.object === item.object && next.snapshot === item.snapshot && next.enabled === item.enabled;
    });
}

async function openBulkQueries(mode = "account") {
  if (!state.data || state.balanceBatchBusy || dom.bulkQueryDialog.open) return;
  mode = mode === "token" ? "token" : "account";
  const data=state.data, epoch=state.balanceEpoch, plan=buildBulkQueryPlan(data,mode);
  const kind=mode === "token" ? "令牌" : "账户";
  $("bulk-query-title").textContent=`全部开启${kind}查询`;
  $("bulk-query-summary").textContent=`全部 ${data.sites.length} 站：待开启 ${plan.pending.length} 站，已开启 ${plan.ready.length-plan.pending.length} 站，跳过 ${plan.skipped.length} 站。`;
  $("bulk-query-scope").textContent=`作用于所有站点，不受总览筛选限制。只处理${kind}查询；另一类查询和历史日志的开关保持原样。`;
  $("bulk-query-targets").replaceChildren(...plan.ready.map((item)=>makeElement("div",{className:"bulk-query-target"},[
    makeElement("strong",{text:item.site.name}),makeElement("span",{text:item.enabled?"已开启":"将开启"}),makeElement("small",{text:item.origin})
  ])));
  $("bulk-query-skipped").hidden=!plan.skipped.length;
  $("bulk-query-skipped").open=!plan.pending.length && Boolean(plan.skipped.length);
  $("bulk-query-skipped-label").textContent=`跳过 ${plan.skipped.length} 站 · 查看缺少的信息`;
  $("bulk-query-skipped-list").replaceChildren(...plan.skipped.map(({site,reason})=>makeElement("li",{text:`${site.name}：${reason}`})));
  dom.bulkQueryRefresh.checked=supportsBalanceQuery();
  dom.bulkQueryRefresh.disabled=!supportsBalanceQuery();
  dom.bulkQueryAccept.disabled=!plan.pending.length;
  dom.bulkQueryAccept.textContent=dom.bulkQueryRefresh.checked?"全部开启并刷新":"全部开启";
  $("bulk-query-note").textContent=!plan.pending.length?"没有可直接开启的配置。请先为跳过的站点补齐信息；已开启的站点可直接点总览的刷新。"
    : supportsBalanceQuery()?"此设备将直连上述每个站点，分别使用该站已保存的凭证。浏览器查询需要站点允许跨域读取。"
    : "此设备只保存开关。实际查询请在 Android 新版进行。";
  const result=await new Promise((resolve)=>{
    dom.bulkQueryDialog.addEventListener("close",()=>resolve({confirmed:dom.bulkQueryDialog.returnValue === "confirm",refresh:dom.bulkQueryRefresh.checked}),{once:true});
    dom.bulkQueryDialog.returnValue="";
    dom.bulkQueryDialog.showModal();
  });
  if (!result.confirmed || !plan.pending.length || epoch !== state.balanceEpoch || !bulkQueryPlanUnchanged(data,plan)) {
    if (result.confirmed && state.data === data && epoch === state.balanceEpoch) showToast("配置已变化，请重新核对后再开启","error");
    return;
  }
  for (const item of plan.pending) { item.object.enabled=true; item.site.updatedAt=nowIso(); }
  scheduleSave(); renderAll();
  if (result.refresh && supportsBalanceQuery()) await refreshAllBalances(false,mode,plan.ready);
  else showToast(`已开启 ${plan.pending.length} 站${kind}查询，跳过 ${plan.skipped.length} 站`);
}

function disableImportedBalanceQueries(data) {
  data.settings.balanceAutoRefresh = false;
  data.sites.forEach((site) => { site.balance.enabled = false; site.tokenBalance.enabled = false; if (site.activity) site.activity.enabled = false; });
  return data;
}

const BALANCE_UNIT_NAMES = {USD: "站点美元", CNY: "站点人民币", credits: "积分", points: "额度点"};
const OVERVIEW_STATUS = {empty: "额度用尽", low: "待补充", positive: "有余额", unlimited: "无限额度",
  unconfigured: "未配置", unqueried: "尚未查询", paused: "查询关闭", error: "查询失败", stale: "旧结果 · 待复查",
  reported:"历史消耗", zero:"暂未消耗", missing:"站点未提供"};

function spentOverviewBalance(site) {
  const account=normalizeBalance(site.balance);
  const candidates=[account.cache,site.activity?.origin===account.origin && site.activity?.userId===account.userId ? site.activity.summary : null]
    .filter((item)=>item && historyNumber(item.usedQuota)!==null && Number.isFinite(Date.parse(item.checkedAt)))
    .sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt));
  const source=candidates[0];
  const balance={...account,cache:source?{rawQuota:String(source.usedQuota),mode:"account",origin:account.origin,checkedAt:source.checkedAt,unlimited:false}:null};
  let status;
  if (!source) status=account.cache ? "missing" : account.enabled ? "unqueried" : account.origin ? "paused" : "unconfigured";
  else status=account.lastError ? "error" : balanceIsStale(balance) ? "stale" : Number(source.usedQuota)===0 ? "zero" : "reported";
  return {balance,status};
}

function balanceAmount(balance) {
  return balance.cache && !balance.cache.unlimited
    ? Number(balance.cache.rawQuota) / (balance.unit === "points" ? 1 : balance.divisor) : null;
}

function overviewBalanceStatus(balance, threshold = 0) {
  if (!balance.enabled) return balance.origin || balance.cache ? "paused" : "unconfigured";
  if (balance.lastError) return "error";
  if (!balance.cache) return "unqueried";
  if (balanceIsStale(balance)) return "stale";
  if (balance.cache.unlimited) return "unlimited";
  const amount = balanceAmount(balance);
  return amount <= 0 ? "empty" : amount <= threshold ? "low" : "positive";
}

function buildOverviewRows(data, options = {}) {
  const mode = ["token","spent"].includes(options.mode) ? options.mode : "account";
  const query = String(options.query || "").trim().toLocaleLowerCase();
  const groups = new Map(data.groups.map((group) => [group.id, group.name]));
  const units = ["USD", "CNY", "credits", "points"];
  const rows = data.sites.map((site) => {
    const spent=mode === "spent" ? spentOverviewBalance(site) : null;
    const balance = spent ? spent.balance : normalizeBalance(site[balanceProperty(mode)]);
    return {site, balance, amount: balanceAmount(balance), group: groups.get(site.groupId) || "未分组",
      status: spent ? spent.status : overviewBalanceStatus(balance, data.settings.balanceThresholds?.[balance.unit] || 0)};
  }).filter((row) => {
    if (options.group && options.group !== "all"
      && (options.group === "ungrouped" ? Boolean(row.site.groupId) : row.site.groupId !== options.group)) return false;
    if (query && !`${row.site.name} ${row.group} ${row.site.websiteUrl}`.toLocaleLowerCase().includes(query)) return false;
    if (options.unit && options.unit !== "all" && row.balance.unit !== options.unit) return false;
    if (options.status === "low" && !["empty", "low"].includes(row.status)) return false;
    if (options.status === "positive" && !["positive", "unlimited"].includes(row.status)) return false;
    if (options.status === "reported" && !row.balance.cache) return false;
    if (options.status === "unknown" && (mode === "spent" ? Boolean(row.balance.cache) : ["empty", "low", "positive", "unlimited"].includes(row.status))) return false;
    return true;
  });
  const nameOrder = (a, b) => a.site.name.localeCompare(b.site.name, "zh-CN") || a.site.id.localeCompare(b.site.id);
  rows.sort((a, b) => {
    if (options.sort === "name") return nameOrder(a, b);
    if (options.sort === "updated") return (Date.parse(b.balance.cache?.checkedAt) || 0) - (Date.parse(a.balance.cache?.checkedAt) || 0) || nameOrder(a, b);
    const unitOrder = units.indexOf(a.balance.unit) - units.indexOf(b.balance.unit);
    if (unitOrder) return unitOrder;
    const aKnown = Boolean(a.balance.cache), bKnown = Boolean(b.balance.cache);
    if (aKnown !== bKnown) return aKnown ? -1 : 1;
    if (!aKnown) return nameOrder(a, b);
    const aValue = a.balance.cache.unlimited ? Infinity : a.amount;
    const bValue = b.balance.cache.unlimited ? Infinity : b.amount;
    if (aValue === bValue) return nameOrder(a, b);
    return (aValue < bValue ? -1 : 1) * (options.sort === "balance-desc" ? -1 : 1);
  });
  return rows;
}

function setMainView(view) {
  state.pageScroll[state.mainView] = window.scrollY || 0;
  finishSiteDrag(false);
  setArranging(false);
  state.mainView = view === "overview" ? "overview" : "sites";
  const overview = state.mainView === "overview";
  dom.homePage.hidden = overview;
  dom.overviewPage.hidden = !overview;
  $("mobile-add-button").hidden = overview;
  dom.overviewButton.setAttribute("aria-pressed", String(overview));
  dom.overviewButton.setAttribute("aria-label", overview ? "返回站点" : "余额与总消耗");
  if (overview) renderOverview();
  window.scrollTo(0, state.pageScroll[state.mainView]);
}

function renderOverview() {
  if (!state.data || state.mainView !== "overview") return;
  const data = state.data, mode = state.overviewMode;
  const allRows = buildOverviewRows(data, {mode});
  const spent=mode === "spent";
  const covered=allRows.filter((row)=>Boolean(row.balance.cache)).length;
  const websiteCount = data.sites.filter((site) => site.websiteUrl).length;
  const baseCount = data.sites.reduce((sum, site) => sum + getBaseUrls(site).length, 0);
  $("overview-count-sites").textContent = String(data.sites.length);
  $("overview-count-tokens").textContent = String(data.sites.reduce((sum, site) => sum + site.tokens.length, 0));
  $("overview-count-urls").textContent = String(websiteCount + baseCount);
  $("overview-count-low").textContent = String(spent ? covered : allRows.filter((row) => ["empty", "low"].includes(row.status)).length);
  $("overview-count-low-label").textContent=spent?"已返回消耗":"待补充";
  dom.overviewModeAccount.setAttribute("aria-pressed", String(mode === "account"));
  dom.overviewModeToken.setAttribute("aria-pressed", String(mode === "token"));
  dom.overviewModeSpent.setAttribute("aria-pressed", String(spent));
  $("overview-title").textContent=spent?"总消耗":"余额总览";
  $("overview-mode-note").textContent = spent
    ? `已覆盖 ${covered}/${data.sites.length} 站 · 账户历史额度消耗，非实付充值；缺失站点可尝试刷新。`
    : mode === "account"
    ? "账户总余额 · 每站独立查询；不会加上令牌额度。"
    : "每站所配置的单个令牌额度 · 不是账户余额，也不是本站所有令牌额度之和。";
  dom.overviewRefresh.querySelector("span").textContent = spent ? "刷新消耗" : mode === "account" ? "刷新账户" : "刷新令牌";
  dom.overviewRefresh.disabled = !supportsBalanceQuery() || state.balanceBatchBusy || !allRows.some((row) => row.balance.enabled);
  dom.overviewRefresh.setAttribute("aria-busy", String(state.balanceBatchBusy));
  dom.overviewEnableAll.disabled = state.balanceBatchBusy || !data.sites.length;
  dom.overviewEnableAll.title = `全部开启${mode === "token" ? "令牌" : "账户"}查询（所有站点）`;
  dom.overviewSort.value = data.settings.overviewSort;
  dom.overviewSort.querySelector('[value="balance-asc"]').textContent=spent?"消耗升序":"余额升序";
  dom.overviewSort.querySelector('[value="balance-desc"]').textContent=spent?"消耗降序":"余额降序";
  const statusMode=spent?"spent":"balance";
  if (dom.overviewStatus.dataset.mode!==statusMode) {
    const choices=spent?[["all","全部状态"],["reported","已返回消耗"],["unknown","未提供 / 未查询"]]:[["all","全部状态"],["low","待补充"],["positive","有余额 / 无限"],["unknown","待查询 / 复查"]];
    const current=dom.overviewStatus.value;
    dom.overviewStatus.replaceChildren(...choices.map(([value,text])=>makeElement("option",{text,attrs:{value}})));
    dom.overviewStatus.value=choices.some(([value])=>value===current)?current:"all";
    dom.overviewStatus.dataset.mode=statusMode;
  }
  $("overview-thresholds").hidden=spent;
  $("overview-filter-label").textContent=spent?"筛选站点":"筛选与补充提醒线";
  $("overview-caveat").textContent=spent?"按各站显示单位分别累计，包含缓存；未返回的站点不计入，不作汇率换算。":"缓存仅供参考；不同单位分别比较，不作汇率换算。有余额不代表接口可用。";
  const groups = [{id:"all",name:"全部分组"},{id:"ungrouped",name:"未分组"}, ...[...data.groups].sort((a,b)=>a.order-b.order)];
  if (!groups.some((group) => group.id === state.overviewGroup)) state.overviewGroup = "all";
  dom.overviewGroup.replaceChildren(...groups.map((group) => makeElement("option", {text:group.name,attrs:{value:group.id}})));
  dom.overviewGroup.value = state.overviewGroup;
  document.querySelectorAll("[data-balance-threshold]").forEach((input) => {
    if (document.activeElement !== input) input.value = String(data.settings.balanceThresholds[input.dataset.balanceThreshold]);
  });
  const rows = buildOverviewRows(data, {mode, sort:data.settings.overviewSort, unit:dom.overviewUnit.value,
    status:dom.overviewStatus.value, group:state.overviewGroup, query:state.overviewQuery});
  $("overview-count-note").textContent = `网站网址 ${websiteCount} · Base URL ${baseCount} · 分组 ${data.groups.length} · 显示 ${rows.length}/${data.sites.length} 站`;
  $("overview-filter-summary").textContent = rows.length === data.sites.length ? "全部站点" : `筛选中 · ${rows.length} 站`;
  dom.overviewTotals.replaceChildren();
  for (const unit of ["USD", "CNY", "credits", "points"]) {
    const cached = rows.filter((row) => row.balance.unit === unit && row.balance.cache && !row.balance.cache.unlimited);
    if (!cached.length) continue;
    const sum = cached.reduce((total, row) => total + row.amount, 0);
    const amount = formatBalanceValue({unit, divisor:1, cache:{rawQuota:sum}});
    dom.overviewTotals.append(makeElement("div", {className:"overview-total"}, [
      makeElement("span", {text:`${BALANCE_UNIT_NAMES[unit]} · ${cached.length} 站${spent?"总消耗":"缓存小计"}`}),
      makeElement("strong", {text:amount})
    ]));
  }
  dom.overviewRows.replaceChildren();
  let previousUnit = "";
  for (const row of rows) {
    if (data.settings.overviewSort.startsWith("balance") && row.balance.unit !== previousUnit) {
      previousUnit = row.balance.unit;
      dom.overviewRows.append(makeElement("h3", {className:"overview-unit-heading",text:BALANCE_UNIT_NAMES[previousUnit]}));
    }
    dom.overviewRows.append(makeOverviewRow(row, mode));
  }
  if (!rows.length) dom.overviewRows.append(makeElement("p", {className:"overview-empty",text:data.sites.length ? "没有符合筛选条件的站点，换个条件看看。" : "还没有站点，返回首页添加第一条记录吧。"}));
}

function makeOverviewRow({site, balance, status, group}, mode) {
  const row = makeElement("article", {className:`overview-row status-${status}`, attrs:{"data-site-id":site.id,"data-balance-mode":mode}});
  const identity = makeElement("button", {type:"button",className:"overview-identity",attrs:{"aria-label":`查看${site.name}的详情`}}, [
    makeElement("span", {className:`site-tile-initial tone-${siteToneIndex(site)}`,text:siteInitial(site.name),attrs:{"aria-hidden":"true"}}),
    makeElement("span", {className:"overview-site-copy"}, [makeElement("strong", {text:site.name}),
      makeElement("small", {text:`${group} · ${site.tokens.length} 令牌 · ${getBaseUrls(site).length} Base URL`})])
  ]);
  identity.addEventListener("click", () => openSiteDetail(site.id));
  const queryMode=mode === "spent" ? "account" : mode;
  const busy = state.balanceBusySiteIds.has(balanceBusyKey(site.id, queryMode));
  const value = makeElement("button", {type:"button",className:"overview-amount",attrs:{"aria-label":`查看${site.name}${mode === "spent"?"的历史消耗与日志":"的余额详情"}`}}, [
    makeElement("strong", {text:mode === "spent" && !balance.cache ? status === "missing" ? "未提供" : "待查询" : formatBalanceValue(balance)}),
    makeElement("span", {className:`overview-status status-${status}`,text:busy ? "正在查询…" : OVERVIEW_STATUS[status]})
  ]);
  value.addEventListener("click",()=>mode === "spent"?openSiteActivity(site.id):openSiteDetail(site.id));
  const menu=makeElement("details",{className:"overview-row-menu"});
  const summary=makeElement("summary",{title:`${site.name} · 更多操作`,attrs:{"aria-label":`${site.name} · 更多操作`}},createIcon("more"));
  const footer = makeElement("div", {className:"overview-row-footer"});
  const info = balance.lastError ? BALANCE_ERROR_MESSAGES[balance.lastError]
    : balance.cache ? `${balanceIsStale(balance) ? "旧结果 · " : ""}${formatDateTime(balance.cache.checkedAt)}`
    : mode === "spent" ? "尚无累计消耗，请刷新账户" : "配置后点刷新，不会自动查询";
  footer.append(makeElement("small", {text:info}));
  const actions = makeElement("div", {className:"balance-actions"});
  const config = makeElement("button", {type:"button",className:"text-button balance-configure",text:"查询配置",attrs:{"aria-label":`配置${site.name}的${queryMode === "account" ? "账户余额" : "令牌额度"}`}});
  config.addEventListener("click", () => openBalanceSettings(site, queryMode));
  const refresh = makeElement("button",{type:"button",className:"text-button overview-row-refresh",text:"刷新查询"},createIcon("refresh"));
  refresh.disabled = !supportsBalanceQuery() || !balance.enabled || busy;
  refresh.addEventListener("click", () => {menu.open=false;refreshSiteBalance(site.id, false, queryMode);});
  actions.append(config, refresh);
  const history = makeElement("button", {type:"button",className:"text-button",text:"日志",attrs:{"aria-label":`查看${site.name}的用量与日志`}});
  history.addEventListener("click", () => openSiteActivity(site.id));
  actions.prepend(history);
  footer.append(actions);
  menu.append(summary,footer);
  menu.addEventListener("toggle",()=>{if(menu.open)dom.overviewRows.querySelectorAll(".overview-row-menu").forEach((other)=>{if(other!==menu)other.open=false;});});
  row.append(identity, value, menu);
  return row;
}

function bindOverviewEvents() {
  dom.overviewButton.addEventListener("click", () => setMainView(state.mainView === "overview" ? "sites" : "overview"));
  $("overview-back").addEventListener("click", () => setMainView("sites"));
  for (const [mode,button] of [["account",dom.overviewModeAccount],["token",dom.overviewModeToken],["spent",dom.overviewModeSpent]]) {
    button.addEventListener("click", () => { state.overviewMode = mode; renderOverview(); });
  }
  dom.overviewRefresh.addEventListener("click", () => refreshAllBalances(false, state.overviewMode === "spent"?"account":state.overviewMode));
  dom.overviewEnableAll.addEventListener("click", () => openBulkQueries(state.overviewMode));
  dom.bulkQueryRefresh.addEventListener("change", () => { dom.bulkQueryAccept.textContent=dom.bulkQueryRefresh.checked?"全部开启并刷新":"全部开启"; });
  dom.overviewSort.addEventListener("change", () => { state.data.settings.overviewSort = dom.overviewSort.value; scheduleSave(); renderOverview(); });
  [dom.overviewUnit, dom.overviewStatus].forEach((input) => input.addEventListener("change", renderOverview));
  dom.overviewGroup.addEventListener("change", () => { state.overviewGroup = dom.overviewGroup.value; renderOverview(); });
  dom.overviewSearch.addEventListener("input", () => { state.overviewQuery = dom.overviewSearch.value; renderOverview(); });
  document.querySelectorAll("[data-balance-threshold]").forEach((input) => input.addEventListener("change", () => {
    const value = Number(input.value);
    if (input.value === "" || !Number.isFinite(value) || value < 0 || value > 1e12) {
      $("overview-threshold-error").textContent = "提醒线需为 0～1000000000000 之间的数值";
      return;
    }
    $("overview-threshold-error").textContent = "";
    state.data.settings.balanceThresholds[input.dataset.balanceThreshold] = value;
    scheduleSave(); renderOverview();
  }));
}

const SITE_LOG_TYPES = {1:"充值 / 入账",2:"消耗",3:"管理",4:"错误",5:"系统 / 签到",6:"退款"};

function safeHistoryText(value, secrets = [], limit = 1200) {
  let text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  for (const secret of secrets) if (secret && secret.length >= 8) text = text.split(secret).join("[已隐藏密钥]");
  return text.replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}|sk-[A-Za-z0-9_-]{8,}/gi, "[已隐藏密钥]")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").slice(0, limit);
}

function historyNumber(value, integer = false) {
  return value !== null && value !== undefined && validBalanceQuota(value)
    && (!integer || /^\d+$/.test(String(value))) ? String(value) : null;
}

function normalizeHistoryQuery(raw, tab) {
  if (!raw || !Number.isInteger(Number(raw.page)) || Number(raw.page) < 1 || Number(raw.page) > 1000000) throw new Error("筛选页码无效");
  const query = {page:Number(raw.page)};
  if (tab === "orders") return query;
  const start = Number(raw.start), end = Number(raw.end), type = tab === "recharges" ? 1 : Number(raw.type);
  if (![start,end,type].every(Number.isInteger) || start < 0 || end > 4102444800 || start > end
    || (start === 0) !== (end === 0) || end-start > 366*86400 || type < 0 || type > 6) throw new Error("请选择有效日期，单次范围不超过 366 天；站点可能有更短限制");
  query.start=start; query.end=end; query.type=type;
  for (const name of ["model","token"]) {
    const text = String(raw[name] || "").trim();
    if (text.length > 100 || /[\x00-\x1f\x7f]/.test(text)) throw new Error("模型或令牌备注筛选过长或含非法换行");
    if (/Bearer\s+\S{8,}|sk-[A-Za-z0-9_-]{12,}/i.test(text)) throw new Error("筛选只填模型名或令牌备注，请勿填写 API 密钥");
    query[name]=text;
  }
  return query;
}

function normalizeActivityPage(raw, tab, secrets) {
  if (!raw || !Number.isFinite(Date.parse(raw.checkedAt)) || !Array.isArray(raw.items) || raw.items.length > 20) return null;
  try {
    const query = normalizeHistoryQuery(raw.query, tab);
    const pageSize = Number(raw.pageSize || 20);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20) return null;
    const items = raw.items.map((item) => {
      if (!item || typeof item !== "object") throw new Error("INVALID_LOG");
      const row = {id:safeHistoryText(item.id,secrets,80),createdAt:historyNumber(item.createdAt,true)};
      const textFields = tab === "orders" ? ["status","method","tradeNo"] : ["model","token","group","content"];
      const numberFields = tab === "orders" ? ["completedAt","money","amount"] : ["type","quota","promptTokens","completionTokens","useTime"];
      textFields.forEach((key) => { row[key]=safeHistoryText(item[key],secrets,key === "content" ? 1200 : 160); });
      numberFields.forEach((key) => { row[key]=historyNumber(item[key],!["money","amount","quota"].includes(key)); });
      if (tab !== "orders") row.stream=typeof item.stream === "boolean" ? item.stream : null;
      return row;
    });
    return {query,pageSize,items,total:historyNumber(raw.total,true),checkedAt:raw.checkedAt};
  } catch { return null; }
}

function normalizeSiteActivity(raw, config, extraSecrets = []) {
  const source=raw && typeof raw === "object" ? raw : {};
  const bound=Boolean(config.origin && config.userId) && source.origin === config.origin && source.userId === config.userId;
  const secrets=[config.credential,...extraSecrets];
  const summary=bound && source.summary && Number.isFinite(Date.parse(source.summary.checkedAt))
    ? {rawQuota:historyNumber(source.summary.rawQuota),usedQuota:historyNumber(source.summary.usedQuota),
      requestCount:historyNumber(source.summary.requestCount,true),checkedAt:source.summary.checkedAt} : null;
  const pages={},stats={},errors={};
  for (const tab of ["logs","recharges","orders"]) {
    pages[tab]=bound ? normalizeActivityPage(source.pages?.[tab],tab,secrets) : null;
    errors[tab]=bound && BALANCE_ERROR_MESSAGES[source.errors?.[tab]] ? source.errors[tab] : "";
    const stat=bound && source.stats?.[tab];
    try {
      stats[tab]=stat && Number.isFinite(Date.parse(stat.checkedAt)) && historyNumber(stat.rawQuota) !== null
        ? {query:normalizeHistoryQuery(stat.query,tab),rawQuota:historyNumber(stat.rawQuota),rpm:historyNumber(stat.rpm,true),tpm:historyNumber(stat.tpm,true),checkedAt:stat.checkedAt} : null;
    } catch { stats[tab]=null; }
  }
  return {enabled:bound && Boolean(config.origin && config.credential) && source.enabled === true,
    origin:config.origin,userId:config.userId,paymentUnit:["CNY","USD"].includes(source.paymentUnit)?source.paymentUnit:"unknown",summary,pages,stats,errors};
}

function activitySite() { return state.data?.sites.find((site) => site.id === state.activitySiteId); }
function supportsSiteHistory() { return typeof window.BlueEyeNative?.requestSiteHistory === "function"; }
function historyDate(seconds) {
  const value=Number(seconds);
  return seconds !== null && value > 0 && value <= 4102444800 ? formatDateTime(new Date(value*1000).toISOString()) : "时间未提供";
}
function historyAmount(raw, config) { return raw === null || raw === undefined ? "站点未提供" : formatBalanceValue({...config,cache:{rawQuota:raw,unlimited:false}}); }
function localDateInput(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }

function readActivityQuery(page=1) {
  if (state.activityTab === "orders") return {page};
  let start=0,end=0;
  const range=dom.activityRange.value;
  if (range !== "all") {
    const now=new Date(), first=new Date(now);
    first.setHours(0,0,0,0);
    if (range === "custom") {
      if (!dom.activityStart.value || !dom.activityEnd.value) throw new Error("请填写起始和结束日期");
      start=Math.floor(new Date(`${dom.activityStart.value}T00:00:00`).getTime()/1000);
      end=Math.min(Math.floor(Date.now()/1000),Math.floor(new Date(`${dom.activityEnd.value}T23:59:59`).getTime()/1000));
    } else {
      if (range !== "today") first.setDate(first.getDate()-(Number(range)-1));
      start=Math.floor(first.getTime()/1000); end=Math.floor(now.getTime()/1000);
    }
  }
  return normalizeHistoryQuery({page,start,end,type:dom.activityType.value,model:dom.activityModel.value,token:dom.activityToken.value},state.activityTab);
}

function sameActivityQuery(left, right) {
  return Boolean(left && right) && JSON.stringify({...left,page:1})===JSON.stringify({...right,page:1});
}

function selectActivityQuery() {
  const cached=activitySite()?.activity.pages[state.activityTab];
  try { state.activityQuery=readActivityQuery(); }
  catch { state.activityQuery=null; }
  state.activityDirty=!state.activityQuery || Boolean(cached && !sameActivityQuery(cached.query,state.activityQuery));
  if (cached && !state.activityDirty) state.activityQuery=cached.query;
}

function openSiteActivity(siteId) {
  const site=state.data?.sites.find((item)=>item.id===siteId);
  if (!site) return;
  setDialogCloseLabel(dom.activityDialog, dom.siteDetailDialog.open ? "返回站点详情" : "关闭用量与日志");
  state.activityGeneration+=1; state.activityBusy=false; state.activitySiteId=siteId;
  state.activityTab="logs"; state.activityError=""; state.activityStatError=""; state.activitySummaryError=""; state.activityDirty=false;
  if (!site.activity) site.activity=normalizeSiteActivity(null,normalizeBalance(site.balance));
  // Cached timestamps describe old results, never the next opening's default range.
  dom.activityRange.value="7"; dom.activityType.value="0";
  dom.activityModel.value=""; dom.activityToken.value="";
  selectActivityQuery();
  dom.activityStart.value=localDateInput(new Date(state.activityQuery.start*1000));
  dom.activityEnd.value=localDateInput(new Date(state.activityQuery.end*1000));
  renderSiteActivity();
  if (!dom.activityDialog.open) dom.activityDialog.showModal();
}

function nativeSiteHistoryRequest(config,kind,query={}) {
  return new Promise((resolve) => {
    if (!supportsSiteHistory()) return resolve({ok:false,code:"native"});
    const id=uid("history");
    const timer=window.setTimeout(()=>{state.balanceRequests.delete(id);resolve({ok:false,code:"timeout"});},60000);
    state.balanceRequests.set(id,{resolve,timer});
    try { window.BlueEyeNative.requestSiteHistory(id,config.origin,kind,config.credential,config.userId,JSON.stringify(query)); }
    catch { window.clearTimeout(timer);state.balanceRequests.delete(id);resolve({ok:false,code:"network"}); }
  });
}

async function enableSiteActivity() {
  const site=activitySite(),config=normalizeBalance(site?.balance);
  if (!site || !config.enabled || !supportsSiteHistory()) return;
  const snapshot=balanceSnapshotKey(config);
  const confirmed=await askConfirm({title:"允许查询本站用量和历史？",message:`手机将向 ${config.origin} 发送已配置账户凭证，只读查询本人历史消耗、请求数、使用日志和支付订单。记录随本机加密备份保存，站点可能仅开放部分历史。`,acceptLabel:"启用并查询"});
  if (!confirmed || activitySite()!==site || balanceSnapshotKey(site.balance)!==snapshot) return;
  site.activity.enabled=true; scheduleSave(); renderSiteActivity(); await loadSiteActivity(1,true);
}

async function loadSiteActivity(page=1, refreshSummary=true) {
  const site=activitySite();
  if (!site || state.activityBusy || !site.activity?.enabled || !site.balance?.enabled || !supportsSiteHistory()) return false;
  let query;
  try { query=!refreshSummary && state.activityQuery && !state.activityDirty
    ? normalizeHistoryQuery({...state.activityQuery,page},state.activityTab) : readActivityQuery(page); }
  catch (error) { state.activityError=error.message;renderSiteActivity();return false; }
  const tab=state.activityTab,kind=tab==="orders"?"orders":"logs",config=normalizeBalance(site.balance);
  if ([query.model,query.token].some((value)=>value && [config.credential,...site.tokens.map((token)=>token.value)].some((secret)=>secret && secret.length>=8 && value.includes(secret)))) {
    state.activityError="筛选只填模型名或令牌备注，请勿填写 API 密钥";renderSiteActivity();return false;
  }
  const generation=++state.activityGeneration,epoch=state.balanceEpoch,snapshot=balanceSnapshotKey(config),activity=site.activity;
  state.activityBusy=true;state.activityError="";state.activityStatError="";state.activitySummaryError="";state.activityDirty=false;state.activityQuery=query;
  renderSiteActivity();
  const jobs=[nativeSiteHistoryRequest(config,kind,query)];
  if (refreshSummary) jobs.push(nativeSiteHistoryRequest(config,"summary"));
  if (tab!=="orders" && refreshSummary) jobs.push(nativeSiteHistoryRequest(config,"stat",query));
  const results=await Promise.all(jobs);
  if (epoch!==state.balanceEpoch || generation!==state.activityGeneration || activitySite()!==site || site.activity!==activity || !activity.enabled || !site.balance.enabled || balanceSnapshotKey(site.balance)!==snapshot) {
    if (generation===state.activityGeneration) { state.activityBusy=false;if(dom.activityDialog.open)renderSiteActivity(); }
    return false;
  }
  state.activityBusy=false;
  const checkedAt=nowIso(), result=results[0];
  let ok=false;
  const errorMessage=(value)=>BALANCE_ERROR_MESSAGES[value?.code] || BALANCE_ERROR_MESSAGES.response;
  if (result.ok && result.kind===kind) {
    const next=normalizeActivityPage({...result,query,checkedAt},tab,[config.credential,...site.tokens.map((token)=>token.value)]);
    if (next) { activity.pages[tab]=next;activity.errors[tab]="";ok=true; }
  }
  if (!ok) { activity.errors[tab]=BALANCE_ERROR_MESSAGES[result.code]?result.code:"response";state.activityError=`${errorMessage(result)}。本站可能限制可查日期或账户令牌权限；保留上次缓存。`; }
  if (refreshSummary) {
    const summary=results[1];
    if (summary.ok && summary.kind==="summary" && historyNumber(summary.rawQuota)!==null) {
      activity.summary={rawQuota:historyNumber(summary.rawQuota),usedQuota:historyNumber(summary.usedQuota),requestCount:historyNumber(summary.requestCount,true),checkedAt};
    } else state.activitySummaryError=errorMessage(summary);
    if (tab!=="orders") {
      const stat=results[2];
      if (ok && stat.ok && stat.kind==="stat" && historyNumber(stat.rawQuota)!==null) activity.stats[tab]={query,rawQuota:historyNumber(stat.rawQuota),rpm:historyNumber(stat.rpm,true),tpm:historyNumber(stat.tpm,true),checkedAt};
      else state.activityStatError=errorMessage(stat);
    }
  }
  scheduleSave();renderSiteActivity();return ok;
}

function renderSiteActivity() {
  const site=activitySite();if (!site) return;
  const activity=site.activity,config=normalizeBalance(site.balance),tab=state.activityTab,cached=activity.pages[tab];
  const busy=state.activityBusy, permitted=activity.enabled && config.enabled;
  dom.activityTitle.textContent=`${site.name} · 用量与日志`;
  const summary=activity.summary;
  $("activity-remaining").textContent=summary?historyAmount(summary.rawQuota,config):formatBalanceValue(config);
  $("activity-used").textContent=summary?historyAmount(summary.usedQuota,config):"尚未查询";
  $("activity-requests").textContent=summary ? summary.requestCount===null?"站点未提供":new Intl.NumberFormat("zh-CN").format(Number(summary.requestCount)) : "尚未查询";
  $("activity-summary-note").textContent=state.activitySummaryError ? `概要更新失败：${state.activitySummaryError}${summary?"；以上为旧结果":""}`
    : summary?`账户累计字段 · 更新于 ${formatDateTime(summary.checkedAt)}；历史消耗不是历史实付充值。`:"历史消耗与请求数来自本站账户概要，尚未加载。";
  $("activity-permission-note").textContent=!config.enabled?"请先配置并开启本站账户查询；普通聊天 API Key 无法代替账户凭证。":!supportsSiteHistory()?"此设备仅显示已有缓存，请在 Android 新版查询。":!activity.enabled?"历史查询默认关闭，开启后仅查询已确认站点。":"已允许本站历史查询 · 无后台轮询";
  dom.activityEnable.hidden=permitted || !config.enabled || !supportsSiteHistory();
  $("activity-disable").hidden=!activity.enabled;
  dom.activityQueryButton.disabled=!permitted || !supportsSiteHistory() || busy;
  dom.activityQueryButton.setAttribute("aria-busy",String(busy));
  document.querySelectorAll("[data-activity-tab]").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.activityTab===tab)));
  $("activity-log-filters").hidden=tab==="orders";
  $("activity-type-field").hidden=tab!=="logs";
  $("activity-date-fields").hidden=dom.activityRange.value!=="custom";
  $("activity-payment-field").hidden=tab!=="orders";
  $("activity-payment-unit").value=activity.paymentUnit;
  $("activity-period").hidden=tab==="orders";
  $("activity-tab-note").textContent=tab==="orders"?"站点原始订单分页；日期筛选仅用于日志。":tab==="recharges"?"充值 / 入账类型日志；额度入账不等于现金付款。":"调用消耗、系统签到等按类型查看；筛选条件由本站解释。";
  if (tab!=="orders" && ["today","7","30"].includes(dom.activityRange.value)) $("activity-tab-note").textContent+=" 刷新时查到当前时间。";
  const stat=activity.stats[tab];
  const sameStat=!state.activityDirty && stat && sameActivityQuery({...stat.query,type:2},state.activityQuery && {...state.activityQuery,type:2});
  $("activity-period-quota").textContent=state.activityStatError?"查询未成功":sameStat?historyAmount(stat.rawQuota,config):"尚未查询";
  $("activity-period-rate").textContent=sameStat && !state.activityStatError ? `RPM ${stat.rpm??"—"} · TPM ${stat.tpm??"—"}` : "";
  dom.activityStatus.textContent=busy?"正在向本站查询…":state.activityError || (state.activityDirty?`当前筛选尚未查询，点“查询 / 刷新”加载${cached?"；下方仍是上次缓存":""}。`:activity.errors[tab]?`${BALANCE_ERROR_MESSAGES[activity.errors[tab]]}；下方为上次缓存。`:!cached?"此页尚未查询；点“查询 / 刷新”加载。":"");
  const q=cached?.query;
  $("activity-cache-note").textContent=cached?`缓存于 ${formatDateTime(cached.checkedAt)} · ${tab==="orders"?"支付订单":q.start?`${historyDate(q.start)} 至 ${historyDate(q.end)}`:"站点默认可查范围"}${tab!=="orders"?` · ${SITE_LOG_TYPES[q.type]||"全部类型"}${q.model?` · 模型 ${q.model}`:""}${q.token?` · 令牌 ${q.token}`:""}`:""} · 仅当前页，非完整历史合计`:"";
  dom.activityRows.replaceChildren();
  if (cached?.items.length) cached.items.forEach((item)=>dom.activityRows.append(makeActivityRow(item,tab,config,activity.paymentUnit)));
  else dom.activityRows.append(makeElement("p",{className:"activity-empty",text:cached?"本站在当前范围返回 0 条记录；其他日期或类型可能仍有记录。":"暂无已加载记录"}));
  const currentPage=cached?.query.page || state.activityQuery?.page || 1;
  const total=cached?.total;
  $("activity-page-label").textContent=`第 ${currentPage} 页${total!==null && total!==undefined?` · 站点可查 ${total} 条`:" · 总数未提供"}`;
  const currentCache=cached && !state.activityDirty && sameActivityQuery(cached.query,state.activityQuery);
  $("activity-prev").disabled=!permitted || !supportsSiteHistory() || busy || !currentCache || currentPage<=1;
  $("activity-next").disabled=!permitted || !supportsSiteHistory() || busy || !currentCache || !cached.items.length || (total!==null?currentPage*cached.pageSize>=Number(total):cached.items.length<cached.pageSize);
}

function makeActivityRow(item,tab,config,paymentUnit) {
  const order=tab==="orders",row=makeElement("article",{className:`activity-row log-type-${item.type||0}`});
  const heading=makeElement("div",{className:"activity-row-heading"},[makeElement("time",{text:historyDate(item.createdAt)}),makeElement("span",{className:"activity-type",text:order?({success:"支付成功",pending:"待支付",failed:"失败",expired:"已过期",cancelled:"已取消"}[item.status]||item.status||"状态未提供"):SITE_LOG_TYPES[item.type]||"其他日志"})]);
  row.append(heading);
  if (order) {
    const money=item.money===null?"站点未提供":new Intl.NumberFormat("zh-CN",{minimumFractionDigits:paymentUnit==="unknown"?0:2,maximumFractionDigits:paymentUnit==="unknown"?6:2}).format(Number(item.money));
    const prefix=paymentUnit==="CNY"?"¥":paymentUnit==="USD"?"$":"";
    row.append(makeElement("strong",{className:"activity-main-value",text:`支付金额：${prefix}${money}${paymentUnit==="unknown"?"（站点原值）":""}`}),makeElement("p",{text:`充值数量：${item.amount??"站点未提供"}（站点原值） · ${item.method||"支付方式未提供"}`}));
    if (item.tradeNo) row.append(makeElement("p",{className:"activity-order-id",text:`订单号 ${item.tradeNo}`}));
    if (item.completedAt && Number(item.completedAt)>0) row.append(makeElement("small",{text:`完成于 ${historyDate(item.completedAt)}`}));
  } else {
    const title=item.model || item.token || SITE_LOG_TYPES[item.type] || "站点记录";
    const amount=[3,5].includes(Number(item.type)) && (item.quota===null || Number(item.quota)===0)?"额度详见说明":historyAmount(item.quota,config);
    row.append(makeElement("div",{className:"activity-log-main"},[makeElement("strong",{text:title}),makeElement("strong",{text:amount})]));
    const metadata=[];
    if (item.token) metadata.push(`令牌 ${item.token}`);
    if (item.group) metadata.push(`分组 ${item.group}`);
    if (Number(item.type)===2 || Number(item.type)===4) metadata.push(`输入 ${item.promptTokens??"—"} / 输出 ${item.completionTokens??"—"} Token`,`${item.useTime??"—"} 秒`,item.stream===null?"流式状态未提供":item.stream?"流式":"非流式");
    if (metadata.length) row.append(makeElement("p",{text:metadata.join(" · ")}));
    if (item.content) {
      if ([2,4].includes(Number(item.type))) { const details=makeElement("details",{className:"activity-content"});details.append(makeElement("summary",{text:"站点说明"}),makeElement("p",{text:item.content}));row.append(details); }
      else row.append(makeElement("p",{className:"activity-content-text",text:item.content}));
    }
  }
  return row;
}

function bindActivityEvents() {
  dom.activityForm.addEventListener("submit",(event)=>{event.preventDefault();loadSiteActivity(1,true);});
  dom.activityEnable.addEventListener("click",enableSiteActivity);
  $("activity-configure").addEventListener("click",()=>{const site=activitySite();if(site)openBalanceSettings(site,"account");});
  $("activity-disable").addEventListener("click",()=>{const site=activitySite();if(site){site.activity.enabled=false;state.activityGeneration+=1;state.activityBusy=false;scheduleSave();renderSiteActivity();}});
  dom.activityDialog.addEventListener("close",()=>{
    state.activityGeneration+=1;state.activityBusy=false;state.activitySiteId=null;dom.activityRows.replaceChildren();
    dom.activityTitle.textContent="用量与日志";dom.activityStatus.textContent="";
    ["activity-remaining","activity-used","activity-requests","activity-period-quota"].forEach((id)=>{$(id).textContent="尚未查询";});
    ["activity-summary-note","activity-cache-note","activity-period-rate"].forEach((id)=>{$(id).textContent="";});
    dom.activityModel.value="";dom.activityToken.value="";
  });
  document.querySelectorAll("[data-activity-tab]").forEach((button)=>button.addEventListener("click",()=>{
    const site=activitySite();if(!site)return;
    state.activityGeneration+=1;state.activityBusy=false;state.activityTab=button.dataset.activityTab;state.activityError="";state.activityStatError="";state.activityDirty=false;
    // Keep the visible range (including rolling dates) when changing history tabs.
    selectActivityQuery();
    renderSiteActivity();
  }));
  const dirty=()=>{state.activityGeneration+=1;state.activityBusy=false;state.activityDirty=true;state.activityError="";renderSiteActivity();};
  [dom.activityRange,dom.activityStart,dom.activityEnd,dom.activityType].forEach((input)=>input.addEventListener("change",dirty));
  [dom.activityModel,dom.activityToken].forEach((input)=>input.addEventListener("input",dirty));
  $("activity-payment-unit").addEventListener("change",(event)=>{const site=activitySite();if(site){site.activity.paymentUnit=event.target.value;scheduleSave();renderSiteActivity();}});
  $("activity-prev").addEventListener("click",()=>{const page=activitySite()?.activity.pages[state.activityTab]?.query.page||1;loadSiteActivity(page-1,false);});
  $("activity-next").addEventListener("click",()=>{const page=activitySite()?.activity.pages[state.activityTab]?.query.page||1;loadSiteActivity(page+1,false);});
}

function readThemePreference() {
  try {
    const theme = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    return ["light", "dark", "cream"].includes(theme) ? theme : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme) {
  if (["light","dark","cream"].includes(theme)) {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  const isDark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", isDark ? "#0b1425" : theme === "cream" ? "#f7f3eb" : "#eef4fa");
  document.querySelectorAll("[data-theme-choice]").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.themeChoice===theme)));
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, theme);
  } catch {
    // The current page can still apply its color when storage is unavailable.
  }
}

function clearInMemoryKeyBytes() {
  if (state.keyBytes instanceof Uint8Array) state.keyBytes.fill(0);
  state.keyBytes = null;
}

function getBiometricStatus() {
  const bridge = window.BlueEyeNative;
  if (!bridge || typeof bridge.getBiometricStatus !== "function") {
    return {
      native: false,
      supported: false,
      available: false,
      enabled: false,
      code: "web",
      message: "仅 Android 独立版支持指纹解锁"
    };
  }
  try {
    const status = JSON.parse(bridge.getBiometricStatus());
    return { native: true, ...status };
  } catch (error) {
    console.error(error);
    return {
      native: true,
      supported: false,
      available: false,
      enabled: false,
      code: "error",
      message: "暂时无法读取指纹状态"
    };
  }
}

function updateBiometricUi() {
  const status = getBiometricStatus();
  dom.biometricUnlockArea.hidden = !status.native || !status.enabled;
  dom.biometricUnlockButton.disabled = state.biometricPromptPending || !status.available;
  dom.biometricSettingsButton.hidden = !status.native || !status.supported;
  dom.biometricSettingsButton.disabled = state.biometricPromptPending;
  updateImportBiometricUi(status);

  if (status.enabled) {
    dom.biometricSettingsTitle.textContent = "关闭指纹解锁";
    dom.biometricSettingsStatus.textContent = status.available
      ? "已开启；主密码仍可作为备用"
      : status.message;
  } else if (status.available) {
    dom.biometricSettingsTitle.textContent = "开启指纹解锁";
    dom.biometricSettingsStatus.textContent = "验证一次指纹，以后可快速解锁";
  } else {
    dom.biometricSettingsTitle.textContent = "指纹解锁不可用";
    dom.biometricSettingsStatus.textContent = status.message;
  }
  return status;
}

function disableBiometricCredential() {
  const bridge = window.BlueEyeNative;
  if (!bridge || typeof bridge.disableBiometric !== "function") return false;
  try {
    const disabled = bridge.disableBiometric();
    state.biometricPromptPending = false;
    updateBiometricUi();
    return disabled;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function requestBiometricUnlock() {
  if (state.data || state.biometricPromptPending || !state.envelope || dom.importDialog.open) return;
  const status = updateBiometricUi();
  if (!status.enabled || !status.available) {
    if (status.native && status.message) showToast(status.message, "error", 3200);
    return;
  }
  try {
    state.biometricPromptPending = true;
    updateBiometricUi();
    window.BlueEyeNative.requestBiometricUnlock();
  } catch (error) {
    console.error(error);
    state.biometricPromptPending = false;
    updateBiometricUi();
    showToast("系统指纹弹窗暂时打不开", "error");
  }
}

function toggleBiometricSetting() {
  const status = updateBiometricUi();
  if (!status.native) return;
  if (status.enabled) {
    disableBiometricCredential();
    showToast("指纹解锁已关闭");
    return;
  }
  if (!status.available) {
    showToast(status.message, "error", 3400);
    return;
  }
  if (!(state.keyBytes instanceof Uint8Array) || state.keyBytes.length !== 32) {
    showToast("请先锁定，再用主密码重新解锁一次", "error", 3400);
    return;
  }
  try {
    state.biometricPromptPending = true;
    updateBiometricUi();
    window.BlueEyeNative.enableBiometric(bytesToBase64(state.keyBytes));
  } catch (error) {
    console.error(error);
    state.biometricPromptPending = false;
    updateBiometricUi();
    showToast("系统指纹弹窗暂时打不开", "error");
  }
}

window.BlueEyeBiometric = {
  onEnabled() {
    state.biometricPromptPending = false;
    updateBiometricUi();
    showToast("指纹解锁已开启");
  },
  async onUnlockKey(encodedKey) {
    state.biometricPromptPending = false;
    updateBiometricUi();
    if (state.data || dom.importDialog.open || !state.envelope) return;
    let keyBytes = null;
    try {
      keyBytes = base64ToBytes(encodedKey);
      if (keyBytes.length !== 32) throw new Error("INVALID_BIOMETRIC_KEY");
      const key = await importVaultKey(keyBytes);
      const data = await decryptEnvelopeWithKey(state.envelope, key);
      await enterApp(data, key, state.envelope, keyBytes);
      showToast("指纹验证成功");
    } catch (error) {
      console.error(error);
      disableBiometricCredential();
      dom.unlockError.textContent = "指纹凭证已失效，请用主密码解锁并重新开启";
      updateBiometricUi();
    } finally {
      if (keyBytes) keyBytes.fill(0);
    }
  },
  async onImportKey(encodedKey) {
    const request = state.biometricImport;
    state.biometricImport = null;
    state.biometricPromptPending = false;
    updateBiometricUi();
    if (!isCurrentBiometricImport(request)) return;
    await loadImport(async (backup) => {
      const keyBytes = base64ToBytes(encodedKey);
      try {
        if (keyBytes.length !== 32) throw new Error("INVALID_BIOMETRIC_KEY");
        const key = await importVaultKey(keyBytes);
        return { key, keyBytes, data: await decryptEnvelopeWithKey(backup, key) };
      } catch (error) {
        keyBytes.fill(0);
        throw error;
      }
    }, true);
  },
  onError(action, code, message) {
    state.biometricPromptPending = false;
    if (action === "import") {
      const request = state.biometricImport;
      state.biometricImport = null;
      updateBiometricUi();
      if (isCurrentBiometricImport(request) && code !== "cancelled") {
        dom.importError.textContent = "指纹验证未完成，请输入这份备份的转移密码。";
      }
      return;
    }
    updateBiometricUi();
    if (code === "cancelled") {
      if (action === "unlock") window.setTimeout(() => dom.unlockPassword.focus(), 80);
      return;
    }
    if (action === "unlock") dom.unlockError.textContent = message;
    showToast(message, "error", 3400);
  }
};

function showLockedMode(hasVault, autoBiometric = false) {
  dom.vaultApp.hidden = true;
  dom.lockScreen.hidden = false;
  dom.unlockForm.hidden = !hasVault;
  dom.setupForm.hidden = hasVault;
  dom.unlockError.textContent = "";
  dom.setupError.textContent = "";
  const biometricStatus = updateBiometricUi();
  const shouldAutoUnlock = Boolean(
    hasVault && autoBiometric && biometricStatus.enabled && biometricStatus.available
  );
  if (shouldAutoUnlock) {
    window.setTimeout(requestBiometricUnlock, 220);
  } else {
    window.setTimeout(() => (hasVault ? dom.unlockPassword : dom.setupPassword).focus(), 80);
  }
}

async function enterApp(data, key, envelope, keyBytes = null) {
  cancelBalanceQueries();
  window.BlueEyeModelStatus?.resetSession();
  clearInMemoryKeyBytes();
  state.data = normalizeData(data);
  state.key = key;
  state.keyBytes = keyBytes ? new Uint8Array(keyBytes) : null;
  if (keyBytes instanceof Uint8Array) keyBytes.fill(0);
  state.envelope = envelope;
  state.revealedTokens.clear();
  state.viewingSiteId = null;
  state.query = "";
  state.selectedGroup = "all";
  dom.searchInput.value = "";
  applyTheme(state.data.settings.theme);
  dom.lockScreen.hidden = true;
  dom.vaultApp.hidden = false;
  setMainView("sites");
  renderAll();
  updateBiometricUi();
  resetAutoLock();
  if (window.matchMedia("(pointer: fine)").matches) {
    window.setTimeout(() => dom.searchInput.focus({ preventScroll: true }), 80);
  }
  if (state.data.settings.balanceAutoRefresh) refreshAllBalances(true);
}

async function lockVault(showMessage = true) {
  if (!state.data) return;
  finishSiteDrag(false);
  setArranging(false);
  cancelBalanceQueries();
  window.BlueEyeModelStatus?.resetSession();
  await flushSave();
  resetFeatureSession();
  window.BlueEyeWeb?.clearPrivateState();
  window.clearTimeout(state.autoLockTimer);
  state.autoLockTimer = null;
  state.key = null;
  clearInMemoryKeyBytes();
  state.data = null;
  state.revealedTokens.clear();
  state.viewingSiteId = null;
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  showLockedMode(true);
  if (showMessage) showToast("密钥簿已锁好");
}

function resetAutoLock() {
  window.clearTimeout(state.autoLockTimer);
  if (!state.data) return;
  const minutes = Number(state.data.settings.autoLockMinutes);
  if (!minutes) return;
  state.autoLockTimer = window.setTimeout(() => lockVault(false), minutes * 60 * 1000);
}

function scheduleSave() {
  if (!state.data || !state.key) return;
  state.data.updatedAt = nowIso();
  dom.saveStatus.textContent = "正在保存…";
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    state.saveTimer = null;
    persistNow();
  }, 260);
}

async function persistNow() {
  if (!state.data || !state.key || !state.envelope) return;
  const snapshot = structuredClone(state.data);
  const key = state.key;
  const salt = base64ToBytes(state.envelope.kdf.salt);
  const iterations = state.envelope.kdf.iterations;
  state.saveChain = state.saveChain.catch(() => undefined).then(async () => {
    const nextEnvelope = await encryptEnvelope(snapshot, key, salt, iterations);
    await databasePut(DB_KEY, nextEnvelope);
    if (state.key === key) {
      state.envelope = nextEnvelope;
      const savedTime = new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(new Date());
      dom.saveStatus.textContent = `已自动保存 · ${savedTime}`;
    }
  });
  try {
    await state.saveChain;
  } catch (error) {
    console.error(error);
    dom.saveStatus.textContent = "保存失败";
    showToast("保存失败，请先导出备份", "error", 3600);
  }
}

async function flushSave() {
  if (state.saveTimer) {
    window.clearTimeout(state.saveTimer);
    state.saveTimer = null;
    await persistNow();
  }
  await state.saveChain;
}

function getGroup(groupId) {
  return state.data?.groups.find((group) => group.id === groupId) ?? null;
}

function ensureGroup(name) {
  const cleaned = name.trim().slice(0, 30);
  if (!cleaned) return null;
  const existing = state.data.groups.find((group) => group.name.toLocaleLowerCase() === cleaned.toLocaleLowerCase());
  if (existing) return existing.id;
  const group = {
    id: uid("group"),
    name: cleaned,
    order: state.data.groups.length
  };
  state.data.groups.push(group);
  return group.id;
}

function sortedSites(sites = state.data.sites) {
  return [...sites].sort((first, second) => {
    if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
    return first.order - second.order || first.createdAt.localeCompare(second.createdAt);
  });
}

function visibleSites() {
  const query = state.query.trim().toLocaleLowerCase();
  return sortSitesByNotes(sortedSites(
    state.data.sites.filter((site) => {
      if (!filterBySiteNotes(site)) return false;
      if (state.selectedGroup !== "all") {
        if (state.selectedGroup === "ungrouped" && site.groupId) return false;
        if (state.selectedGroup !== "ungrouped" && site.groupId !== state.selectedGroup) return false;
      }
      if (!query) return true;
      const groupName = getGroup(site.groupId)?.name ?? "";
      const haystack = [
        site.name,
        site.websiteUrl,
        groupName,
        ...(site.tags || []),
        site.note || "",
        ...getBaseUrls(site).flatMap((baseUrl) => [baseUrl.name, baseUrl.value]),
        ...site.tokens.map((token) => token.name)
      ]
        .join("\n")
        .toLocaleLowerCase();
      return haystack.includes(query);
    })
  ));
}

function renderAll() {
  if (!state.data) return;
  renderGroupFilters();
  renderGroupOptions();
  renderFeatureFilters();
  renderEntries();
  renderSettingsSummary();
  renderOverview();
  if (dom.siteDetailDialog.open) renderSiteDetail();
  if (dom.activityDialog.open) renderSiteActivity();
}

function renderGroupFilters() {
  dom.groupFilters.replaceChildren();
  const counts = new Map();
  state.data.sites.forEach((site) => {
    const key = site.groupId || "ungrouped";
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const items = [
    { id: "all", name: "全部", count: state.data.sites.length },
    ...[...state.data.groups]
      .sort((a, b) => a.order - b.order)
      .map((group) => ({ id: group.id, name: group.name, count: counts.get(group.id) || 0 }))
  ];
  if (counts.get("ungrouped")) items.push({ id: "ungrouped", name: "未分组", count: counts.get("ungrouped") });

  if (!items.some((item) => item.id === state.selectedGroup)) state.selectedGroup = "all";

  items.forEach((item) => {
    const button = makeElement("button", {
      className: "filter-chip",
      type: "button",
      attrs: {
        "aria-pressed": item.id === state.selectedGroup ? "true" : "false"
      }
    });
    button.append(document.createTextNode(item.name));
    button.append(makeElement("span", { className: "chip-count", text: String(item.count) }));
    button.addEventListener("click", () => {
      finishSiteDrag(false);
      setArranging(false);
      state.selectedGroup = item.id;
      renderGroupFilters();
      renderEntries();
    });
    dom.groupFilters.append(button);
  });
}

function renderGroupOptions() {
  dom.groupOptions.replaceChildren();
  [...state.data.groups]
    .sort((a, b) => a.order - b.order)
    .forEach((group) => {
      const option = document.createElement("option");
      option.value = group.name;
      dom.groupOptions.append(option);
    });
}

function renderEntries() {
  const sites = visibleSites();
  const canRefresh = supportsBalanceQuery() && state.data.sites.some((site) => site.balance?.enabled || site.tokenBalance?.enabled);
  dom.refreshBalancesButton.hidden = !canRefresh;
  dom.filterStrip.classList.toggle("has-balance-query", canRefresh);
  dom.listMeta.classList.toggle("has-balance-query", canRefresh);
  dom.refreshBalancesButton.disabled = state.balanceBatchBusy;
  dom.refreshBalancesButton.setAttribute("aria-busy", state.balanceBatchBusy ? "true" : "false");
  dom.arrangeButton.disabled = sites.length < 2 && !state.arranging;
  if (state.drag) return;
  dom.entryList.replaceChildren();
  sites.forEach((site) => dom.entryList.append(renderSiteTile(site)));
  dom.entryCount.textContent = `${sites.length} 个网站`;

  const hasVisible = sites.length > 0;
  dom.entryList.hidden = !hasVisible;
  dom.emptyState.hidden = hasVisible;
  if (!hasVisible) {
    const trulyEmpty = state.data.sites.length === 0;
    dom.emptyTitle.textContent = trulyEmpty ? "还没有收进来的钥匙" : "没有找到对应条目";
    dom.emptyCopy.textContent = trulyEmpty
      ? "可以规整填写，也可以把整段信息贴进来让黑猫认一认。"
      : "换个关键词，或者切回“全部”再看看。";
    dom.emptyActions.hidden = !trulyEmpty;
  }
}

function siteInitial(value) {
  const text = String(value || "").trim();
  if (!text) return "站";
  if (Intl.Segmenter) {
    try {
      return new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment(text)[Symbol.iterator]().next().value.segment;
    } catch {
      // Older WebViews fall back to a Unicode code point below.
    }
  }
  return Array.from(text)[0] || "站";
}

function siteToneIndex(site) {
  let hash = 0;
  for (const character of `${site.id}:${site.name}`) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }
  return hash % 6;
}

function renderSiteTile(site) {
  const tone = siteToneIndex(site);
  const tile = makeElement("article", {
    className: `site-tile${site.pinned ? " is-pinned" : ""}`,
    attrs: { "data-site-id": site.id }
  });
  const openButton = makeElement(
    "button",
    {
      className: "site-tile-open",
      type: "button",
      title: site.name,
      attrs: { "aria-label": state.arranging ? `调整“${site.name}”位置，可拖动或使用方向键` : `打开“${site.name}”的详细信息` }
    },
    [
      makeElement("span", {
        className: `site-tile-initial tone-${tone}`,
        text: siteInitial(site.name),
        attrs: { "aria-hidden": "true" }
      }),
      makeElement("span", { className: "site-tile-name", text: site.name })
    ]
  );
  if (site.pinned) {
    openButton.append(
      makeElement("span", { className: "site-tile-pin", attrs: { "aria-hidden": "true" } }, createIcon("star"))
    );
  }
  const homeBalance = [site.balance, site.tokenBalance].find((balance) => balance?.showOnHome && balance?.enabled);
  if (homeBalance) {
    const balance = normalizeBalance(homeBalance);
    const busy = state.balanceBusySiteIds.has(balanceBusyKey(site.id, balance.mode));
    const prefix = balance.mode === "token" ? "令牌 " : "余额 ";
    const stale = balanceIsStale(balance);
    openButton.classList.add("has-balance");
    openButton.append(makeElement("span", {
      className: `site-tile-balance${balance.lastError ? " is-error" : ""}`,
      text: busy ? "查询中…" : `${prefix}${formatBalanceValue(balance)}${stale ? " · 旧" : ""}`,
      title: balance.cache ? `上次结果：${formatDateTime(balance.cache.checkedAt)}` : "尚未查询"
    }));
  }
  openButton.addEventListener("click", (event) => {
    if (state.arranging || state.drag || Date.now() < state.suppressTileClickUntil) { event.preventDefault(); return; }
    openSiteDetail(site.id);
  });
  tile.append(openButton);
  return tile;
}

function setArranging(enabled) {
  if (enabled && featureState.siteSort !== "manual") { featureState.siteSort="manual"; $("note-site-sort").value="manual"; renderEntries(); }
  state.arranging = enabled;
  dom.entryList.classList.toggle("is-arranging", enabled);
  dom.arrangeButton.setAttribute("aria-pressed", String(enabled));
  dom.arrangeButton.querySelector("span").textContent = enabled ? "完成" : "排序";
  dom.arrangeHint.hidden = !enabled;
  dom.arrangeButton.disabled = !enabled && visibleSites().length < 2;
  dom.entryList.querySelectorAll(".site-tile").forEach((tile) => {
    const site = state.data?.sites.find((item) => item.id === tile.dataset.siteId);
    if (site) tile.querySelector("button").setAttribute("aria-label", enabled
      ? `调整“${site.name}”位置，可拖动或使用方向键` : `打开“${site.name}”的详细信息`);
  });
}

// Replace only the visible slots within each pinned partition. Hidden groups keep their positions.
function applyVisibleSiteOrder(ids) {
  if (!state.data || new Set(ids).size !== ids.length) return false;
  const byId = new Map(state.data.sites.map((site) => [site.id, site]));
  if (ids.some((id) => !byId.has(id))) return false;
  const visible = new Set(ids);
  let changed = false;
  for (const pinned of [true, false]) {
    const peers = sortedSites().filter((site) => site.pinned === pinned);
    const replacements = ids.filter((id) => byId.get(id).pinned === pinned).map((id) => byId.get(id));
    let cursor = 0;
    const next = peers.map((site) => visible.has(site.id) ? replacements[cursor++] : site);
    if (next.some((site, index) => site.id !== peers[index].id)) changed = true;
    next.forEach((site, index) => { site.order = index; });
  }
  if (changed) scheduleSave();
  return changed;
}

function clearDragCandidate() {
  if (state.dragCandidate) window.clearTimeout(state.dragCandidate.timer);
  state.dragCandidate = null;
}

function startSiteDrag(candidate) {
  if (!state.data || state.drag || !candidate.tile.isConnected) return;
  clearDragCandidate();
  const rect = candidate.tile.getBoundingClientRect();
  const ghost = candidate.tile.cloneNode(true);
  ghost.classList.add("site-drag-ghost");
  ghost.removeAttribute("data-site-id");
  ghost.setAttribute("aria-hidden", "true");
  ghost.querySelector("button").tabIndex = -1;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  document.body.append(ghost);
  state.drag = { id: candidate.tile.dataset.siteId, tile: candidate.tile, ghost,
    ids: visibleSites().map((site) => site.id), x: candidate.x, y: candidate.y,
    startX: candidate.x, startY: candidate.y, lastTarget: null, frame: null };
  setArranging(true);
  candidate.tile.classList.add("is-drag-source");
  document.body.classList.add("site-drag-active");
  state.suppressTileClickUntil = Date.now() + 600;
}

function moveSiteDrag(x, y) {
  const drag = state.drag;
  if (!drag) return;
  drag.x = x; drag.y = y;
  drag.ghost.style.transform = `translate(${x - drag.startX}px, ${y - drag.startY}px) scale(1.06) rotate(2deg)`;
  const target = document.elementFromPoint?.(x, y)?.closest(".site-tile");
  if (target && dom.entryList.contains(target) && target !== drag.tile && target.dataset.siteId !== drag.lastTarget) {
    const sourceSite = state.data.sites.find((site) => site.id === drag.id);
    const targetSite = state.data.sites.find((site) => site.id === target.dataset.siteId);
    if (sourceSite?.pinned === targetSite?.pinned) {
      const from = drag.ids.indexOf(drag.id);
      const to = drag.ids.indexOf(target.dataset.siteId);
      if (from >= 0 && to >= 0) {
        drag.ids.splice(from, 1);
        drag.ids.splice(to, 0, drag.id);
        const tiles = new Map(Array.from(dom.entryList.children).map((tile) => [tile.dataset.siteId, tile]));
        drag.ids.forEach((id) => dom.entryList.append(tiles.get(id)));
        drag.lastTarget = target.dataset.siteId;
      }
    }
  } else if (!target || target === drag.tile) drag.lastTarget = null;
  if (!drag.frame && typeof window.requestAnimationFrame === "function") {
    drag.frame = window.requestAnimationFrame(scrollSiteDrag);
  }
}

function scrollSiteDrag() {
  const drag = state.drag;
  if (!drag) return;
  drag.frame = null;
  const bottom = window.innerHeight - 72;
  const delta = drag.y < 110 ? -10 : drag.y > bottom ? 10 : 0;
  if (delta && document.documentElement.scrollHeight > window.innerHeight) {
    window.scrollBy(0, delta);
    moveSiteDrag(drag.x, drag.y);
  }
}

function finishSiteDrag(commit = true) {
  clearDragCandidate();
  const drag = state.drag;
  if (!drag) return;
  if (drag.frame) window.cancelAnimationFrame(drag.frame);
  drag.ghost.remove();
  drag.tile.classList.remove("is-drag-source");
  document.body.classList.remove("site-drag-active");
  state.drag = null;
  state.suppressTileClickUntil = Date.now() + 450;
  const changed = commit && applyVisibleSiteOrder(drag.ids);
  if (state.data) renderEntries();
  if (changed) showToast("站点顺序已保存");
}

function prepareSiteDrag(tile, x, y, kind) {
  clearDragCandidate();
  if (!tile || !state.data || visibleSites().length < 2) return;
  const candidate = { tile, x, y, kind, timer: null };
  state.dragCandidate = candidate;
  if (state.arranging) startSiteDrag(candidate);
  else candidate.timer = window.setTimeout(() => startSiteDrag(candidate), 360);
}

function bindSiteDragging() {
  dom.arrangeButton.addEventListener("click", () => { finishSiteDrag(true); setArranging(!state.arranging); });
  dom.entryList.addEventListener("contextmenu", (event) => event.preventDefault());
  dom.entryList.addEventListener("dragstart", (event) => event.preventDefault());
  dom.entryList.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    prepareSiteDrag(event.target.closest(".site-tile"), event.clientX, event.clientY, "pointer");
  });
  document.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const candidate = state.dragCandidate;
    if (candidate?.kind === "pointer" && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 8) startSiteDrag(candidate);
    if (state.drag) { event.preventDefault(); moveSiteDrag(event.clientX, event.clientY); }
  });
  document.addEventListener("pointerup", (event) => { if (event.pointerType !== "touch") finishSiteDrag(true); });
  document.addEventListener("pointercancel", (event) => { if (event.pointerType !== "touch") finishSiteDrag(false); });
  dom.entryList.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) { finishSiteDrag(false); return; }
    const touch = event.touches[0];
    prepareSiteDrag(event.target.closest(".site-tile"), touch.clientX, touch.clientY, "touch");
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 1) { finishSiteDrag(false); return; }
    const touch = event.touches[0];
    const candidate = state.dragCandidate;
    if (candidate?.kind === "touch" && Math.hypot(touch.clientX - candidate.x, touch.clientY - candidate.y) > 10) clearDragCandidate();
    if (state.drag) { event.preventDefault(); moveSiteDrag(touch.clientX, touch.clientY); }
  }, { passive: false });
  document.addEventListener("touchend", (event) => {
    if (state.drag) event.preventDefault();
    finishSiteDrag(true);
  }, { passive: false });
  document.addEventListener("touchcancel", () => finishSiteDrag(false));
  window.addEventListener("blur", () => finishSiteDrag(false));
  dom.entryList.addEventListener("keydown", (event) => {
    if (!state.arranging || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const tile = event.target.closest(".site-tile");
    const ids = visibleSites().map((site) => site.id);
    const from = ids.indexOf(tile?.dataset.siteId);
    const first = dom.entryList.firstElementChild?.getBoundingClientRect();
    const columns = first?.width ? Math.max(1, Math.round(dom.entryList.getBoundingClientRect().width / first.width)) : 3;
    const delta = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns}[event.key];
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const source = state.data.sites.find((site) => site.id === ids[from]);
    const target = state.data.sites.find((site) => site.id === ids[to]);
    if (source.pinned !== target.pinned) return;
    ids.splice(from, 1); ids.splice(to, 0, source.id);
    applyVisibleSiteOrder(ids); renderEntries();
    Array.from(dom.entryList.children).find((node) => node.dataset.siteId === source.id)?.querySelector("button").focus();
  });
}

function getViewingSite() {
  return state.data?.sites.find((site) => site.id === state.viewingSiteId) ?? null;
}

function openSiteDetail(siteId) {
  if (!state.data) return;
  state.viewingSiteId = siteId;
  renderSiteDetail();
  if (!dom.siteDetailDialog.open) dom.siteDetailDialog.showModal();
}

function renderSiteDetail() {
  const site = getViewingSite();
  if (!site) {
    if (dom.siteDetailDialog.open) dom.siteDetailDialog.close();
    state.viewingSiteId = null;
    return;
  }

  const tone = siteToneIndex(site);
  const group = getGroup(site.groupId);
  dom.siteDetailInitial.className = `site-detail-initial tone-${tone}`;
  dom.siteDetailInitial.textContent = siteInitial(site.name);
  dom.siteDetailKicker.textContent = group ? group.name : "未分组";
  dom.siteDetailTitle.textContent = site.name;
  dom.siteDetailPin.setAttribute("aria-pressed", site.pinned ? "true" : "false");
  dom.siteDetailPin.classList.toggle("is-active", site.pinned);
  dom.siteDetailPinLabel.textContent = site.pinned ? "取消常用" : "设为常用";

  const peers = state.data.sites
    .filter((item) => item.pinned === site.pinned)
    .sort((first, second) => first.order - second.order);
  const peerIndex = peers.findIndex((item) => item.id === site.id);
  dom.siteDetailMoveUp.disabled = peerIndex <= 0;
  dom.siteDetailMoveDown.disabled = peerIndex < 0 || peerIndex >= peers.length - 1;

  const endpointSection = makeElement("section", { className: "site-detail-section" });
  endpointSection.append(makeElement("h3", { text: "连接信息" }));
  const endpoints = makeElement("div", { className: "endpoint-list detail-endpoint-list" });
  endpoints.append(makeEndpointRow("网站", site.websiteUrl, true));
  endpointSection.append(endpoints);

  const sections = [endpointSection];
  const balanceSection = makeBalanceSection(site);
  if (balanceSection) sections.unshift(balanceSection);
  const tokenBalanceDetails = makeElement("details", {className: "token-balance-details"});
  tokenBalanceDetails.append(makeElement("summary", {text: `令牌额度 · ${formatBalanceValue(normalizeBalance(site.tokenBalance))}（非账户余额）`}), makeBalanceSection(site, "token"));
  sections.splice(1, 0, tokenBalanceDetails);
  const baseUrls = getBaseUrls(site);
  if (baseUrls.length) {
    const baseUrlDetails = makeElement("details", { className: "base-url-details" });
    const summary = makeElement("summary", { className: "base-url-summary" }, [
      makeElement("span", { text: `Base URL · ${baseUrls.length}` }),
      makeElement("span", { className: "base-url-summary-hint", text: "点开查看" }),
      createIcon("down")
    ]);
    const baseUrlList = makeElement("div", { className: "endpoint-list detail-endpoint-list base-url-detail-list" });
    baseUrls.forEach((baseUrl, index) => {
      baseUrlList.append(makeEndpointRow(baseUrl.name || defaultBaseUrlName(index), baseUrl.value, false));
    });
    baseUrlDetails.append(summary, baseUrlList);
    sections.push(baseUrlDetails);
  }

  const tokenSection = makeElement("section", { className: "site-detail-section" });
  tokenSection.append(makeElement("h3", { text: "令牌" }));
  const tokenList = makeElement("div", { className: "token-list detail-token-list" });
  site.tokens.forEach((token) => tokenList.append(makeTokenRow(site, token)));
  tokenSection.append(tokenList);

  sections.push(tokenSection);
  sections.push(makeSiteNotesButton(site));
  dom.siteDetailBody.replaceChildren(...sections);
}

function toggleSitePinned(site) {
  site.pinned = !site.pinned;
  site.updatedAt = nowIso();
  scheduleSave();
  renderGroupFilters();
  refreshSiteViews();
  showToast(site.pinned ? "已设为常用并置顶" : "已取消常用");
}

function refreshSiteViews() {
  renderEntries();
  if (state.mainView === "overview") renderOverview();
  if (dom.siteDetailDialog.open) renderSiteDetail();
  if (dom.activityDialog.open) renderSiteActivity();
}

function makeEndpointRow(label, value, allowOpen) {
  const safeValue = value || "未填写";
  const actions = makeElement("div", { className: "endpoint-actions" });
  const copyButton = makeIconButton("copy", `复制${label}`);
  copyButton.disabled = !value;
  copyButton.addEventListener("click", () => copyText(value, `${label}已复制`));
  actions.append(copyButton);
  if (allowOpen) {
    const openButton = makeIconButton("external", "打开网站");
    openButton.disabled = !value;
    openButton.addEventListener("click", () => {
      if (value) window.open(value, "_blank", "noopener,noreferrer");
    });
    actions.append(openButton);
  }
  return makeElement("div", { className: "endpoint-row" }, [
    makeElement("span", { className: "endpoint-label", text: label, title: label }),
    makeElement("span", { className: "endpoint-value", text: safeValue, title: safeValue }),
    actions
  ]);
}

function maskSecret(secret) {
  if (secret.length <= 8) return "••••••••";
  const prefixLength = secret.startsWith("sk-") ? Math.min(5, secret.length - 4) : Math.min(3, secret.length - 4);
  return `${secret.slice(0, prefixLength)}${"•".repeat(Math.min(12, secret.length - prefixLength - 4))}${secret.slice(-4)}`;
}

function makeTokenRow(site, token) {
  const isRevealed = state.revealedTokens.has(token.id);
  const secret = makeElement("span", {
    className: `token-secret${isRevealed ? " is-revealed" : ""}`,
    text: isRevealed ? token.value : maskSecret(token.value)
  });

  const revealButton = makeIconButton(isRevealed ? "eye-off" : "eye", isRevealed ? "隐藏令牌" : "显示令牌");
  revealButton.addEventListener("click", () => {
    if (isRevealed) state.revealedTokens.delete(token.id);
    else state.revealedTokens.add(token.id);
    refreshSiteViews();
  });
  const copyButton = makeIconButton("copy", "复制令牌");
  copyButton.addEventListener("click", () => copyText(token.value, `${token.name}已复制`));
  const configButton = makeIconButton("code", "复制 Base URL 与令牌");
  configButton.addEventListener("click", () => copyCallConfig(site, token));
  const actions = makeElement("div", { className: "token-actions" }, [revealButton, copyButton, configButton]);

  return makeElement("div", { className: "token-row" }, [
    makeElement("span", { className: "token-name", text: token.name, title: token.name }),
    secret,
    actions
  ]);
}

async function copyText(value, message = "已复制") {
  if (!value) return;
  try {
    if (window.BlueEyeNative?.copyText) {
      window.BlueEyeNative.copyText(value);
    } else if (window.BlueEyeWeb?.copyText) {
      if (!await window.BlueEyeWeb.copyText(value)) return;
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    showToast(message);
  } catch (error) {
    console.error(error);
    showToast("没有拿到剪贴板权限，请长按内容复制", "error");
  }
}

function copyCallConfig(site, token) {
  const baseUrl = getPrimaryBaseUrl(site);
  const config = baseUrl ? `BASE_URL=${baseUrl}\nAPI_KEY=${token.value}` : `API_KEY=${token.value}`;
  copyText(config, `${token.name}的调用配置已复制`);
}

function moveSite(siteId, direction) {
  const site = state.data.sites.find((item) => item.id === siteId);
  if (!site) return;
  const peers = state.data.sites
    .filter((item) => item.pinned === site.pinned)
    .sort((a, b) => a.order - b.order);
  const index = peers.findIndex((item) => item.id === siteId);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= peers.length) {
    showToast(direction < 0 ? "已经在这一组最前面啦" : "已经在这一组最后面啦");
    return;
  }
  peers.forEach((item, itemIndex) => {
    item.order = itemIndex;
  });
  const other = peers[nextIndex];
  const previousOrder = site.order;
  site.order = other.order;
  other.order = previousOrder;
  site.updatedAt = nowIso();
  scheduleSave();
  refreshSiteViews();
}

async function deleteSite(siteId) {
  const site = state.data.sites.find((item) => item.id === siteId);
  if (!site) return;
  const confirmed = await askConfirm({
    title: `删除“${site.name}”？`,
    message: `其中 ${site.tokens.length} 个令牌也会一起删除。导出的旧备份不受影响。`,
    acceptLabel: "删除条目",
    danger: true
  });
  if (!confirmed) return;
  if (dom.siteDetailDialog.open && state.viewingSiteId === siteId) dom.siteDetailDialog.close();
  state.viewingSiteId = null;
  state.data.sites = state.data.sites.filter((item) => item.id !== siteId);
  site.tokens.forEach((token) => state.revealedTokens.delete(token.id));
  scheduleSave();
  renderAll();
  showToast("条目已删除");
}

function openEditor(site = null, draft = null) {
  if (!state.data) return;
  if (dom.siteDetailDialog.open) dom.siteDetailDialog.close();
  state.viewingSiteId = null;
  state.editingSiteId = site?.id ?? null;
  state.smartDraft = Boolean(draft);
  const source =
    draft ||
    site || {
      name: "",
      websiteUrl: "",
      baseUrl: "",
      baseUrls: [],
      groupName: "",
      pinned: false,
      tokens: [{ name: "", value: "" }]
    };

  dom.editorKicker.textContent = site ? "编辑条目" : draft ? "识别结果" : "新条目";
  dom.editorTitle.textContent = site ? `修改“${site.name}”` : "收好一组 API 钥匙";
  dom.smartResultNote.hidden = !draft;
  dom.editorError.textContent = "";
  dom.siteNameInput.value = source.name || "";
  dom.websiteUrlInput.value = source.websiteUrl || "";
  dom.sitePinnedInput.checked = Boolean(source.pinned);
  dom.siteGroupInput.value = draft?.groupName || getGroup(site?.groupId)?.name || "";
  dom.baseUrlEditorList.replaceChildren();
  const baseUrls = source.baseUrls?.length
    ? source.baseUrls
    : source.baseUrl
      ? [{ name: "", value: source.baseUrl }]
      : [];
  if (baseUrls.length) baseUrls.forEach((baseUrl) => addBaseUrlEditorRow(baseUrl));
  else addBaseUrlEditorRow();
  dom.tokenEditorList.replaceChildren();
  const tokens = source.tokens?.length ? source.tokens : [{ name: "", value: "" }];
  tokens.forEach((token) => addTokenEditorRow(token));
  renderGroupOptions();
  dom.editorDialog.showModal();
  window.setTimeout(() => {
    const preferred = draft ? dom.siteNameInput : site ? dom.siteNameInput : dom.websiteUrlInput;
    preferred.focus();
  }, 70);
}

function makeInputClearButton(input, label) {
  const button = makeIconButton("x", label, "field-clear-button");
  button.addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  });
  return button;
}

function wrapClearableInput(input, label) {
  return makeElement("span", { className: "clearable-input-wrap" }, [input, makeInputClearButton(input, label)]);
}

function addBaseUrlEditorRow(baseUrl = {}) {
  const row = makeElement("div", {
    className: "base-url-editor-row",
    attrs: { "data-base-url-id": baseUrl.id || uid("draft-base") }
  });
  const nameField = makeElement("label", { className: "field base-url-editor-name" });
  const nameInput = makeElement("input", {
    attrs: { maxlength: 50, placeholder: "例如：官方线路、备用线路" }
  });
  nameInput.className = "base-url-name-input";
  nameInput.value = baseUrl.name || "";
  nameField.append(
    makeElement("span", { text: "地址备注（可不填）" }),
    wrapClearableInput(nameInput, "清空地址备注")
  );

  const valueField = makeElement("label", { className: "field" });
  const valueInput = makeElement("input", {
    attrs: {
      inputmode: "url",
      autocapitalize: "none",
      spellcheck: "false",
      placeholder: "https://api.example.com/v1"
    }
  });
  valueInput.className = "base-url-value-input";
  valueInput.value = baseUrl.value || "";
  valueField.append(
    makeElement("span", { text: "Base URL" }),
    wrapClearableInput(valueInput, "清空 Base URL")
  );

  const removeButton = makeIconButton("trash", "移除这个 Base URL", "mini-icon-button remove-base-url-button");
  removeButton.addEventListener("click", () => row.remove());
  row.append(nameField, valueField, removeButton);
  dom.baseUrlEditorList.append(row);
}

function addTokenEditorRow(token = {}) {
  const row = makeElement("div", {
    className: "token-editor-row",
    attrs: { "data-token-id": token.id || uid("draft-token") }
  });
  const nameField = makeElement("label", { className: "field token-editor-name" });
  const nameInput = makeElement("input", { attrs: { maxlength: 50, placeholder: "例如：写作用" } });
  nameInput.className = "token-name-input";
  nameInput.value = token.name || "";
  nameField.append(makeElement("span", { text: "令牌备注（可不填）" }), wrapClearableInput(nameInput, "清空令牌备注"));

  const valueField = makeElement("label", { className: "field" });
  valueField.append(makeElement("span", { text: "API 令牌 / 密码" }));
  const valueWrap = makeElement("div", { className: "token-value-wrap" });
  const valueInput = makeElement("input", {
    attrs: {
      type: "password",
      autocomplete: "off",
      autocapitalize: "none",
      spellcheck: "false",
      placeholder: "sk-…"
    }
  });
  valueInput.className = "token-value-input";
  valueInput.value = token.value || "";
  const revealButton = makeIconButton("eye", "显示或隐藏令牌");
  revealButton.addEventListener("click", () => {
    const showing = valueInput.type === "text";
    valueInput.type = showing ? "password" : "text";
    revealButton.replaceChildren(createIcon(showing ? "eye" : "eye-off"));
  });
  const valueActions = makeElement("span", { className: "input-action-stack" }, [
    makeInputClearButton(valueInput, "清空令牌"),
    revealButton
  ]);
  valueWrap.append(valueInput, valueActions);
  valueField.append(valueWrap);

  const removeButton = makeIconButton("trash", "移除这个令牌", "mini-icon-button remove-token-button");
  removeButton.addEventListener("click", () => {
    if (dom.tokenEditorList.children.length <= 1) {
      valueInput.value = "";
      nameInput.value = "";
      showToast("每个网站至少保留一个令牌输入框");
      return;
    }
    row.remove();
  });

  row.append(nameField, valueField, removeButton);
  dom.tokenEditorList.append(row);
}

function sanitizeUrl(raw, label) {
  let value = raw.trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label}看起来不是有效网址`);
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(`${label}只支持 http 或 https 地址`);
  }
  return parsed.toString();
}

function normalizedBase(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.origin.toLocaleLowerCase()}${path}${url.search}`.replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/+$/, "").toLocaleLowerCase();
  }
}

function deriveWebsiteUrl(baseUrl) {
  try {
    return `${new URL(baseUrl).origin}/`;
  } catch {
    return "";
  }
}

function deriveBaseUrl(websiteUrl) {
  try {
    const url = new URL(websiteUrl);
    const path = url.pathname.replace(/\/+$/, "");
    if (!/\/v\d+$/i.test(path)) url.pathname = `${path}/v1`.replace(/^\/\//, "/");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function readBaseUrlEditorRows() {
  return [...dom.baseUrlEditorList.querySelectorAll(".base-url-editor-row")]
    .map((row, index) => ({
      id: row.dataset.baseUrlId.startsWith("base_") ? row.dataset.baseUrlId : uid("base"),
      name: row.querySelector(".base-url-name-input").value.trim() || defaultBaseUrlName(index),
      value: row.querySelector(".base-url-value-input").value.trim()
    }))
    .filter((baseUrl) => baseUrl.value);
}

function readTokenEditorRows() {
  return [...dom.tokenEditorList.querySelectorAll(".token-editor-row")]
    .map((row, index) => ({
      id: row.dataset.tokenId.startsWith("token_") ? row.dataset.tokenId : uid("token"),
      name: row.querySelector(".token-name-input").value.trim() || defaultTokenName(index),
      value: row.querySelector(".token-value-input").value.trim()
    }))
    .filter((token) => token.value);
}

function canonicalHost(value) {
  try {
    const hostname = new URL(value).hostname.toLocaleLowerCase().replace(/^www\./, "");
    if (hostname === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
      return hostname;
    }
    const parts = hostname.split(".").filter(Boolean);
    if (parts.length <= 2) return hostname;
    const publicSuffix = parts.slice(-2).join(".");
    const multiLevelSuffixes = new Set([
      "com.cn",
      "net.cn",
      "org.cn",
      "co.uk",
      "com.au",
      "co.jp",
      "github.io",
      "pages.dev",
      "workers.dev",
      "vercel.app",
      "netlify.app",
      "herokuapp.com",
      "onrender.com",
      "azurewebsites.net",
      "chatgpt.site"
    ]);
    return multiLevelSuffixes.has(publicSuffix) ? parts.slice(-3).join(".") : publicSuffix;
  } catch {
    return "";
  }
}

function normalizedSiteName(value) {
  const name = String(value || "").trim();
  if (!name || /^未命名站点\s+\d+$/i.test(name)) return "";
  return name.toLocaleLowerCase().replace(/[\s\-_.,，。/\\:：;；'"`()（）【】\[\]{}<>]+/g, "");
}

function findMatchingMainSite({ name, websiteUrl, baseUrls }) {
  const targetName = normalizedSiteName(name);
  const targetWebsite = websiteUrl ? normalizedBase(websiteUrl) : "";
  const targetBases = new Set(baseUrls.map((item) => normalizedBase(item.value)));
  const targetHosts = new Set([websiteUrl, ...baseUrls.map((item) => item.value)].map(canonicalHost).filter(Boolean));
  let best = null;
  let bestScore = 0;

  state.data.sites.forEach((site) => {
    let score = 0;
    if (targetName && normalizedSiteName(site.name) === targetName) score = Math.max(score, 100);
    if (targetWebsite && normalizedBase(site.websiteUrl) === targetWebsite) score = Math.max(score, 95);
    if (getBaseUrls(site).some((item) => targetBases.has(normalizedBase(item.value)))) score = Math.max(score, 98);
    const existingHosts = [site.websiteUrl, ...getBaseUrls(site).map((item) => item.value)]
      .map(canonicalHost)
      .filter(Boolean);
    if (existingHosts.some((host) => targetHosts.has(host))) score = Math.max(score, 78);
    if (score > bestScore) {
      best = site;
      bestScore = score;
    }
  });
  return bestScore >= 78 ? best : null;
}

function mergeIntoSite(site, draft, timestamp) {
  let addedBaseUrls = 0;
  let addedTokens = 0;
  const existingBases = getBaseUrls(site);
  draft.baseUrls.forEach((incoming) => {
    const existing = existingBases.find((item) => normalizedBase(item.value) === normalizedBase(incoming.value));
    if (existing) {
      if (/^地址\s+\d+$/.test(existing.name) && incoming.name && !/^地址\s+\d+$/.test(incoming.name)) {
        existing.name = incoming.name;
      }
      existing.updatedAt = timestamp;
    } else {
      existingBases.push({ ...incoming, id: uid("base"), createdAt: timestamp, updatedAt: timestamp });
      addedBaseUrls += 1;
    }
  });
  site.baseUrls = existingBases;
  site.baseUrl = existingBases[0]?.value || "";

  draft.tokens.forEach((incoming) => {
    const existing = site.tokens.find((item) => item.value === incoming.value);
    if (existing) {
      if (/^令牌\s+\d+$/.test(existing.name) && incoming.name && !/^令牌\s+\d+$/.test(incoming.name)) {
        existing.name = incoming.name;
      }
      existing.updatedAt = timestamp;
    } else {
      site.tokens.push({ ...incoming, id: uid("token"), createdAt: timestamp, updatedAt: timestamp });
      addedTokens += 1;
    }
  });

  if (!site.websiteUrl && draft.websiteUrl) site.websiteUrl = draft.websiteUrl;
  if (draft.groupId) site.groupId = draft.groupId;
  if (draft.pinned) site.pinned = true;
  site.updatedAt = timestamp;
  return { addedBaseUrls, addedTokens };
}

function createSiteRecord(draft, timestamp) {
  const nextOrder = Math.max(-1, ...state.data.sites.map((site) => site.order)) + 1;
  state.data.sites.push({
    id: uid("site"),
    name: draft.name || defaultSiteName(state.data.sites.length),
    websiteUrl: draft.websiteUrl,
    baseUrl: draft.baseUrls[0]?.value || "",
    baseUrls: draft.baseUrls.map((baseUrl) => ({
      ...baseUrl,
      id: uid("base"),
      createdAt: timestamp,
      updatedAt: timestamp
    })),
    groupId: draft.groupId,
    pinned: draft.pinned,
    tags: [],
    note: "",
    order: nextOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
    balance: normalizeBalance(null),
    tokenBalance: normalizeBalance({mode:"token"}),
    activity: normalizeSiteActivity(null, normalizeBalance(null)),
    tokens: draft.tokens.map((token) => ({
      ...token,
      id: uid("token"),
      createdAt: timestamp,
      updatedAt: timestamp
    }))
  });
}

async function saveEditor(event) {
  event.preventDefault();
  dom.editorError.textContent = "";
  try {
    let websiteUrl = sanitizeUrl(dom.websiteUrlInput.value, "网站网址");
    const rawBaseUrls = readBaseUrlEditorRows().map((baseUrl) => ({
      ...baseUrl,
      value: sanitizeUrl(baseUrl.value, "Base URL")
    }));
    if (!websiteUrl && rawBaseUrls.length) websiteUrl = deriveWebsiteUrl(rawBaseUrls[0].value);
    if (!websiteUrl && !rawBaseUrls.length) throw new Error("请至少填写网站网址或一条 Base URL");
    if (!rawBaseUrls.length) {
      rawBaseUrls.push({ id: uid("base"), name: defaultBaseUrlName(0), value: deriveBaseUrl(websiteUrl) });
    }
    const uniqueBaseUrls = [];
    const seenBaseUrls = new Set();
    rawBaseUrls.forEach((baseUrl) => {
      const normalized = normalizedBase(baseUrl.value);
      if (!seenBaseUrls.has(normalized)) {
        seenBaseUrls.add(normalized);
        uniqueBaseUrls.push(baseUrl);
      }
    });
    const tokens = readTokenEditorRows();
    if (!tokens.length) throw new Error("请至少填写一个令牌密码");

    const uniqueTokens = [];
    const seenSecrets = new Set();
    tokens.forEach((token) => {
      if (!seenSecrets.has(token.value)) {
        seenSecrets.add(token.value);
        uniqueTokens.push(token);
      }
    });

    const existingSite = state.editingSiteId
      ? state.data.sites.find((site) => site.id === state.editingSiteId)
      : null;
    const requestedGroupName = dom.siteGroupInput.value;
    const timestamp = nowIso();
    const requestedName = dom.siteNameInput.value.trim();
    const draft = {
      name: requestedName,
      websiteUrl,
      baseUrls: uniqueBaseUrls,
      groupId: null,
      pinned: dom.sitePinnedInput.checked,
      tokens: uniqueTokens
    };

    if (existingSite) {
      const groupId = ensureGroup(requestedGroupName);
      existingSite.name =
        requestedName || existingSite.name || defaultSiteName(state.data.sites.indexOf(existingSite));
      existingSite.websiteUrl = websiteUrl;
      existingSite.baseUrl = uniqueBaseUrls[0]?.value || "";
      existingSite.baseUrls = uniqueBaseUrls.map((baseUrl) => {
        const previous = getBaseUrls(existingSite).find((item) => item.id === baseUrl.id);
        return {
          ...baseUrl,
          createdAt: previous?.createdAt || timestamp,
          updatedAt: timestamp
        };
      });
      existingSite.groupId = groupId;
      existingSite.pinned = dom.sitePinnedInput.checked;
      existingSite.tokens = uniqueTokens.map((token) => {
        const previous = existingSite.tokens.find((item) => item.id === token.id);
        return {
          ...token,
          createdAt: previous?.createdAt || timestamp,
          updatedAt: timestamp
        };
      });
      existingSite.updatedAt = timestamp;
      showToast("条目已更新");
    } else {
      const matchingSite = findMatchingMainSite(draft);
      if (matchingSite) {
        const decision = await askChoice({
          title: `“${matchingSite.name}”已经记录过`,
          message: "看起来是同一个主站。更新会合并新的 Base URL 和令牌，不会删掉原内容；也可以仍然新建一条。",
          acceptLabel: "更新已有",
          cancelLabel: "仍然新建"
        });
        if (decision === null) return;
        draft.groupId = ensureGroup(requestedGroupName);
        if (decision === "confirm") {
          const merged = mergeIntoSite(matchingSite, draft, timestamp);
          const additions = [
            merged.addedBaseUrls ? `${merged.addedBaseUrls} 条 Base URL` : "",
            merged.addedTokens ? `${merged.addedTokens} 个令牌` : ""
          ].filter(Boolean);
          showToast(additions.length ? `已更新并加入 ${additions.join("、")}` : "已有内容相同，没有重复加入");
        } else {
          createSiteRecord(draft, timestamp);
          showToast("已按你的选择新建一条");
        }
      } else {
        draft.groupId = ensureGroup(requestedGroupName);
        createSiteRecord(draft, timestamp);
        showToast("新的 API 钥匙已经收好");
      }
    }

    dom.editorDialog.close();
    state.editingSiteId = null;
    state.smartDraft = false;
    scheduleSave();
    renderAll();
  } catch (error) {
    dom.editorError.textContent = error.message || "请检查填写内容";
  }
}

function extractLabeledValues(raw) {
  const aliases = [
    { key: "tokenName", pattern: "令牌(?:备注|名称|名)|token\\s*name|key\\s*name|密钥名" },
    { key: "token", pattern: "令牌密码|api\\s*key|apikey|access\\s*token|token|密钥|密码" },
    { key: "baseUrl", pattern: "base\\s*url|接口地址|api\\s*url|请求地址|url" },
    { key: "websiteUrl", pattern: "网站网址|网站地址|官网|网址" },
    { key: "siteName", pattern: "网站名称|网站名|站点名|名称" },
    { key: "groupName", pattern: "分组|分类" }
  ];
  const combined = aliases.map((item) => `(${item.pattern})`).join("|");
  const regex = new RegExp(`(?:^|[\\s,，;；|])(?:${combined})\\s*[:：=]?\\s*`, "gi");
  const matches = [...raw.matchAll(regex)];
  const values = {};
  matches.forEach((match, index) => {
    const labelText = match[0].toLocaleLowerCase();
    const alias = aliases.find((item) => new RegExp(item.pattern, "i").test(labelText));
    if (!alias) return;
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : raw.length;
    const value = raw
      .slice(start, end)
      .replace(/^[\s,，;；|]+|[\s,，;；|]+$/g, "")
      .trim();
    if (value) values[alias.key] = value;
  });
  return values;
}

function cleanSecret(value) {
  return String(value || "")
    .trim()
    .replace(/^[\[（(【<{"'`]+/, "")
    .replace(/[\]）)】>}"'`。.!！?？]+$/, "");
}

function looksLikeSecret(value) {
  const cleaned = cleanSecret(value);
  if (cleaned.length < 16 || /https?:\/\//i.test(cleaned) || /[\u3400-\u9fff]/.test(cleaned)) return false;
  if (/^(sk-|key-|pk-|api[_-]?|AIza|ghp_|glpat-|hf_|eyJ|Bearer[_-]?)/i.test(cleaned)) return true;
  if (cleaned.length < 24 || /\s/.test(cleaned)) return false;
  const allowed = cleaned.match(/[A-Za-z0-9._~+/=-]/g)?.length || 0;
  return allowed / cleaned.length > 0.92;
}

function urlScore(value) {
  try {
    const url = new URL(value);
    let score = url.pathname.length > 1 ? 1 : 0;
    if (/\/v\d+(?:\/|$)/i.test(url.pathname)) score += 8;
    if (/\/api(?:\/|$)/i.test(url.pathname)) score += 5;
    if (/api[.-]/i.test(url.hostname)) score += 3;
    return score;
  } catch {
    return 0;
  }
}

function extractUrls(value) {
  return [...String(value || "").matchAll(/https?:\/\/[^\s,，;；|"'<>]+/gi)].map((match) =>
    match[0].replace(/[)\]}>。.]+$/g, "")
  );
}

function recognitionLabelPattern() {
  return /(?:^|\s)(?:网站名称|网站名|站点名|名称|网站网址|网站地址|官网|网址|base\s*url|接口地址|api\s*url|请求地址|地址备注|url\s*(?:备注|名称|名)|令牌备注|令牌名称|令牌名|token\s*name|key\s*name|密钥名|令牌密码|api\s*key|apikey|access\s*token|token|令牌|密钥|密码|分组|分类)\s*[:：=]?|[:：=]/gi;
}

function inferSiteName(input, labeled, urls, secrets) {
  if (labeled.siteName) return labeled.siteName.trim();
  const signalPositions = [
    ...urls.map((url) => input.indexOf(url)),
    ...secrets.map((secret) => input.indexOf(secret))
  ].filter((position) => position >= 0);
  if (!signalPositions.length) return "";
  const prefix = input
    .slice(0, Math.min(...signalPositions))
    .replace(recognitionLabelPattern(), " ")
    .replace(/^[\s,，;；|]+|[\s,，;；|]+$/g, " ")
    .trim();
  if (!prefix || prefix.length > 60 || /https?:\/\//i.test(prefix)) return "";
  return prefix;
}

function inferTokenNames(input, secrets, labeled) {
  const names = Array(secrets.length).fill("");
  const labeledNames = String(labeled.tokenName || "")
    .split(/[,，;；|\t\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (labeledNames.length) {
    labeledNames.slice(0, secrets.length).forEach((name, index) => {
      names[index] = name.slice(0, 50);
    });
    if (labeledNames.length === 1 && secrets.length === 1) return names;
  }

  const events = [];
  const fields = input
    .split(/[,，;；|\t\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const nonTokenField = /^(?:网站名称|网站名|站点名|名称|网站网址|网站地址|官网|网址|base\s*url|接口地址|api\s*url|请求地址|url(?:\s*(?:备注|名称|名))?|地址备注|分组|分类)\s*[:：=]?/i;
  const addText = (text) => {
    if (nonTokenField.test(text.trim())) return;
    const leftover = text
      .replace(recognitionLabelPattern(), " ")
      .replace(/[\[\]【】()（）<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (
      leftover &&
      leftover.length <= 50 &&
      !/^https?:\/\//i.test(leftover)
    ) {
      events.push({ type: "text", value: leftover });
    }
  };
  fields.forEach((field) => {
    const signals = [];
    const addSignal = (value, type, index) => {
      let from = 0, start;
      while ((start = field.indexOf(value, from)) >= 0) {
        signals.push({start, end:start + value.length, type, index});
        from = start + value.length;
      }
    };
    extractUrls(field).forEach((url) => addSignal(url, "url"));
    secrets.forEach((secret, index) => addSignal(secret, "secret", index));
    signals.sort((a, b) => a.start - b.start || b.end - a.end);
    let cursor = 0;
    for (const signal of signals) {
      if (signal.start < cursor) continue;
      addText(field.slice(cursor, signal.start));
      if (signal.type === "secret") events.push({type:"secret", index:signal.index});
      cursor = signal.end;
    }
    addText(field.slice(cursor));
  });

  const firstSecret = events.findIndex((event) => event.type === "secret");
  if (firstSecret < 0) return names;
  const relevant = events.slice(firstSecret);
  const firstText = relevant.findIndex((event) => event.type === "text");
  if (firstText >= secrets.length && relevant.slice(0, firstText).every((event) => event.type === "secret")) {
    const trailingNames = relevant.slice(firstText).filter((event) => event.type === "text");
    if (trailingNames.length >= secrets.length) {
      secrets.forEach((_, index) => {
        if (!names[index]) names[index] = trailingNames[index].value.slice(0, 50);
      });
      return names;
    }
  }

  relevant.forEach((event, index) => {
    if (event.type !== "secret" || names[event.index]) return;
    const next = relevant[index + 1];
    if (next?.type === "text") names[event.index] = next.value.slice(0, 50);
  });
  return names;
}

function parseSmartInput(raw) {
  const input = raw.trim();
  if (!input) throw new Error("先贴一点内容进来吧");
  const labeled = extractLabeledValues(input);
  const urls = extractUrls(input);
  const uniqueUrls = [...new Set(urls)];

  const chunks = input
    .split(/[\s,，;；|\t\r\n]+/)
    .map(cleanSecret)
    .filter(Boolean);
  const detectedSecrets = chunks.filter(looksLikeSecret);
  const labeledSecrets = labeled.token
    ? labeled.token
        .split(/[\s,，;；|\t\r\n]+/)
        .map(cleanSecret)
        .filter(looksLikeSecret)
    : [];
  const secrets = [...new Set([...detectedSecrets, ...labeledSecrets])];
  if (!uniqueUrls.length) throw new Error("还没认出网址，请补一条以 http 开头的网站网址或 Base URL");
  if (!secrets.length) throw new Error("还没认出令牌。长令牌可以直接粘贴，也可以稍后规整填写");

  const explicitWebsiteUrls = extractUrls(labeled.websiteUrl);
  const explicitBaseUrls = extractUrls(labeled.baseUrl);
  let websiteUrl = explicitWebsiteUrls[0] || "";
  let baseUrlValues = [...explicitBaseUrls];
  if (!websiteUrl && explicitBaseUrls.length) {
    websiteUrl = deriveWebsiteUrl(explicitBaseUrls[0]);
    uniqueUrls.forEach((url) => {
      if (!baseUrlValues.includes(url)) baseUrlValues.push(url);
    });
  } else if (!websiteUrl && uniqueUrls.length === 1) {
    if (explicitBaseUrls.length || urlScore(uniqueUrls[0]) > 0) {
      baseUrlValues = [uniqueUrls[0]];
      websiteUrl = deriveWebsiteUrl(uniqueUrls[0]);
    } else {
      websiteUrl = uniqueUrls[0];
      baseUrlValues = [deriveBaseUrl(uniqueUrls[0])];
    }
  } else {
    if (!websiteUrl) websiteUrl = [...uniqueUrls].sort((a, b) => urlScore(a) - urlScore(b))[0];
    uniqueUrls.forEach((url) => {
      if (url !== websiteUrl && !baseUrlValues.includes(url)) baseUrlValues.push(url);
    });
    if (!baseUrlValues.length && websiteUrl) baseUrlValues.push(deriveBaseUrl(websiteUrl));
  }

  const name = inferSiteName(input, labeled, uniqueUrls, secrets);
  const groupName = (labeled.groupName || "").trim();
  const tokenNames = inferTokenNames(input, secrets, labeled);
  const normalizedWebsiteUrl = sanitizeUrl(websiteUrl, "网站网址");
  const normalizedBaseUrls = [...new Set(baseUrlValues.filter(Boolean).map((value) => sanitizeUrl(value, "Base URL")))];
  if (!normalizedBaseUrls.length) normalizedBaseUrls.push(deriveBaseUrl(normalizedWebsiteUrl));

  return {
    name,
    websiteUrl: normalizedWebsiteUrl,
    baseUrl: normalizedBaseUrls[0],
    baseUrls: normalizedBaseUrls.map((value) => ({ name: "", value })),
    groupName,
    pinned: false,
    tokens: secrets.map((secret, index) => ({
      name: tokenNames[index] || "",
      value: secret
    }))
  };
}

function openSmartDialog() {
  dom.smartInput.value = "";
  dom.smartError.textContent = "";
  dom.smartDialog.showModal();
  window.setTimeout(() => dom.smartInput.focus(), 60);
}

function handleSmartSubmit(event) {
  event.preventDefault();
  dom.smartError.textContent = "";
  try {
    const draft = parseSmartInput(dom.smartInput.value);
    dom.smartDialog.close();
    openEditor(null, draft);
  } catch (error) {
    dom.smartError.textContent = error.message || "这段信息暂时没认出来";
  }
}

async function pasteFromClipboard() {
  try {
    let text = "";
    if (window.BlueEyeNative?.readClipboard) {
      text = window.BlueEyeNative.readClipboard();
    } else {
      if (!navigator.clipboard?.readText) throw new Error("UNAVAILABLE");
      text = await navigator.clipboard.readText();
    }
    if (!text) throw new Error("EMPTY");
    dom.smartInput.value = text;
    dom.smartInput.focus();
    showToast("已经贴进来了");
  } catch {
    dom.smartInput.focus();
    showToast("浏览器没允许读取剪贴板，请长按输入框粘贴", "error", 3200);
  }
}

function renderSettingsSummary() {
  if (!state.data) return;
  dom.themeSelect.value = state.data.settings.theme;
  dom.autoLockSelect.value = String(state.data.settings.autoLockMinutes);
  dom.balanceAutoRefresh.checked = state.data.settings.balanceAutoRefresh;
  dom.balanceAutoRefresh.disabled = !supportsBalanceQuery();
  dom.settingsSiteCount.textContent = String(state.data.sites.length);
  dom.settingsTokenCount.textContent = String(
    state.data.sites.reduce((total, site) => total + site.tokens.length, 0)
  );
  dom.backupStatus.textContent = state.data.settings.lastBackupAt
    ? `上次导出：${formatDateTime(state.data.settings.lastBackupAt)}`
    : "尚未导出过备份";
  updateBiometricUi();
}

function openSettings() {
  renderSettingsSummary();
  renderGroupManager();
  dom.settingsDialog.showModal();
  dom.settingsDialog.scrollTop = 0;
  $("settings-scroll").scrollTop = 0;
  dom.settingsDialog.querySelector(".dialog-close").focus({ preventScroll: true });
}

function renderGroupManager() {
  dom.groupManager.replaceChildren();
  const groups = [...state.data.groups].sort((a, b) => a.order - b.order);
  if (!groups.length) {
    dom.groupManager.append(
      makeElement("p", {
        className: "dialog-help",
        text: "还没有分组。也可以在新增条目时直接输入一个新名字。"
      })
    );
    return;
  }
  groups.forEach((group) => {
    const input = makeElement("input", {
      attrs: { maxlength: 30, "aria-label": `修改分组 ${group.name}` }
    });
    input.value = group.name;
    input.addEventListener("change", () => renameGroup(group.id, input.value));
    const deleteButton = makeIconButton("trash", `删除分组 ${group.name}`);
    deleteButton.addEventListener("click", () => deleteGroup(group.id));
    dom.groupManager.append(makeElement("div", { className: "managed-group" }, [input, deleteButton]));
  });
}

function renameGroup(groupId, nextName) {
  const group = getGroup(groupId);
  if (!group) return;
  const cleaned = nextName.trim().slice(0, 30);
  if (!cleaned) {
    renderGroupManager();
    showToast("分组名不能为空", "error");
    return;
  }
  const duplicate = state.data.groups.find(
    (item) => item.id !== groupId && item.name.toLocaleLowerCase() === cleaned.toLocaleLowerCase()
  );
  if (duplicate) {
    state.data.sites.forEach((site) => {
      if (site.groupId === groupId) site.groupId = duplicate.id;
    });
    state.data.groups = state.data.groups.filter((item) => item.id !== groupId);
    showToast("同名分组已经合并");
  } else {
    group.name = cleaned;
    showToast("分组名已更新");
  }
  scheduleSave();
  renderAll();
  renderGroupManager();
}

async function deleteGroup(groupId) {
  const group = getGroup(groupId);
  if (!group) return;
  const usedCount = state.data.sites.filter((site) => site.groupId === groupId).length;
  const confirmed = await askConfirm({
    title: `删除分组“${group.name}”？`,
    message: usedCount ? `${usedCount} 个条目会变成“未分组”，条目和令牌不会删除。` : "这个分组还没有条目。",
    acceptLabel: "删除分组",
    danger: true
  });
  if (!confirmed) return;
  state.data.groups = state.data.groups.filter((item) => item.id !== groupId);
  state.data.sites.forEach((site) => {
    if (site.groupId === groupId) site.groupId = null;
  });
  if (state.selectedGroup === groupId) state.selectedGroup = "all";
  scheduleSave();
  renderAll();
  renderGroupManager();
  showToast("分组已删除");
}

function addGroup() {
  const name = dom.newGroupInput.value.trim();
  if (!name) {
    dom.newGroupInput.focus();
    return;
  }
  const before = state.data.groups.length;
  ensureGroup(name);
  dom.newGroupInput.value = "";
  if (state.data.groups.length === before) {
    showToast("这个分组已经有啦");
  } else {
    scheduleSave();
    renderAll();
    renderGroupManager();
    showToast("新分组已添加");
  }
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function saveBackupFile(envelope, data, custom = false) {
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const filename = `蓝瞳密钥簿-${custom ? "独立密码备份" : "加密备份"}-${new Date().toISOString().slice(0, 10)}.json`;
  if (window.BlueEyeWeb?.saveBlob) {
    await window.BlueEyeWeb.saveBlob(blob, filename, () => state.data === data);
  } else {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  if (state.data !== data) return;
  data.settings.lastBackupAt = nowIso();
  scheduleSave();
  renderSettingsSummary();
  const hint = custom ? "载入时用刚设置的转移密码" : "载入时用导出当时的解锁密码";
  showToast(window.BlueEyeWeb?.saveBlob ? hint : `请完成文件保存。${hint}`, "success", 4200);
}

function showBackupExportError(error) {
  showToast(error.name === "AbortError" ? "已取消导出" : "导出未完成，请再试一次", error.name === "AbortError" ? "success" : "error");
}

async function exportBackup() {
  if (!state.data) return;
  const data = state.data;
  try {
    await flushSave();
    if (state.data !== data) return;
    await saveBackupFile(state.envelope, data);
  } catch (error) {
    if (state.data === data) showBackupExportError(error);
  }
}

function openCustomBackup() {
  if (!state.data || dom.customBackupDialog.open) return;
  state.customBackupRun += 1;
  dom.customBackupForm.reset();
  dom.customBackupError.textContent = "";
  dom.customBackupForm.querySelector('button[type="submit"]').disabled = false;
  dom.customBackupDialog.showModal();
}

async function handleCustomBackup(event) {
  event.preventDefault();
  const data = state.data;
  const run = state.customBackupRun;
  if (!data || !dom.customBackupDialog.open) return;
  const submit = dom.customBackupForm.querySelector('button[type="submit"]');
  if (submit.disabled) return;
  dom.customBackupError.textContent = "";
  const password = dom.customBackupPassword.value;
  if (password.length < 6 || password !== dom.customBackupConfirm.value) {
    dom.customBackupError.textContent = password.length < 6 ? "转移密码至少需要 6 个字符" : "两次输入的密码不一致";
    return;
  }
  submit.disabled = true;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const backupKey = await deriveKey(password, salt);
    const current = () => state.data === data && run === state.customBackupRun && dom.customBackupDialog.open;
    if (!current()) return;
    const backup = await encryptEnvelope(data, backupKey, salt);
    if (!current()) return;
    dom.customBackupForm.reset();
    dom.customBackupDialog.close();
    await saveBackupFile(backup, data, true);
  } catch (error) {
    if (state.data === data && state.customBackupRun === run) {
      if (dom.customBackupDialog.open) dom.customBackupError.textContent = "无法生成加密备份，请再试一次";
      else showBackupExportError(error);
    }
  } finally {
    if (state.customBackupRun === run) submit.disabled = false;
  }
}

function startImport() {
  dom.importFileInput.value = "";
  dom.importFileInput.click();
}

function canUseBiometricForBackup(backup) {
  const backupKdf = backup?.kdf;
  const vaultKdf = state.envelope?.kdf;
  return Boolean(backupKdf && vaultKdf &&
    backupKdf.salt === vaultKdf.salt && backupKdf.iterations === vaultKdf.iterations);
}

function updateImportBiometricUi(status = getBiometricStatus()) {
  dom.importBiometricButton.hidden = !dom.importDialog.open || !status.enabled ||
    !status.available || !canUseBiometricForBackup(state.pendingImport) ||
    typeof window.BlueEyeNative?.requestBiometricImport !== "function";
  dom.importBiometricButton.disabled = state.biometricPromptPending ||
    dom.importForm.querySelector('button[type="submit"]').disabled;
}

function isCurrentBiometricImport(request) {
  return Boolean(request && dom.importDialog.open && state.pendingImport === request.backup &&
    state.data === request.data && canUseBiometricForBackup(request.backup));
}

function requestBiometricImport() {
  updateImportBiometricUi();
  if (dom.importBiometricButton.hidden || dom.importBiometricButton.disabled) return;
  state.biometricImport = { backup: state.pendingImport, data: state.data };
  state.biometricPromptPending = true;
  dom.importError.textContent = "";
  try {
    updateBiometricUi();
    window.BlueEyeNative.requestBiometricImport();
  } catch {
    window.BlueEyeBiometric.onError("import", "unavailable");
  }
}

async function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast("这个文件太大，不像密钥簿备份", "error");
    return;
  }
  try {
    const parsed = JSON.parse(await file.text());
    if (!isValidEnvelope(parsed)) throw new Error("INVALID");
    state.pendingImport = parsed;
    dom.importPasswordInput.value = "";
    dom.importError.textContent = "";
    if (dom.settingsDialog.open) dom.settingsDialog.close();
    dom.importDialog.showModal();
    updateImportBiometricUi();
    window.setTimeout(() => dom.importPasswordInput.focus(), 60);
  } catch {
    state.pendingImport = null;
    showToast("没认出有效的蓝瞳密钥簿备份", "error", 3400);
  }
}

async function handleImportSubmit(event) {
  event.preventDefault();
  const password = dom.importPasswordInput.value;
  if (!password) return;
  await loadImport((backup) => decryptEnvelope(backup, password));
}

async function loadImport(getCredentials, viaBiometric = false) {
  const backup = state.pendingImport;
  const data = state.data;
  const submitButton = dom.importForm.querySelector('button[type="submit"]');
  if (!backup || !dom.importDialog.open || state.biometricPromptPending || submitButton.disabled) return;
  const current = () => dom.importDialog.open && state.pendingImport === backup && state.data === data;
  dom.importError.textContent = "";
  submitButton.disabled = true;
  updateImportBiometricUi();
  let unlocked = null;
  let wrote = false;
  try {
    try {
      unlocked = await getCredentials(backup);
    } catch {
      if (current()) {
        dom.importError.textContent = viaBiometric
          ? "本机指纹没能解开这份备份，请输入这份备份的转移密码。"
          : "没能解开这份备份。请核对导出时的解锁密码或单独设置的转移密码。文件损坏也可能导致此提示。";
        dom.importPasswordInput.select();
      }
      return;
    }
    if (!current()) return;
    dom.importPasswordInput.value = "";
    const replacing = Boolean(state.envelope);
    if (replacing) {
      const confirmed = await askConfirm({
        title: "用备份替换当前密钥簿？",
        message: "当前本机数据会被备份中的内容替换。建议先导出当前版本。",
        acceptLabel: "载入并替换",
        danger: true
      });
      if (!confirmed) {
        if (current()) dom.importDialog.close();
        return;
      }
      if (!current()) return;
    }
    cancelBalanceQueries();
    if (data) await flushSave();
    if (!current()) return;
    disableImportedBalanceQueries(unlocked.data);
    const importedEnvelope = await encryptEnvelope(
      unlocked.data, unlocked.key, base64ToBytes(backup.kdf.salt), backup.kdf.iterations
    );
    if (!current()) return;
    await databasePut(DB_KEY, importedEnvelope);
    wrote = true;
    state.pendingImport = null;
    dom.importDialog.close();
    const fingerprintWasEnabled = getBiometricStatus().enabled;
    if (fingerprintWasEnabled && !viaBiometric) disableBiometricCredential();
    await enterApp(unlocked.data, unlocked.key, importedEnvelope, unlocked.keyBytes);
    showToast(
      fingerprintWasEnabled && !viaBiometric
        ? "备份已载入，解锁使用这份备份的转移密码。如需指纹解锁，请重新开启。"
        : "备份已载入，余额查询保持关闭。",
      "success",
      3600
    );
  } catch (error) {
    if (wrote) showToast("备份已保存，请重开蓝瞳并用转移密码解锁", "error", 4200);
    else if (current()) dom.importError.textContent = (viaBiometric ? "指纹" : "密码") +
      "验证通过，但备份没能保存到本机。请检查存储空间后重试。";
  } finally {
    if (unlocked?.keyBytes instanceof Uint8Array) unlocked.keyBytes.fill(0);
    submitButton.disabled = false;
    updateImportBiometricUi();
  }
}

async function changePassword(event) {
  event.preventDefault();
  dom.changePasswordError.textContent = "";
  const currentPassword = dom.currentPasswordInput.value;
  const nextPassword = dom.newPasswordInput.value;
  const confirmation = dom.newPasswordConfirmInput.value;
  if (nextPassword.length < 6) {
    dom.changePasswordError.textContent = "新密码至少需要 6 个字符";
    return;
  }
  if (nextPassword !== confirmation) {
    dom.changePasswordError.textContent = "两次输入的新密码不一致";
    return;
  }
  const submitButton = dom.changePasswordForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await decryptEnvelope(state.envelope, currentPassword);
    await flushSave();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const { key: nextKey, keyBytes: nextKeyBytes } = await deriveKeyMaterial(nextPassword, salt);
    const nextEnvelope = await encryptEnvelope(state.data, nextKey, salt);
    await databasePut(DB_KEY, nextEnvelope);
    clearInMemoryKeyBytes();
    state.key = nextKey;
    state.keyBytes = new Uint8Array(nextKeyBytes);
    nextKeyBytes.fill(0);
    state.envelope = nextEnvelope;
    const fingerprintWasEnabled = getBiometricStatus().enabled;
    if (fingerprintWasEnabled) disableBiometricCredential();
    dom.changePasswordForm.reset();
    dom.changePasswordDialog.close();
    showToast(
      fingerprintWasEnabled ? "主密码已更换，请重新开启指纹解锁" : "主密码已经更换",
      "success",
      fingerprintWasEnabled ? 3400 : 2200
    );
  } catch (error) {
    console.error(error);
    dom.changePasswordError.textContent = "当前密码不正确";
  } finally {
    submitButton.disabled = false;
  }
}

function askChoice({ title, message, acceptLabel = "确认", cancelLabel = "取消", danger = false }) {
  dom.confirmTitle.textContent = title;
  dom.confirmMessage.textContent = message;
  dom.confirmCancel.textContent = cancelLabel;
  dom.confirmAccept.textContent = acceptLabel;
  dom.confirmAccept.className = danger ? "danger-button" : "primary-button";
  dom.confirmDialog.returnValue = "";
  return new Promise((resolve) => {
    const onClose = () => {
      dom.confirmDialog.removeEventListener("close", onClose);
      resolve(["confirm", "cancel"].includes(dom.confirmDialog.returnValue) ? dom.confirmDialog.returnValue : null);
    };
    dom.confirmDialog.addEventListener("close", onClose);
    dom.confirmDialog.showModal();
  });
}

async function askConfirm(options) {
  return (await askChoice({ ...options, cancelLabel: "取消" })) === "confirm";
}

function openChangePasswordDialog() {
  dom.changePasswordForm.reset();
  dom.changePasswordError.textContent = "";
  if (dom.settingsDialog.open) dom.settingsDialog.close();
  dom.changePasswordDialog.showModal();
  window.setTimeout(() => dom.currentPasswordInput.focus(), 60);
}

async function handleSetup(event) {
  event.preventDefault();
  dom.setupError.textContent = "";
  const password = dom.setupPassword.value;
  const confirmation = dom.setupPasswordConfirm.value;
  if (password.length < 6) {
    dom.setupError.textContent = "主密码至少需要 6 个字符";
    return;
  }
  if (password !== confirmation) {
    dom.setupError.textContent = "两次输入的密码不一致";
    return;
  }
  const submitButton = dom.setupForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const data = defaultData();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const { key, keyBytes } = await deriveKeyMaterial(password, salt);
    const envelope = await encryptEnvelope(data, key, salt);
    await databasePut(DB_KEY, envelope);
    dom.setupForm.reset();
    await enterApp(data, key, envelope, keyBytes);
    showToast("密钥簿建好啦");
  } catch (error) {
    console.error(error);
    dom.setupError.textContent = "创建失败，请刷新后再试";
  } finally {
    submitButton.disabled = false;
  }
}

async function handleUnlock(event) {
  event.preventDefault();
  dom.unlockError.textContent = "";
  const password = dom.unlockPassword.value;
  const submitButton = dom.unlockForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const unlocked = await decryptEnvelope(state.envelope, password);
    dom.unlockPassword.value = "";
    await enterApp(unlocked.data, unlocked.key, state.envelope, unlocked.keyBytes);
  } catch (error) {
    console.error(error);
    dom.unlockError.textContent = "主密码不对，再想想看";
    dom.unlockPassword.select();
  } finally {
    submitButton.disabled = false;
  }
}

function handleThemeChange() {
  state.data.settings.theme = dom.themeSelect.value;
  applyTheme(state.data.settings.theme);
  scheduleSave();
}

function handleAutoLockChange() {
  state.data.settings.autoLockMinutes = Number(dom.autoLockSelect.value);
  scheduleSave();
  resetAutoLock();
  showToast(state.data.settings.autoLockMinutes ? "自动锁定时间已更新" : "已关闭闲置自动锁定");
}

async function installApp() {
  if (window.BlueEyeWeb?.openInstallHelp) {
    const prompt = state.installPrompt;
    state.installPrompt = null;
    window.BlueEyeWeb.openInstallHelp(prompt);
    return;
  }
  if (state.installPrompt) {
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
  } else {
    showToast("请在浏览器菜单中选择“添加到主屏幕”", "success", 3600);
  }
}

function togglePasswordField(inputId, button) {
  const input = $(inputId);
  if (!input) return;
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  button.replaceChildren(createIcon(showing ? "eye" : "eye-off"));
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  state.webMcpLifecycle?.abort();
  state.webMcpLifecycle = new AbortController();
  const signal = state.webMcpLifecycle.signal;
  const register = (tool) => {
    try {
      Promise.resolve(context.registerTool(tool, { signal })).catch((error) => console.warn("WebMCP", error));
    } catch (error) {
      console.warn("WebMCP", error);
    }
  };

  register({
    name: "list_api_entry_summaries",
    title: "查看 API 条目摘要",
    description: "列出已解锁密钥簿中的网站、全部 Base URL、分组和令牌备注；绝不返回令牌内容。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      if (!state.data) return { locked: true, sites: [] };
      return {
        locked: false,
        sites: sortedSites().map((site) => ({
          id: site.id,
          name: site.name,
          baseUrl: getPrimaryBaseUrl(site),
          baseUrls: getBaseUrls(site).map((baseUrl) => ({ name: baseUrl.name, value: baseUrl.value })),
          group: getGroup(site.groupId)?.name ?? null,
          pinned: site.pinned,
          tokenNames: site.tokens.map((token) => token.name)
        }))
      };
    }
  });

  register({
    name: "open_new_api_entry",
    title: "打开新增 API 条目",
    description: "在已解锁的密钥簿中打开新增表单，但不自动保存任何内容。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute() {
      if (!state.data) throw new Error("密钥簿当前已锁定");
      openEditor();
      return { staged: true };
    }
  });

  register({
    name: "filter_api_entries",
    title: "筛选 API 条目",
    description: "按关键词筛选当前界面；只改变可见列表，不修改保存的数据。",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", maxLength: 100 } },
      required: ["query"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!state.data) throw new Error("密钥簿当前已锁定");
      if (!input || typeof input.query !== "string") throw new Error("query 必须是字符串");
      finishSiteDrag(false);
      setArranging(false);
      state.query = input.query.slice(0, 100);
      dom.searchInput.value = state.query;
      renderEntries();
      return { query: state.query, visibleCount: visibleSites().length };
    }
  });
}

function setDialogCloseLabel(dialog, label) {
  const button = dialog.querySelector("[data-close-dialog]");
  button.setAttribute("aria-label", label);
  button.title = label;
}

function dismissSitePanels() {
  state.activityGeneration += 1;
  state.activityBusy = false;
  [dom.balanceDialog, dom.activityDialog, dom.siteDetailDialog].forEach((dialog) => {
    if (dialog.open) dialog.close();
  });
}

function bindBackdropDismissal(dialog, dismissDialog) {
  let startedOutside = false;
  const outside = (event) => {
    if (event.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener("pointerdown", (event) => { startedOutside = outside(event); });
  dialog.addEventListener("pointercancel", () => { startedOutside = false; });
  dialog.addEventListener("close", () => { startedOutside = false; });
  dialog.addEventListener("click", (event) => {
    const dismiss = startedOutside && outside(event);
    startedOutside = false;
    if (dismiss) {
      event.preventDefault();
      dismissDialog();
    }
  });
}

function bindEvents() {
  bindFeatureEvents();
  bindSiteDragging();
  bindOverviewEvents();
  bindActivityEvents();
  [dom.siteDetailDialog, dom.activityDialog, dom.balanceDialog].forEach((dialog) => {
    bindBackdropDismissal(dialog, dismissSitePanels);
  });
  bindBackdropDismissal(dom.settingsDialog, () => dom.settingsDialog.close());
  dom.setupForm.addEventListener("submit", handleSetup);
  dom.unlockForm.addEventListener("submit", handleUnlock);
  dom.biometricUnlockButton.addEventListener("click", requestBiometricUnlock);
  dom.biometricSettingsButton.addEventListener("click", toggleBiometricSetting);
  dom.editorForm.addEventListener("submit", saveEditor);
  dom.balanceForm.addEventListener("submit", saveBalanceSettings);
  dom.balanceMode.addEventListener("change", () => {
    const site = state.data?.sites.find((item) => item.id === state.balanceEditingSiteId);
    if (site) fillBalanceForm(site, dom.balanceMode.value);
  });
  dom.balanceUnit.addEventListener("change", () => {
    if (["USD", "CNY"].includes(dom.balanceUnit.value) && !dom.balanceDivisor.value) dom.balanceDivisor.value = "500000";
    updateBalanceForm();
  });
  $("balance-common-divisor").addEventListener("click", () => { dom.balanceDivisor.value = "500000"; });
  dom.balanceEnabled.addEventListener("change", updateBalanceForm);
  dom.balanceOrigin.addEventListener("change", () => {
    dom.balanceCredential.value = "";
    dom.balanceUserId.value = "";
    dom.balanceError.textContent = "切换站点后已清空凭证，请填写新站点对应的信息";
  });
  dom.balanceDialog.addEventListener("close", () => {
    dom.balanceCredential.value = "";
    dom.balanceUserId.value = "";
    state.balanceEditingSiteId = null;
  });
  $("balance-forget-button").addEventListener("click", forgetBalanceSettings);
  dom.refreshBalancesButton.addEventListener("click", () => refreshAllBalances(false));
  dom.balanceAutoRefresh.addEventListener("change", () => {
    if (!state.data) return;
    state.data.settings.balanceAutoRefresh = dom.balanceAutoRefresh.checked;
    scheduleSave();
  });
  dom.smartForm.addEventListener("submit", handleSmartSubmit);
  dom.importForm.addEventListener("submit", handleImportSubmit);
  dom.importBiometricButton.addEventListener("click", requestBiometricImport);
  dom.customBackupForm.addEventListener("submit", handleCustomBackup);
  dom.customBackupDialog.addEventListener("close", () => {
    if (!dom.customBackupDialog.open) dom.customBackupForm.reset();
  });
  dom.importDialog.addEventListener("close", () => {
    if (dom.importDialog.open) return;
    state.pendingImport = null;
    dom.importPasswordInput.value = "";
    const eye = dom.importDialog.querySelector("[data-toggle-password]");
    if (dom.importPasswordInput.type === "text") togglePasswordField(dom.importPasswordInput.id, eye);
  });
  dom.changePasswordForm.addEventListener("submit", changePassword);

  $("add-site-button").addEventListener("click", () => openEditor());
  $("model-status-global-open").addEventListener("click", () => {
    if (!state.data) return;
    window.BlueEyeModelStatus?.openGlobal(state.data.sites, state.data.groups, (id, selection) => {
      const site = state.data?.sites.find((item) => item.id === id);
      if (site) window.BlueEyeModelStatus.open(site, { ...selection,
        save: scheduleSave, copy: (name) => copyText(name, "模型名已复制") });
    });
  });
  $("empty-add-site").addEventListener("click", () => openEditor());
  $("mobile-add-button").addEventListener("click", () => openEditor());
  dom.siteDetailPin.addEventListener("click", () => {
    const site = getViewingSite();
    if (site) toggleSitePinned(site);
  });
  dom.siteDetailMoveUp.addEventListener("click", () => {
    const site = getViewingSite();
    if (site) moveSite(site.id, -1);
  });
  dom.siteDetailMoveDown.addEventListener("click", () => {
    const site = getViewingSite();
    if (site) moveSite(site.id, 1);
  });
  dom.siteDetailEdit.addEventListener("click", () => {
    const site = getViewingSite();
    if (site) openEditor(site);
  });
  dom.siteDetailDelete.addEventListener("click", () => {
    const site = getViewingSite();
    if (site) deleteSite(site.id);
  });
  dom.siteDetailDialog.addEventListener("close", () => {
    state.viewingSiteId = null;
  });
  $("smart-add-button").addEventListener("click", openSmartDialog);
  $("empty-smart-add").addEventListener("click", openSmartDialog);
  $("paste-from-clipboard").addEventListener("click", pasteFromClipboard);
  $("add-base-url-row").addEventListener("click", () => addBaseUrlEditorRow());
  $("add-token-row").addEventListener("click", () => addTokenEditorRow());
  $("settings-button").addEventListener("click", openSettings);
  $("lock-button").addEventListener("click", () => lockVault());
  $("export-button").addEventListener("click", exportBackup);
  $("settings-export-button").addEventListener("click", exportBackup);
  $("settings-custom-backup-button").addEventListener("click", openCustomBackup);
  $("settings-import-button").addEventListener("click", startImport);
  $("change-password-button").addEventListener("click", openChangePasswordDialog);
  $("install-button").addEventListener("click", installApp);
  $("add-group-button").addEventListener("click", addGroup);
  dom.newGroupInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addGroup();
    }
  });

  dom.setupImportButton.addEventListener("click", startImport);
  dom.lockedImportButton.addEventListener("click", startImport);
  dom.importFileInput.addEventListener("change", handleImportFile);
  dom.themeSelect.addEventListener("change", handleThemeChange);
  document.querySelectorAll("[data-theme-choice]").forEach((button)=>button.addEventListener("click",()=>{
    if(!state.data)return;
    dom.themeSelect.value=button.dataset.themeChoice;handleThemeChange();
  }));
  dom.autoLockSelect.addEventListener("change", handleAutoLockChange);

  dom.searchInput.addEventListener("input", () => {
    finishSiteDrag(false);
    setArranging(false);
    state.query = dom.searchInput.value;
    renderEntries();
  });

  document.addEventListener("click", (event) => {
    if(!event.target.closest(".overview-row-menu"))dom.overviewRows.querySelectorAll(".overview-row-menu").forEach((menu)=>{menu.open=false;});
    const clearButton = event.target.closest("[data-clear-target]");
    if (clearButton) {
      const input = $(clearButton.dataset.clearTarget);
      if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }
    }
    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      const dialog = $(closeButton.dataset.closeDialog);
      if (dialog?.open) dialog.close();
    }
    const toggleButton = event.target.closest("[data-toggle-password]");
    if (toggleButton) togglePasswordField(toggleButton.dataset.togglePassword, toggleButton);
  });

  document.addEventListener("keydown", (event) => {
    if (!state.data) return;
    if(event.key==="Escape")dom.overviewRows.querySelectorAll(".overview-row-menu").forEach((menu)=>{menu.open=false;});
    if (event.key === "Escape" && state.arranging) { finishSiteDrag(false); setArranging(false); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
      event.preventDefault();
      dom.searchInput.focus();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "n") {
      event.preventDefault();
      openEditor();
    }
  });

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, resetAutoLock, { passive: true });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
  });
  window.addEventListener("appinstalled", () => {
    state.installPrompt = null;
    showToast("已经安装到桌面啦");
  });

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener?.("change", () => {
    if (!document.documentElement.dataset.theme) applyTheme("system");
  });
}

async function initialize() {
  applyTheme(readThemePreference());
  bindEvents();
  registerWebMcpTools();
  if (!window.crypto?.subtle || !window.indexedDB) {
    $("lock-caption").textContent = "当前浏览器不支持安全加密存储，请换用较新的 Chrome、Safari 或 Edge。";
    dom.unlockForm.hidden = true;
    dom.setupForm.hidden = true;
    return;
  }

  try {
    state.db = await openDatabase();
    const stored = await databaseGet(DB_KEY);
    if (stored && !isValidEnvelope(stored)) {
      throw new Error("STORED_DATA_INVALID");
    }
    state.envelope = stored;
    showLockedMode(Boolean(stored), true);
  } catch (error) {
    console.error(error);
    $("lock-caption").textContent = "本机存储暂时打不开。请确认没有使用会阻止网站存储的隐私模式。";
    dom.unlockForm.hidden = true;
    dom.setupForm.hidden = true;
  }

  window.BlueEyeWeb?.registerOffline();
}

initialize();
