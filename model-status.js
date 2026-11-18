(function () {
  "use strict";
  const LIMIT = 1024 * 1024;
  const FRESH_MS = 5 * 60 * 1000;
  const WINDOWS = [1, 6, 12, 24];
  const failures = {
    auth: "站点拒绝公开读取，可能需要登录或授权",
    unsupported: "这个来源没有可读取的公开模型接口",
    response: "站点返回的数据格式暂不兼容",
    redirect: "查询被重定向，请选择实际的站点地址",
    timeout: "读取超时，可以稍后刷新",
    rate_limit: "站点限制查询频率，请稍后再试",
    network: "连接失败，请检查网络或站点地址",
    browser: "浏览器无法直接读取此站，可用安卓端或打开原站",
    native: "请更新安卓端后再直接查询",
    configuration: "此来源不能用来查询公开状态",
    http: "站点暂时无法返回数据",
    api: "站点未提供本次查询的数据",
    monitor: "暂不支持读取这类监控页，可打开原页查看"
  };
  const asArray = (value) => Array.isArray(value) ? value : [];
  const cleanText = (value, max = 240) => typeof value === "string"
    && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) ? value.trim() : "";

  function publicUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
          || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(url.hostname)
          || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(url.hostname)
          || url.pathname.length > 1024) return null;
      return url;
    } catch { return null; }
  }

  function sourceRoot(value) {
    const url = publicUrl(value);
    if (!url) return "";
    const path = url.pathname.replace(/\/+$/, "").replace(/\/v1(?:beta|alpha)?(?:\/(?:models|chat\/completions|responses|messages))?$/, "");
    if (path.split("/").some((part) => part && !/^[A-Za-z0-9_~.-]+$/.test(part))) return "";
    return url.origin + path.replace(/\/+/g, "/");
  }

  const PAGE_PREFIX = "page:";
  function monitorSource(page) {
    const url = publicUrl(page);
    return url && sourceRoot(url.href) ? PAGE_PREFIX + url.href : "";
  }
  function pageTarget(source) {
    if (!source.startsWith(PAGE_PREFIX)) return null;
    const url = publicUrl(source.slice(PAGE_PREFIX.length));
    if (!url || !sourceRoot(url.href)) return null;
    const gatewayPath = url.pathname.match(/^(.*?)\/(pricing|model-status)\/?$/i);
    return { url, type: !gatewayPath ? "hedgehog" : gatewayPath[2].toLowerCase() === "pricing" ? "market" : "gateway",
      root: gatewayPath ? url.origin + gatewayPath[1] : url.origin };
  }
  const supportsDetail = (source) => !pageTarget(source) || pageTarget(source).type === "gateway";
  const prettySource = (source) => source.replace(/^page:https:\/\//, "监控页 · ").replace(/^https:\/\//, "");

  function getSources(site) {
    const roots = new Set();
    const secrets = asArray(site.tokens).map((token) => String(token?.value || "").trim()).filter((value) => value.length >= 8);
    const add = (root) => {
      if (root && !secrets.some((secret) => root.includes(secret))) roots.add(root);
    };
    const website = publicUrl(site.websiteUrl);
    if (website) add(website.origin);
    for (const entry of asArray(site.baseUrls).slice(0, 24)) {
      const root = sourceRoot(entry?.value);
      add(root);
    }
    const fallback = sourceRoot(site.baseUrl);
    add(fallback);
    return [...roots];
  }

  function normalizeSettings(value, sources) {
    const saved = value && typeof value === "object" ? value : {};
    const page = publicUrl(saved.page)?.href || "";
    const readPage = saved.readPage === true && Boolean(monitorSource(page));
    const permitted = readPage ? [...sources, monitorSource(page)] : sources;
    const favourites = [];
    const seen = new Set();
    for (const row of asArray(saved.favourites).slice(0, 80)) {
      const name = cleanText(row?.name);
      const source = row?.source;
      if (!name || !permitted.includes(source)) continue;
      const k = JSON.stringify([source, name]);
      if (seen.has(k)) continue;
      seen.add(k); favourites.push({ source, name });
    }
    return {
      source: permitted.includes(saved.source) ? saved.source : "",
      page, readPage,
      favourites
    };
  }

  function number(value, min = 0, max = 1e12) {
    if (typeof value !== "number" && !(typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value))) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  }

  function metrics(row) {
    const count = number(row?.request_count ?? row?.total_requests);
    return {
      success: count === 0 ? null : number(row?.success_rate, 0, 100),
      latency: number(row?.avg_latency_ms, 1),
      tps: number(row?.avg_tps, 0.01),
      count: Number.isSafeInteger(count) ? count : null
    };
  }

  function trend(value) {
    const points = asArray(value);
    const dated = points.every((point) => number(point?.ts, 0, Number.MAX_SAFE_INTEGER) !== null);
    const ordered = dated ? [...points].sort((a, b) => Number(a.ts) - Number(b.ts)) : points;
    return ordered.slice(-576).map((point) => typeof point === "object" && point !== null
      ? (number(point.request_count ?? point.total_requests) === 0 ? null : number(point.success_rate, 0, 100))
      : number(point, 0, 100));
  }

  const pointTone = (pct, thresholds) => pct == null ? "none" : pct >= (thresholds?.ok ?? 99)
    ? "good" : pct >= (thresholds?.warn ?? 90) ? "warning" : "low";
  const latestPoint = (row) => row.points?.[row.points.length - 1] ?? null;
  const toneNames = { good: "绿色", warning: "黄色", low: "红色" };
  const hasSeries = (row) => Boolean(row?.points?.length);
  function readTrend(row) {
    return trend([row?.recent_success_series, row?.recent_success_rates, row?.series].find((value) => Array.isArray(value) && value.length));
  }

  function hasStats(row) {
    return row.success != null || row.latency != null || row.tps != null || row.count != null
      || asArray(row.points).some((point) => point !== null) || Boolean(row.liveTone)
      || asArray(row.reportedGroups).some(hasStats);
  }

  function errorCode(body) {
    const message = typeof body?.message === "string" ? body.message : "";
    if ([401, 403, "401", "403"].includes(body?.code)
      || /unauthori[sz]ed|not logged in|access token|sign in|login required|未登录|请登录|无权|未授权/i.test(message)) return "auth";
    if (/not found|unsupported|not implemented|未开放|不支持/i.test(message)) return "unsupported";
    return "api";
  }

  function parseSummary(body) {
    if (body?.success === false) return { ok: false, code: errorCode(body) };
    if (!Array.isArray(body?.data?.models)) return { ok: false, code: "response" };
    const byName = new Map();
    for (const row of body.data.models.slice(0, 1500)) {
      const name = cleanText(row?.model_name);
      if (!name || byName.has(name)) continue;
      const result = {
        name, ...metrics(row),
        points: readTrend(row)
      };
      byName.set(name, result);
    }
    return { ok: true, kind: [...byName.values()].some(hasStats) ? "stats" : "list", rows: [...byName.values()] };
  }
  function marketRow(row, name, allowProbe) {
    const source = row.performance && typeof row.performance === "object" ? row.performance : row;
    const probeStatus = allowProbe && typeof row.status === "string" ? row.status.toLowerCase() : "";
    const liveTone = ["operational", "healthy", "normal", "ok", "up"].includes(probeStatus) ? "good"
      : ["degraded", "warning", "partial_outage"].includes(probeStatus) ? "warning"
      : ["down", "unavailable", "major_outage", "error", "failed"].includes(probeStatus) ? "low" : "";
    const data = { name, ...metrics(source), points: readTrend(source), liveTone };
    // The market monitor has its own rolling window and may use synthetic probes.
    if (allowProbe || (source !== row && hasStats(data))) data.market = true;
    return data;
  }
  function parseMarket(body) {
    if (body?.success === false) return { ok: false, code: errorCode(body) };
    if (!Array.isArray(body?.data?.models)) return { ok: false, code: "response" };
    const rows = new Map();
    for (const row of body.data.models.slice(0, 1500)) {
      const name = cleanText(row?.model_name ?? row?.model);
      if (!name || rows.has(name)) continue;
      rows.set(name, marketRow(row, name, true));
    }
    if (!rows.size && body.data.models.length) return { ok: false, code: "response" };
    return { ok: true, kind: [...rows.values()].some(hasStats) ? "stats" : "list", rows: [...rows.values()], market: true };
  }
  function parseHedgehog(body, config) {
    if (!Array.isArray(body?.models)) return { ok: false, code: "monitor" };
    const ok = number(config?.ok_threshold, 0, 100), warn = number(config?.warn_threshold, 0, 100);
    const thresholds = ok != null && warn != null && ok >= warn ? { ok, warn } : { ok: 85, warn: 60 };
    const all = new Map();
    for (const model of body.models.slice(0, 1500)) {
      const name = cleanText(model?.model_name), group = cleanText(model?.group, 120);
      if (!name || !Array.isArray(model.segments)) continue;
      const duration = number(model.avg_time, 0.001, 1e7);
      const data = { ...metrics(model), latency: duration == null ? null : duration * 1000,
        points: trend(model.segments.map((point) => ({ ts: point?.start, request_count: point?.requests, success_rate: point?.success_rate }))),
        thresholds };
      const row = all.get(name) ?? { name, reportedGroups: [], thresholds };
      if (group) {
        if (!row.reportedGroups.some((item) => item.name === group)) row.reportedGroups.push({ name: group, ...data });
      } else if (!hasSeries(row)) Object.assign(row, data);
      all.set(name, row);
    }
    if (!all.size && body.models.length) return { ok: false, code: "monitor" };
    return { ok: true, kind: all.size ? "stats" : "list", rows: [...all.values()], external: true };
  }

  function parseList(body) {
    if (body?.success === false) return { ok: false, code: errorCode(body) };
    if (!Array.isArray(body?.data)) return { ok: false, code: "response" };
    const names = new Set();
    for (const row of body.data.slice(0, 1500)) {
      const name = cleanText(row?.model_name ?? row?.id);
      if (name) names.add(name);
    }
    return names.size || !body.data.length ? { ok: true, kind: "list", rows: [...names].map((name) => ({ name })) }
      : { ok: false, code: "response" };
  }

  const priceLiteral = String.raw`(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
  const fixedTierPrice = new RegExp(String.raw`^fixed\s*\(\s*(${priceLiteral})\s*\)$`);
  const tokenPriceTerm = new RegExp(String.raw`\s*(?:([a-z][a-z0-9_]*)\s*\*\s*(${priceLiteral})|(${priceLiteral})\s*\*\s*([a-z][a-z0-9_]*))\s*(\+|$)`, "y");
  const tokenPriceVariables = new Set(["p", "c", "cr", "cc", "cc1h", "cc12h", "img", "imgo", "img_cr", "ai", "ao"]);

  function parseTierBasePrice(expression) {
    if (typeof expression !== "string" || expression.length > 2048) return null;
    const tier = /^(?:v1:\s*)?tier\s*\(\s*"[^"\\]*"\s*,\s*([\s\S]+)\)$/.exec(expression.trim());
    if (!tier) return null;
    const formula = tier[1].trim();
    const fixed = fixedTierPrice.exec(formula);
    if (fixed) {
      const perCall = number(Number(fixed[1]), 0, 1e9);
      return perCall === null ? null : { perCall };
    }
    // Only read constant coefficients. Conditional and other formulas stay as published rules.
    tokenPriceTerm.lastIndex = 0;
    const prices = new Map();
    while (tokenPriceTerm.lastIndex < formula.length) {
      const term = tokenPriceTerm.exec(formula);
      if (!term || (term[5] && tokenPriceTerm.lastIndex === formula.length)) return null;
      const variable = term[1] ?? term[4];
      if (!tokenPriceVariables.has(variable)) return null;
      const amount = number((prices.get(variable) ?? 0) + Number(term[2] ?? term[3]), 0, 1e9);
      if (amount === null) return null;
      prices.set(variable, amount);
    }
    if (!prices.has("p") && !prices.has("c")) return null;
    return { input: prices.get("p") ?? 0, output: prices.get("c") ?? 0 };
  }

  function parsePricing(body) {
    if (body?.success !== true || !Array.isArray(body.data)) return null;
    const names = new Set(), byName = new Map(), groupRatios = new Map(), rows = new Map();
    const ratios = body.group_ratio && typeof body.group_ratio === "object" && !Array.isArray(body.group_ratio)
      ? body.group_ratio : {};
    for (const [key, raw] of Object.entries(ratios).slice(0, 300)) {
      const name = cleanText(key, 120), ratio = number(raw, 0, 1e6);
      if (name && ratio !== null) groupRatios.set(name, ratio);
    }
    for (const row of body.data.slice(0, 1500)) {
      const name = cleanText(row?.model_name);
      if (!name) continue;
      if (!rows.has(name)) rows.set(name, marketRow(row, name, false));
      if (names.has(name)) { byName.delete(name); continue; }
      names.add(name);
      if (asArray(row.billing_plugin_variants).length) continue;
      const groups = [...new Set(asArray(row.enable_groups ?? row.enable_group).slice(0, 120)
        .map((group) => cleanText(group, 120)).filter((group) => group && group !== "all" && group !== "auto"))]
        .filter((group) => groupRatios.has(group));
      if (row.billing_mode === "tiered_expr") {
        const base = parseTierBasePrice(row.billing_expr);
        byName.set(name, base ? { ...base, groups } : { tiered: true, groups: [] });
        continue;
      }
      if ((row.billing_mode && row.billing_mode !== "ratio") || row.billing_expr) continue;
      const quotaType = number(row.quota_type, 0, 1);
      if (quotaType === 1) {
        const perCall = number(row.model_price, 0, 1e9);
        if (perCall !== null) byName.set(name, { perCall, groups });
      } else if (quotaType === 0) {
        // New API's legacy ratio: 500,000 quota per USD, per million text tokens.
        const ratio = number(row.model_ratio, 0, 1e6);
        const completion = number(row.completion_ratio, 0, 1e6);
        if (ratio !== null && completion !== null) {
          byName.set(name, { input: 2 * ratio, output: 2 * ratio * completion, groups });
        }
      }
    }
    return { rows: [...rows.values()], byName, groupRatios };
  }

  const searchable = (text) => text.normalize("NFKC").toLowerCase();
  const searchTerms = (text) => searchable(text).match(/[\p{L}\p{N}]+/gu) || [];
  function searchScore(name, query, terms) {
    if (!query) return 0;
    const value = searchable(name);
    if (value === query) return 3;
    if (value.includes(query)) return 2;
    const compact = searchTerms(value).join("");
    return terms.length && terms.every((term) => compact.includes(term)) ? 1 : -1;
  }

  function parseDetail(body, model) {
    if (body?.success === false) return { ok: false, code: errorCode(body) };
    const data = body?.data;
    if (!data || data.model_name !== model) {
      return { ok: false, code: "response" };
    }
    const points = readTrend(data);
    if (!Array.isArray(data.groups) && !data.summary && !points.length) return { ok: false, code: "response" };
    const groups = [];
    const seen = new Set();
    for (const row of asArray(data.groups).slice(0, 120)) {
      const name = cleanText(row?.group, 120);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      groups.push({ name, ...metrics(row), points: readTrend(row) });
    }
    const total = { ...metrics(data.summary), points: points.length ? points : readTrend(data.summary) };
    return { ok: true, groups, total: hasStats(total) || hasSeries(total) ? total : null };
  }

  const cache = new Map();
  const pricingCache = new Map();
  const detailCache = new Map();
  const pending = new Map();
  let panel = null;
  let globalPanel = null;
  let nextId = 0;
  let bound = false;

  function nativeRead(source, kind, hours, model, signal) {
    return new Promise((resolve) => {
      if (typeof window.BlueEyeNative?.requestModelStatus !== "function") {
        resolve({ ok: false, code: "native" }); return;
      }
      const id = "modelstatus_" + (++nextId);
      const end = (result) => {
        const request = pending.get(id);
        if (!request) return;
        pending.delete(id);
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        resolve(result);
      };
      const stop = (code) => {
        end({ ok: false, code });
        try { window.BlueEyeNative?.cancelModelStatusRequest?.(id); } catch { /* Older Android build. */ }
      };
      const abort = () => stop("cancelled");
      const timer = setTimeout(() => stop("timeout"), 18000);
      pending.set(id, { end, parts: [], length: 0, limit: kind === "hedgehog" ? 2 * LIMIT : LIMIT });
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) { abort(); return; }
      try { window.BlueEyeNative.requestModelStatus(id, source, kind, hours, model || ""); }
      catch { end({ ok: false, code: "network" }); }
    });
  }

  async function browserRead(source, kind, hours, model, signal) {
    const step = { 1: 1, 6: 15, 12: 30, 24: 60 }[hours];
    const path = kind === "summary" ? "/api/perf-metrics/summary?hours=" + hours
      : kind === "detail" ? "/api/perf-metrics?" + new URLSearchParams({ hours, model })
      : kind === "pricing" ? "/api/pricing" : kind === "market" ? "/api/model-monitor/public"
      : kind === "hedgehog-config" ? "/api/config/public"
      : kind === "hedgehog" ? "/api/status?group=&window=" + (hours * 60) + "&granularity=" + step + "&sort=requests&sort_dir=desc"
      : "/v1/models";
    const deadline = new AbortController();
    const limit = kind === "hedgehog" ? 2 * LIMIT : LIMIT;
    const abort = () => deadline.abort();
    const timer = setTimeout(abort, 8500);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    try {
      const response = await fetch(source + path, { method: "GET", redirect: "manual", credentials: "omit",
        referrerPolicy: "no-referrer", mode: "cors", cache: "no-store", signal: deadline.signal,
        headers: { Accept: "application/json" } });
      if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) return { ok: false, code: "redirect" };
      if (response.status === 401 || response.status === 403) return { ok: false, code: "auth" };
      if ([404, 405, 501].includes(response.status)) return { ok: false, code: "unsupported" };
      if (response.status === 429) return { ok: false, code: "rate_limit" };
      if (!response.ok) return { ok: false, code: "http" };
      if (Number(response.headers.get("content-length")) > limit || !response.body) return { ok: false, code: "response" };
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let size = 0, body = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) { abort(); return { ok: false, code: "response" }; }
          body += decoder.decode(value, { stream: true });
        }
      } finally { reader.releaseLock(); }
      try { return { ok: true, body: JSON.parse(body + decoder.decode()) }; }
      catch { return { ok: false, code: "response" }; }
    } catch {
      return { ok: false, code: signal.aborted ? "cancelled" : deadline.signal.aborted ? "timeout" : "browser" };
    } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
  }

  function read(source, kind, hours, model, signal) {
    return window.BlueEyeNative ? nativeRead(source, kind, hours, model, signal) : browserRead(source, kind, hours, model, signal);
  }

  const fresh = (entry) => entry && Date.now() - entry.time < FRESH_MS;
  async function readPricing(source, hours, signal, force = false) {
    const page = pageTarget(source);
    if (page?.type === "hedgehog") return null;
    if (page) source = page.root;
    const prior = pricingCache.get(source);
    if (!force && fresh(prior)) return prior.data;
    if (force) pricingCache.delete(source);
    const raw = await read(source, "pricing", hours, "", signal);
    if (signal.aborted || !raw.ok) return null;
    let data = parsePricing(raw.body);
    if (!data?.rows.length) {
      const list = parseList(raw.body);
      if (list.ok && list.rows.length) data = { rows: list.rows, byName: new Map(), groupRatios: new Map() };
    }
    if (data) rememberIn(pricingCache, source, { time: Date.now(), data });
    return data;
  }

  async function readModelList(source, hours, signal) {
    const page = pageTarget(source);
    if (page?.type === "hedgehog") return { ok: false, code: "unsupported" };
    if (page) source = page.root;
    const result = await read(source, "models", hours, "", signal);
    return result.ok ? parseList(result.body) : result;
  }

  async function fetchRows(source, hours, signal, getPricing, getModels = () => readModelList(source, hours, signal)) {
    const page = pageTarget(source);
    if (page?.type === "hedgehog") {
      const [status, config] = await Promise.all([
        read(page.root, "hedgehog", hours, "", signal), read(page.root, "hedgehog-config", hours, "", signal)
      ]);
      if (!status.ok) return status;
      return parseHedgehog(status.body, config.ok ? config.body : null);
    }
    const gateway = page?.root ?? source;
    const market = async () => {
      const raw = await read(gateway, "market", hours, "", signal);
      return raw.ok ? parseMarket(raw.body) : raw;
    };
    const squareOnly = page?.type === "market";
    const result = squareOnly ? await market() : await read(gateway, "summary", hours, "", signal);
    const first = !squareOnly && result.ok ? parseSummary(result.body) : result;
    if (first.ok && first.kind === "stats") return first;
    const partial = first.ok ? first : null;
    const reason = partial ? "no_samples" : first.code;
    if (!partial && !["auth", "unsupported", "response", "api"].includes(reason)) return first;
    const pricing = await getPricing();
    if (signal.aborted) return { ok: false, code: "cancelled" };
    if (pricing?.rows.some(hasStats)) return { ok: true, kind: "stats", rows: pricing.rows, market: true };
    // When the gateway's status endpoint is closed, the model square may publish its own statistics.
    if (!squareOnly && reason !== "no_samples") {
      const square = await market();
      if (signal.aborted) return { ok: false, code: "cancelled" };
      if (square.ok && square.rows.length) return square;
    }
    if (pricing?.rows.length) return { ok: true, kind: "list", rows: pricing.rows, reason };
    const list = await getModels();
    if (list.ok && (list.rows.length || !partial?.rows.length)) return { ...list, reason };
    return partial ? { ...partial, reason } : { ...first, catalogCode: list.code };
  }

  const $ = (id) => document.getElementById("model-status-" + id);
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function btn(label, className = "ghost-button") {
    const button = el("button", className, label);
    button.type = "button";
    return button;
  }
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS(svg.namespaceURI, "use");
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", "#i-" + name);
    svg.append(use);
    return svg;
  }
  function option(label, value) {
    const node = el("option", "", label);
    node.value = value;
    return node;
  }
  const timeText = (time) => new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false }).format(time);
  const cacheKey = (p) => JSON.stringify([p.source, p.hours]);
  function rememberIn(collection, key, result, limit = 32) {
    collection.delete(key);
    collection.set(key, result);
    if (collection.size > limit) collection.delete(collection.keys().next().value);
  }
  const detailKey = (source, hours, name) => JSON.stringify([source, hours, name]);
  function getCachedDetail(source, hours, name) {
    const hit = detailCache.get(detailKey(source, hours, name));
    return fresh(hit) ? hit.data : null;
  }
  async function readModelDetail(source, hours, name, signal, force = false) {
    if (!supportsDetail(source)) return { ok: false, code: "unsupported" };
    const cached = getCachedDetail(source, hours, name);
    if (cached && !force) return cached;
    const key = detailKey(source, hours, name);
    if (force) detailCache.delete(key);
    const result = await read(pageTarget(source)?.root ?? source, "detail", hours, name, signal);
    if (signal.aborted) return { ok: false, code: "cancelled" };
    const data = result.ok ? parseDetail(result.body, name) : result;
    if (data.ok) rememberIn(detailCache, key, { time: Date.now(), data }, 96);
    return data;
  }
  function abortQueries(p) {
    p.controller?.abort();
    p.detailController?.abort();
    p.filterController?.abort();
    p.detailController = null;
    p.activeDetail = null;
    try { window.BlueEyeNative?.cancelModelStatusRequests?.(); } catch { /* Older Android build. */ }
    p.controller = new AbortController();
  }
  function closePanel() {
    const p = panel;
    if (!p) return;
    panel = null;
    abortQueries(p);
    $("rows").replaceChildren();
    $("site").textContent = "";
    $("source").replaceChildren();
    $("notice").textContent = "";
    $("time").textContent = "";
    $("page-url").value = "";
    $("origin-link").removeAttribute("href");
  }
  function resetSession() {
    if ($("dialog")?.open) $("dialog").close();
    closePanel();
    if ($("global-dialog")?.open) $("global-dialog").close();
    closeGlobal();
    cache.clear();
    pricingCache.clear();
    detailCache.clear();
  }
  function setSettings(p, settings) {
    p.settings = settings;
    p.site.modelStatus = settings;
    p.save();
    updateLink(p);
  }
  function updateLink(p) {
    const original = publicUrl(p.site.websiteUrl)?.href || pageTarget(p.source)?.url.href || (p.source ? p.source + "/" : "");
    const link = $("origin-link");
    const href = p.settings.page || original;
    link.hidden = !href;
    if (href) link.href = href;
    else link.removeAttribute("href");
    link.textContent = p.settings.page ? "打开原站状态页" : "打开原站";
  }
  function selectedSources(site, settings) {
    const roots = getSources(site);
    const page = settings.readPage ? monitorSource(settings.page) : "";
    return page && !asArray(site.tokens).some((token) => {
      const value = String(token?.value ?? "");
      return value.length >= 8 && page.includes(value);
    }) ? [...roots, page] : roots;
  }
  function syncSources(p) {
    p.sources = selectedSources(p.site, p.settings);
    if (!p.sources.includes(p.source)) p.source = p.sources[0] || "";
    $("source").replaceChildren(...p.sources.map((source) => option(prettySource(source), source)));
    $("source").value = p.source;
    $("source").disabled = p.sources.length < 2;
  }
  function open(site, { save, copy, source, hours = 24, filter = "", knownModel = false, group = "" }) {
    if (!site) return;
    if (!bound) bind();
    const sources = getSources(site);
    const settings = normalizeSettings(site.modelStatus, sources);
    const choices = selectedSources(site, settings);
    const p = { site, sources: choices, settings, source: choices.includes(source) ? source : choices.includes(settings.source) ? settings.source : choices[0] || "",
      hours: WINDOWS.includes(hours) ? hours : 24, save, copy, filter, initialModel: filter, onlyFavourites: false,
      knownModel, initialGroup: group, autoExpand: Boolean(group),
      limit: 24, controller: new AbortController(), filteredDetails: new Map(),
      result: null, pricing: null, busy: false, err: "" };
    if (panel) closePanel();
    panel = p;
    $("site").textContent = site.name;
    syncSources(p);
    $("window").value = String(p.hours);
    $("filter").value = p.filter;
    $("favourites").setAttribute("aria-pressed", "false");
    $("page-url").value = settings.page;
    $("page-error").textContent = "";
    $("settings").open = false;
    $("filters").open = false;
    for (const field of $("filter-fields").querySelectorAll("input,select")) {
      if (field.tagName === "SELECT") field.selectedIndex = 0;
      else field.value = "";
    }
    updateLink(p);
    if (!$("dialog").open) $("dialog").showModal();
    $("scroll").scrollTop = 0;
    void refresh(p);
  }
  async function refresh(p, force = false) {
    if (panel !== p) return;
    abortQueries(p);
    const signal = p.controller.signal;
    const key = cacheKey(p);
    const page = pageTarget(p.source);
    const knownPricing = page?.type === "hedgehog" ? null : pricingCache.get(page?.root ?? p.source);
    p.pricing = !force && fresh(knownPricing) ? knownPricing.data : null;
    let pricingTask;
    const getPricing = () => pricingTask ||= (p.pricing ? Promise.resolve(p.pricing) : (async () => {
      const data = await readPricing(p.source, p.hours, signal, force);
      if (panel !== p || signal.aborted || key !== cacheKey(p)) return null;
      p.pricing = data;
      updatePrices(p);
      return data;
    })());
    p.result = cache.get(key) ?? null;
    p.filteredDetails.clear();
    p.err = "";
    p.limit = 24;
    if (!p.source) { p.busy = false; render(p); return; }
    if (!force && fresh(p.result)) {
      p.busy = false; render(p); void getPricing(); void enrichSingle(p); return;
    }
    p.busy = true;
    render(p);
    const rowsTask = fetchRows(p.source, p.hours, signal, getPricing);
    void getPricing();
    const response = await rowsTask;
    if (panel !== p || signal.aborted || key !== cacheKey(p)) return;
    p.busy = false;
    if (response.ok && !(p.result?.kind === "stats" && response.kind === "list")) {
      p.result = { ...response, time: Date.now() };
      rememberIn(cache, key, p.result);
    } else {
      p.err = response.code || response.reason || "api";
    }
    render(p);
    void enrichSingle(p);
  }
  function isFavourite(p, name) {
    return p.settings.favourites.some((f) => f.source === p.source && f.name === name);
  }
  function star(p, name) {
    const favourites = p.settings.favourites.filter((f) => f.source !== p.source || f.name !== name);
    if (favourites.length === p.settings.favourites.length) favourites.push({ source: p.source, name });
    setSettings(p, { ...p.settings, favourites: favourites.slice(-80) });
    renderRows(p);
    [...$("rows").querySelectorAll(".model-status-star")].find((button) => button.dataset.name === name)?.focus();
  }
  function render(p) {
    if (panel !== p) return;
    $("refresh").disabled = p.busy || !p.source;
    $("refresh").setAttribute("aria-label", p.busy ? "读取中" : "刷新");
    $("refresh").title = p.busy ? "读取中" : "刷新";
    $("notice").textContent = !p.source ? "请保存一个 HTTPS 站点、Base URL 或公开监控页。"
      : p.busy ? "正在读取站方公开数据…"
      : p.err ? (failures[p.err] || "本次未取得模型统计") + (p.result ? "；下方是上次结果。" : "。")
      : p.result?.external ? "公开监控页 · 颜色按原页阈值"
      : p.result?.market && p.result.kind === "stats" ? "模型广场状态 · 按站方监控窗口"
      : p.result?.kind === "stats" ? "站点汇总"
      : p.result?.reason === "auth" ? "仅模型列表 · 性能统计需要站点授权。"
      : p.result?.rows.length ? "仅模型列表 · 未读取到成功率、延迟等统计。"
      : "站点暂未提供这个时间范围的模型统计。";
    $("time").textContent = p.result ? ((p.err || Date.now() - p.result.time > FRESH_MS ? "上次结果 · " : "") +
      "读取于 " + timeText(p.result.time) + (p.result.kind === "stats" && !p.result.market ? " · 查询近 " + p.hours + " 小时" : "")) : "";
    renderRows(p);
    if (!p.busy && p.autoExpand) {
      const article = [...$("rows").querySelectorAll("article")].find((card) => card.dataset.modelName === p.initialModel);
      const button = article?.querySelector(".model-status-detail-toggle");
      if (button && !button.hidden) { p.autoExpand = false; button.click(); }
    }
  }
  function renderRows(p) {
    if (panel !== p) return;
    if (p.activeDetail) closeDetail(p);
    const fromStats = p.result?.rows ?? [];
    const conditions = readConditions(localFilter);
    $("filter-active").textContent = conditions.active ? " · " + conditions.active + " 项条件" : "";
    const extra = p.initialModel && !fromStats.some((row) => row.name === p.initialModel)
      ? p.pricing?.rows.find((row) => row.name === p.initialModel) ?? (p.knownModel ? { name: p.initialModel } : null) : null;
    const byName = new Map(fromStats.map((row) => [row.name, row]));
    if (extra) byName.set(extra.name, extra);
    if (conditions.active || p.filter) {
      for (const row of p.pricing?.rows ?? []) if (!byName.has(row.name)) byName.set(row.name, row);
    }
    const raw = [...byName.values()];
    const query = searchable(p.filter);
    const terms = searchTerms(query);
    const rows = [];
    for (const row of raw) {
      const score = searchScore(row.name, query, terms), starred = isFavourite(p, row.name);
      if (score < 0 || (p.onlyFavourites && !starred)) continue;
      const detail = p.filteredDetails.get(row.name) ?? getCachedDetail(p.source, p.hours, row.name);
      const match = modelMatch(row, detail, p.pricing?.byName.get(row.name), conditions, Boolean(p.err));
      if (match) rows.push({ row, score, starred, ...match });
    }
    rows.sort((a, b) => compareMatches(a, b, conditions.sort) || Number(b.starred) - Number(a.starred));
    const area = $("rows");
    area.replaceChildren();
    if (rows.length) {
      area.append(el("p", "model-status-count", rows.length + " 个模型" + (rows.length > p.limit ? " · 当前显示 " + p.limit : "")));
      for (const item of rows.slice(0, p.limit)) area.append(card(p, item.row, conditions.tone || item.row.reportedGroups?.length ? item.status : null));
      if (rows.length > p.limit) {
        const more = btn("再显示 " + Math.min(24, rows.length - p.limit) + " 个模型");
        more.onclick = () => { p.limit += 24; renderRows(p); };
        area.append(more);
      }
    } else if (raw.length) {
      area.append(el("p", "model-status-empty", p.onlyFavourites ? "没有符合筛选条件的常看模型。" : "没有匹配的模型。"));
    }
  }
  async function enrichSingle(p) {
    p.filterController?.abort();
    if (panel !== p || p.busy || p.err || !supportsDetail(p.source) || p.result?.market || !localFilter("tone").value) return;
    const controller = new AbortController();
    p.filterController = controller;
    const query = searchable(p.filter), terms = searchTerms(query);
    const source = p.source, hours = p.hours;
    const candidates = (p.result?.rows ?? []).filter((row) => searchScore(row.name, query, terms) >= 0 && !hasSeries(row)
      && !p.filteredDetails.has(row.name) && !getCachedDetail(source, hours, row.name))
      .sort((a, b) => searchScore(b.name, query, terms) - searchScore(a.name, query, terms)).slice(0, 16);
    if (!candidates.length) return;
    $("filter-status").textContent = "正在补查匹配模型的走势…";
    try {
      for (const row of candidates) {
        const detail = await readModelDetail(source, hours, row.name, controller.signal);
        if (panel !== p || controller.signal.aborted) break;
        p.filteredDetails.set(row.name, detail);
        if (!p.activeDetail) renderRows(p);
        if (!detail.ok && ["auth", "timeout", "network", "rate_limit", "browser", "native", "redirect"].includes(detail.code)) break;
      }
    } finally {
      if (panel === p && p.filterController === controller) $("filter-status").textContent = "";
    }
  }
  function statsBlock(row) {
    const grid = el("dl", "model-status-stat-grid");
    const stats = [
      ["成功率", row.success == null ? "—" : row.success.toFixed(row.success === 100 ? 0 : 2) + "%"],
      ["平均延迟", row.latency == null ? "—" : (row.latency / 1000).toFixed(2) + " s"],
      ["吞吐", row.tps == null ? "—" : row.tps.toFixed(1) + " t/s"]
    ];
    if (row.count != null) stats.push(["请求数", row.count.toLocaleString("zh-CN")]);
    for (const [label, value] of stats) {
      const cell = el("div");
      cell.append(el("dt", "", label), el("dd", "", value));
      grid.append(cell);
    }
    return grid;
  }
  function trendBlock(points, thresholds) {
    if (!points?.length || !points.some((n) => n !== null)) return null;
    const bar = el("div", "model-status-trend");
    bar.setAttribute("role", "img");
    const dense = points.length > 48;
    bar.setAttribute("aria-label", dense ? "站方成功率走势，最右为最新一格，前面的格子显示各段最低值" : "站方返回的分段成功率走势，最右为最新一格");
    const older = points.length - 1;
    const blocks = dense ? [...Array.from({ length: 47 }, (_, index) => {
      const segment = points.slice(Math.floor(index * older / 47), Math.floor((index + 1) * older / 47));
      const present = segment.filter((n) => n !== null);
      return present.length ? Math.min(...present) : null;
    }), points[older]] : points;
    for (const pct of blocks) {
      const part = el("span", "is-" + pointTone(pct, thresholds));
      part.title = pct === null ? "无样本" : pct.toFixed(2) + "%";
      bar.append(part);
    }
    return bar;
  }
  function statusInfo(row, scope = "", previous = false) {
    const point = previous ? null : latestPoint(row);
    const tone = !previous && point == null && !hasSeries(row) && row.liveTone ? row.liveTone : pointTone(point, row.thresholds);
    const label = previous ? "待刷新" : toneNames[tone] ?? (hasSeries(row) ? "最新无样本" : hasStats(row) ? "有汇总·无走势" : "仅公开目录");
    return { tone, label, scope: scope || (row.market ? "模型广场" : ""), point };
  }
  function paintStatus(status, { tone, label, scope, point }, showLabel = false) {
    const text = label + (scope ? " · " + scope : "");
    const description = text + (point == null ? "" : "（最新一格 " + point.toFixed(2) + "%）");
    status.replaceChildren(el("span", "model-status-dot is-" + tone));
    if (showLabel) status.append(el("span", "model-status-latest-text", text));
    status.title = description;
    status.setAttribute("aria-label", description);
  }
  function latestStatus(info, showLabel = false) {
    const status = el("span", "model-status-latest");
    status.setAttribute("role", "img");
    paintStatus(status, info, showLabel);
    return status;
  }
  function addMetrics(area, row) {
    area.append(statsBlock(row));
    const bar = trendBlock(row.points, row.thresholds);
    if (bar) area.append(bar);
  }
  const priceNumber = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 8 });
  const usd = (n) => "$" + (n > 0 && n < 1e-8 ? n.toExponential(3) : priceNumber.format(n));
  function putPrice(area, price, ratio, label) {
    area.replaceChildren();
    if (!price || ratio == null) return;
    if (price.tiered) {
      area.append(el("span", "", "阶梯计费 · 详见原站价目"));
      return;
    }
    if (price.perCall != null) {
      area.append(el("span", "", label), el("strong", "", usd(price.perCall * ratio)), el("span", "", "/ 次"));
    } else {
      area.append(el("span", "", label), el("strong", "", "入 " + usd(price.input * ratio)),
        el("strong", "", "出 " + usd(price.output * ratio)), el("span", "", "/ 百万 Token"));
    }
  }
  function updateCardPrice(p, article) {
    const price = p.pricing?.byName.get(article.dataset.modelName);
    putPrice(article.querySelector(".model-status-price"), price, 1, "公开基础价");
    const groupButton = article.querySelector(".model-status-detail-toggle");
    const row = p.result?.rows.find((entry) => entry.name === article.dataset.modelName);
    groupButton.hidden = !(row?.reportedGroups?.length || (supportsDetail(p.source) && !p.result?.market
      && (p.result?.kind === "stats" || (p.knownModel && article.dataset.modelName === p.initialModel))) || price?.groups.length);
  }
  function updatePrices(p) {
    if (panel === p && (p.filter || readConditions(localFilter).active) && !p.activeDetail) {
      renderRows(p);
      return;
    }
    if (p.result && p.initialModel && !p.result.rows.some((row) => row.name === p.initialModel)
        && p.pricing?.rows.some((row) => row.name === p.initialModel)) {
      renderRows(p);
      return;
    }
    for (const article of $("rows").querySelectorAll(".model-status-card")) updateCardPrice(p, article);
    p.activeDetail?.refreshPricing?.();
  }
  function card(p, row, chosenStatus) {
    const article = el("article", "model-status-card");
    article.dataset.modelName = row.name;
    const head = el("header", "model-status-card-head");
    const name = el("h3", "", row.name);
    const actions = el("div", "model-status-card-actions");
    const copy = btn("", "model-status-mini");
    copy.append(icon("copy"));
    copy.title = "复制模型名";
    copy.setAttribute("aria-label", "复制 " + row.name);
    copy.onclick = () => p.copy(row.name);
    const starred = isFavourite(p, row.name);
    const favourite = btn(starred ? "★" : "☆", "model-status-star");
    favourite.dataset.name = row.name;
    favourite.setAttribute("aria-label", (starred ? "取消常看 " : "设为常看 ") + row.name);
    favourite.setAttribute("aria-pressed", String(starred));
    favourite.onclick = () => star(p, row.name);
    const action = btn("分组", "model-status-mini model-status-detail-toggle");
    action.disabled = p.busy;
    action.title = "查看分组";
    action.setAttribute("aria-label", "查看分组 · " + row.name);
    action.setAttribute("aria-expanded", "false");
    const area = el("div", "model-status-detail");
    area.hidden = true;
    const source = p.source, hours = p.hours;
    const defaultGroup = row.reportedGroups?.length === 1 && !hasSeries(row) && row.success == null && row.latency == null
      ? row.reportedGroups[0] : null;
    const overviewRow = () => {
      const total = getCachedDetail(source, hours, row.name)?.total;
      return hasSeries(row) || !hasSeries(total) ? row : { ...row, points: total.points };
    };
    const status = latestStatus(statusInfo(overviewRow(), "", Boolean(p.err)));
    const overviewTrend = el("div", "model-status-overview-trend");
    const paintOverview = () => {
      const overview = overviewRow();
      const reported = chosenStatus?.metric && row.reportedGroups?.length ? chosenStatus.metric : defaultGroup;
      paintStatus(status, chosenStatus ?? (reported ? statusInfo(reported, reported.name + " 分组", Boolean(p.err)) : statusInfo(overview, "", Boolean(p.err))));
      const timeline = reported && !hasSeries(overview) ? reported : overview;
      const bar = trendBlock(timeline.points, timeline.thresholds);
      overviewTrend.replaceChildren(...(bar ? [bar] : []));
      overviewTrend.hidden = !bar;
    };
    action.onclick = () => {
      if (p.activeDetail?.area === area) closeDetail(p);
      else void openDetail(p, row.name, area, action, status, paintOverview, overviewTrend, chosenStatus?.group);
    };
    actions.append(action, copy, favourite);
    const identity = el("div", "model-status-card-identity");
    identity.append(status, name);
    head.append(identity, actions);
    article.append(head);
    const displayGroup = (row.reportedGroups?.length ? chosenStatus?.metric : null) ?? defaultGroup;
    if (displayGroup) {
      article.append(el("p", "model-status-group-name", displayGroup.name + " 分组 · 监控页"),
        statsBlock(displayGroup));
    } else if (row.reportedGroups?.length && !hasSeries(row)) {
      article.append(el("p", "section-hint", "按分组公布 · 点分组看详情"));
    } else if (hasStats(row)) article.append(statsBlock(row));
    else if (p.result?.kind === "stats") article.append(el("p", "section-hint", "该模型暂无汇总"));
    paintOverview();
    article.append(overviewTrend);
    const price = el("p", "model-status-price");
    price.title = "站方公开美元参考价；基础价未计分组和账户折扣";
    article.append(price, area);
    updateCardPrice(p, article);
    return article;
  }
  function closeDetail(p) {
    p.detailController?.abort();
    p.detailController = null;
    if (!p.activeDetail) return;
    const { area, action, restore } = p.activeDetail;
    p.activeDetail = null;
    area.hidden = true;
    area.replaceChildren();
    action.title = "查看分组";
    action.setAttribute("aria-label", "查看分组 · " + action.closest("article").dataset.modelName);
    action.setAttribute("aria-expanded", "false");
    restore();
  }
  async function openDetail(p, name, area, action, status, restore, overviewTrend, requestedGroup) {
    closeDetail(p);
    const controller = new AbortController();
    p.detailController = controller;
    const detailView = { area, action, restore };
    p.activeDetail = detailView;
    area.hidden = false;
    action.title = "收起分组";
    action.setAttribute("aria-label", "收起分组 · " + name);
    action.setAttribute("aria-expanded", "true");
    const reportedGroups = p.result?.rows.find((row) => row.name === name)?.reportedGroups ?? [];
    let detail = { ok: true, groups: reportedGroups };
    if (supportsDetail(p.source) && !p.result?.market && (p.result?.kind === "stats" || (p.knownModel && name === p.initialModel))) {
      area.replaceChildren(el("p", "section-hint", "正在读取分组…"));
      detail = await readModelDetail(p.source, p.hours, name, controller.signal, Boolean(p.err));
      if (panel !== p || controller.signal.aborted || p.activeDetail !== detailView) return;
      restore();
    }
    const label = el("label", "field model-status-group");
    const select = el("select");
    select.setAttribute("aria-label", "模型分组");
    label.append(select);
    const content = el("div", "model-status-group-content");
    const statsByGroup = new Map((detail.groups || []).map((group) => [group.name, group]));
    const problem = !detail.ok ? "分组统计未取得 · " + (failures[detail.code] || "站点未提供分组数据") : "站点未返回分组统计。";
    const oneGroup = el("p", "model-status-group-name");
    const renderGroup = () => {
      content.replaceChildren();
      if (select.value === "") {
        restore();
        if (!select.options.length) content.append(el("p", "section-hint", problem));
        return;
      }
      const group = statsByGroup.get(select.value);
      overviewTrend.hidden = true;
      paintStatus(status, statusInfo(group ?? {}, select.value + " 分组"));
      if (group && hasStats(group)) addMetrics(content, group);
      else content.append(el("p", "section-hint", detail.ok ? "这个分组暂无统计。" : problem));
      const price = p.pricing?.byName.get(name);
      const area = el("p", "model-status-price");
      if (price?.groups.includes(select.value)) {
        putPrice(area, price, p.pricing.groupRatios.get(select.value), "公开分组价");
        content.append(area);
      }
    };
    select.onchange = renderGroup;
    detailView.refreshPricing = () => {
      const previous = select.value || requestedGroup || (name === p.initialModel ? p.initialGroup : "");
      const groups = [...new Set([...statsByGroup.keys(), ...(p.pricing?.byName.get(name)?.groups ?? [])])];
      select.replaceChildren(...groups.map((group) => option(group, group)));
      if (groups.length > 1) select.prepend(option("选择模型分组", ""));
      select.value = groups.length === 1 ? groups[0] : groups.includes(previous) ? previous : "";
      label.hidden = groups.length < 2;
      oneGroup.hidden = groups.length !== 1;
      oneGroup.textContent = groups.length === 1 ? groups[0] + " 分组" : "";
      renderGroup();
    };
    area.replaceChildren(label, oneGroup, content);
    detailView.refreshPricing();
  }
  const global = (id) => $("global-" + id);

  function openGlobal(sites, groups, showModel) {
    if (!bound) bind();
    if (globalPanel) closeGlobal();
    const entries = sites.map((site) => {
      const roots = getSources(site);
      const settings = normalizeSettings(site.modelStatus, roots);
      const sources = selectedSources(site, settings);
      const preferred = roots.includes(settings.source) ? settings.source : roots[0];
      const page = sources.find((source) => pageTarget(source));
      return { id: site.id, name: site.name, groupId: site.groupId, sources, preferred, page };
    });
    const p = { entries, showModel, results: new Map(), run: null, busy: false, stopped: false, limit: 40 };
    globalPanel = p;
    global("form").reset();
    global("options").open = false;
    global("coverage").open = false;
    global("group").replaceChildren(option("全部收藏", ""), option("未分组", "none"),
      ...groups.map((group) => option(group.name, "group:" + group.id)));
    global("group").value = "";
    global("window").value = "24";
    renderGlobal(p);
    if (!global("dialog").open) global("dialog").showModal();
    global("scroll").scrollTop = 0;
  }

  function stopGlobal(p) {
    if (!p.busy) return;
    p.run.controller.abort();
    p.busy = false;
    p.stopped = true;
    renderGlobal(p);
  }

  function closeGlobal() {
    const p = globalPanel;
    if (!p) return;
    globalPanel = null;
    p.run?.controller.abort();
    global("form").reset();
    global("group").replaceChildren();
    global("notice").textContent = "";
    global("rows").replaceChildren();
    global("coverage-list").replaceChildren();
    global("coverage").hidden = true;
  }

  function globalScope(p) {
    const group = global("group").value;
    const primaryOnly = !global("all-sources").checked;
    const targetMap = new Map();
    const entries = p.entries.filter((entry) => !group || (group === "none" ? !entry.groupId : "group:" + entry.groupId === group));
    for (const entry of entries) {
      for (const source of primaryOnly ? [entry.preferred, entry.page].filter(Boolean) : entry.sources) {
        if (!targetMap.has(source)) targetMap.set(source, []);
        targetMap.get(source).push(entry);
      }
    }
    return { targetMap, skipped: entries.filter((entry) => !entry.sources.length) };
  }

  async function runGlobal(p) {
    const hours = Number(global("window").value);
    if (globalPanel !== p || p.busy || !WINDOWS.includes(hours)) return;
    const { targetMap, skipped } = globalScope(p);
    if (!targetMap.size) { renderGlobal(p); return; }
    const force = Boolean(p.run);
    const query = searchable(global("keyword").value.trim());
    const terms = searchTerms(query);
    const enrich = Boolean(query || global("tone").value);
    const run = { controller: new AbortController(), hours, targetMap, skipped, query, force, detailBudget: 48, detailCapped: false };
    const signal = run.controller.signal;
    p.run = run;
    p.results.clear();
    p.stopped = false;
    p.busy = true;
    p.limit = 40;
    global("coverage").open = false;
    renderGlobal(p);
    const targets = targetMap.entries();
    const work = async () => {
      for (const [source, entries] of targets) {
        const key = cacheKey({ source, hours });
        const previous = cache.get(key);
        const item = { entries, rows: new Map(), details: new Map(), pricing: null, read: false, done: false, code: "" };
        const current = () => globalPanel === p && !signal.aborted && p.run === run;
        p.results.set(source, item);
        let pricingTask;
        const getPricing = () => pricingTask ||= readPricing(source, hours, signal, force).then((pricing) => {
          if (current() && pricing) {
            item.pricing = pricing;
            for (const row of pricing.rows) if (!item.rows.has(row.name)) item.rows.set(row.name, row);
            item.read = true;
            renderGlobal(p);
          }
          return pricing;
        });
        let modelsTask;
        const getModels = () => modelsTask ||= readModelList(source, hours, signal);
        const rowsTask = !force && fresh(previous) ? previous : fetchRows(source, hours, signal, getPricing, getModels);
        void getPricing();
        const status = await rowsTask;
        if (!current()) return;
        if (status.ok) {
          for (const row of status.rows) item.rows.set(row.name, row);
          item.read = true;
          if (status !== previous && !(previous?.kind === "stats" && status.kind === "list")) {
            rememberIn(cache, key, { ...status, time: Date.now() });
          }
        } else item.code = status.code === "response" && status.catalogCode ? status.catalogCode : status.code;
        renderGlobal(p);
        await pricingTask;
        if (!current()) return;
        if (enrich && item.read && supportsDetail(source) && !status.market) {
          const score = (row) => searchScore(row.name, query, terms);
          if (query && ![...item.rows.values()].some((row) => score(row) >= 0)) {
            const catalog = await getModels();
            if (!current()) return;
            if (catalog.ok) {
              for (const row of catalog.rows) if (!item.rows.has(row.name)) item.rows.set(row.name, row);
              renderGlobal(p);
            }
          }
          const candidates = [...item.rows.values()].filter((row) => !hasSeries(row) && score(row) >= 0)
            .sort((a, b) => score(b) - score(a));
          // Use the station-published exact model names, not the typed keyword.
          const limit = Math.min(8, run.detailBudget);
          run.detailCapped ||= candidates.length > limit;
          for (const row of candidates.slice(0, limit)) {
            if (run.detailBudget <= 0) { run.detailCapped = true; break; }
            run.detailBudget--;
            const detail = await readModelDetail(source, hours, row.name, signal, force);
            if (!current()) return;
            item.details.set(row.name, detail);
            renderGlobal(p);
            // An unavailable endpoint is usually source-wide; don't call again for every matching model.
            if (!detail.ok && ["auth", "timeout", "network", "rate_limit", "browser", "native", "redirect"].includes(detail.code)) break;
          }
        }
        item.done = true;
        renderGlobal(p);
      }
    };
    await Promise.all([work(), work()]);
    if (globalPanel !== p || signal.aborted || p.run !== run) return;
    p.busy = false;
    renderGlobal(p);
  }

  const FILTER_IDS = ["tone", "success", "latency", "price-kind", "max-price", "sort"];
  const localFilter = (id) => $("condition-" + id);
  function readConditions(field) {
    const get = (id) => field(id).value;
    const numeric = (id) => get(id) && field(id).validity.valid ? field(id).valueAsNumber : null;
    const success = numeric("success"), latency = numeric("latency"), maxPrice = numeric("max-price");
    const tone = get("tone"), sort = get("sort"), priceKind = get("price-kind");
    return { success, latency, maxPrice, tone, sort, priceKind,
      active: [success, latency, maxPrice].filter((value) => value != null).length + Number(Boolean(tone)) };
  }
  function globalStatus(row, detail, tone, eligibleGroup = () => true, preferOne = false) {
    const overall = hasSeries(row) || row.liveTone ? row : hasSeries(detail?.total) ? detail.total : null;
    const groups = (row.reportedGroups ?? detail?.groups ?? []).filter(hasSeries);
    const states = overall ? [statusInfo(overall)] : groups
      .filter((group) => latestPoint(group) != null && eligibleGroup(group))
      .map((group) => ({ ...statusInfo(group, group.name + " 分组"), group: group.name, metric: group }));
    if (!states.length) {
      const missing = row.reportedGroups?.filter((group) => latestPoint(group) == null && eligibleGroup(group)) ?? [];
      if (missing.length) {
        states.push(...missing.map((group) => ({ ...statusInfo(group, group.name + " 分组"), group: group.name, metric: group })));
      } else states.push(groups.length ? { tone: "none", label: "分组最新无样本" } : statusInfo(row));
    }
    if (tone) return states.find((state) => state.tone === tone);
    if (states.length === 1 || preferOne) return states[0];
    return states.some((state) => state.tone !== "none") ? { tone: "multiple", label: states.length + " 组有走势" }
      : { tone: "none", label: "分组最新无样本" };
  }
  function modelMatch(row, detail, price, conditions, previous = false) {
    const { success, latency, maxPrice, tone, priceKind, sort } = conditions;
    const value = price?.[priceKind] ?? null;
    if (maxPrice != null && (value == null || value > maxPrice)) return null;
    const eligible = (stats) => (success == null || (stats.success != null && stats.success >= success))
      && (latency == null || (stats.latency != null && stats.latency / 1000 <= latency));
    const groupOnly = row.reportedGroups?.length && row.success == null && row.latency == null;
    const status = previous ? statusInfo(row, "", true)
      : globalStatus(row, detail, tone, groupOnly ? eligible : undefined,
        groupOnly && (success != null || latency != null || sort === "success" || sort === "latency"));
    if (!status || (tone && status.tone !== tone)) return null;
    const metric = groupOnly && status.metric ? status.metric : row;
    if (!eligible(metric)) return null;
    return { value, metric, status };
  }
  function compareMatches(a, b, sort) {
    const ascending = (a, b) => (a ?? Infinity) - (b ?? Infinity);
    const descending = (a, b) => (b ?? -Infinity) - (a ?? -Infinity);
    const order = sort === "price" ? ascending(a.value, b.value)
      : sort === "latency" ? ascending(a.metric.latency, b.metric.latency)
      : sort === "success" ? descending(a.metric.success, b.metric.success) : 0;
    return order || b.score - a.score;
  }
  function globalResults(p) {
    const query = searchable(global("keyword").value.trim());
    const terms = searchTerms(query);
    const conditions = readConditions(global);
    const results = [], keywordHits = new Set(), visibleHits = new Set();
    for (const [source, item] of p.results) {
      for (const row of item.rows.values()) {
        const score = searchScore(row.name, query, terms);
        if (score < 0) continue;
        keywordHits.add(source);
        const detail = item.details.get(row.name) ?? (p.run.force ? null : getCachedDetail(source, p.run.hours, row.name));
        const price = item.pricing?.byName.get(row.name);
        const match = modelMatch(row, detail, price, conditions);
        if (!match) continue;
        visibleHits.add(source);
        for (const entry of item.entries) results.push({ row, source, entry, price, score, ...match });
      }
    }
    results.sort((a, b) => compareMatches(a, b, conditions.sort));
    return { results, keywordHits, visibleHits, active: conditions.active };
  }

  function renderCoverage(p, keywordHits, visibleHits) {
    const details = global("coverage"), list = global("coverage-list");
    const run = p.run;
    details.hidden = !run;
    list.replaceChildren();
    if (!run) return;
    const sections = { unmatched: [], unread: [], filtered: [], pending: [], skipped: [] };
    for (const [source, entries] of run.targetMap) {
      const item = p.results.get(source);
      const key = visibleHits.has(source) ? "" : !item?.done ? "pending"
        : !item.read ? "unread" : keywordHits.has(source) ? "filtered" : "unmatched";
      if (key) sections[key].push({ source, entries, code: item?.code, count: item?.rows.size });
    }
    for (const entry of run.skipped) sections.skipped.push({ entries: [entry] });
    const labels = {
      unmatched: ["公开结果未命中", "未公开或登录后可见的模型暂时无法确认。"],
      unread: ["来源未读到公开数据", "这里数的是来源，不是灰色模型。"],
      filtered: ["有匹配模型，但被当前条件筛掉", "可放宽颜色、成功率、延迟或价格条件。"],
      pending: [p.stopped ? "查询未完成" : "仍在查询", ""],
      skipped: ["未查询（无可用 HTTPS 来源）", ""]
    };
    const summary = [];
    for (const [key, rows] of Object.entries(sections)) {
      if (!rows.length) continue;
      const [label, note] = labels[key];
      const section = el("section");
      section.append(el("h3", "", label + " · " + rows.length));
      if (note) section.append(el("p", "section-hint", note));
      const ul = el("ul");
      for (const { source, entries, code, count } of rows) {
        const names = entries.map((entry) => entry.name).join("、");
        const domain = source ? " · " + prettySource(source) : "";
        const reason = key === "unread" && failures[code] ? " · " + failures[code]
          : key === "unmatched" ? " · 已看到 " + count + " 个公开型号" : "";
        ul.append(el("li", "", names + domain + reason));
      }
      section.append(ul);
      list.append(section);
      if (key === "unmatched") summary.push(rows.length + " 未命中");
      else if (key === "unread") summary.push(rows.length + " 读取失败");
      else if (key === "filtered") summary.push(rows.length + " 被筛掉");
    }
    if (!list.childElementCount) list.append(el("p", "section-hint", "所查来源都有符合条件的结果。"));
    global("coverage-title").textContent = "来源核对" + (summary.length ? " · " + summary.join(" · ") : "");
  }

  function renderGlobal(p) {
    if (globalPanel !== p) return;
    const { results, active, keywordHits, visibleHits } = globalResults(p);
    const scope = globalScope(p);
    const run = p.run;
    global("active").textContent = active ? active + " 项条件" : "";
    global("run").disabled = p.busy || !scope.targetMap.size;
    global("run").textContent = p.busy ? "搜索中" : run ? "重新查询" : "搜索";
    global("stop").hidden = !p.busy;
    const completed = [...p.results.values()].filter((item) => item.done);
    const missing = completed.filter((item) => !item.read).length;
    const skippedCount = (run?.skipped ?? scope.skipped).length;
    const skipped = skippedCount ? " · " + skippedCount + " 站无可用 HTTPS 来源" : "";
    global("notice").textContent = run
      ? (p.stopped ? "已停止 · " : "") + "近 " + run.hours + " 小时 · 已查 " + completed.length + "/" + run.targetMap.size
        + " 个来源" + (missing ? " · " + missing + " 个来源未读到公开数据" : "") + " · " + results.length + " 条模型匹配" + skipped
      : (scope.targetMap.size ? "准备查询 " + scope.targetMap.size + " 个来源" : "所选收藏没有可查询的 HTTPS 来源") + skipped;
    renderCoverage(p, keywordHits, visibleHits);
    const area = global("rows");
    area.replaceChildren();
    const keyword = searchable(global("keyword").value.trim());
    if (run?.detailCapped || (run && keyword !== run.query)) {
      area.append(el("p", "model-status-count", keyword === run.query
        ? "部分走势未补查，缩小关键词后可以重新查询。" : "关键词已更新，点击重新查询可补查匹配模型的走势。"));
    }
    for (const { row, source, entry, price, status, metric } of results.slice(0, p.limit)) {
      const article = el("article", "model-status-card model-status-global-card");
      const head = el("header", "model-status-card-head");
      head.append(el("h3", "", row.name));
      const show = btn("查看", "model-status-mini");
      show.setAttribute("aria-label", "查看 " + entry.name + " 的 " + row.name);
      show.onclick = () => {
        stopGlobal(p);
        p.showModel(entry.id, { source, hours: run.hours, filter: row.name, group: status.group || "", knownModel: true });
      };
      const actions = el("div", "model-status-card-actions model-status-global-actions");
      actions.append(latestStatus(status, true), show);
      head.append(actions);
      const meta = el("p", "model-status-global-source", entry.name + " · " + prettySource(source));
      article.append(head, meta);
      if (row.reportedGroups?.length && metric === row && row.success == null && row.latency == null) {
        article.append(el("p", "section-hint", "指标按分组公布"));
      } else if (hasStats(metric)) article.append(statsBlock(metric));
      else article.append(el("p", "section-hint", "暂无公开性能统计"));
      const info = el("p", "model-status-price");
      putPrice(info, price, 1, "公开基础价");
      article.append(info);
      area.append(article);
    }
    if (results.length > p.limit) {
      const more = btn("再显示 " + Math.min(40, results.length - p.limit) + " 条");
      more.onclick = () => { p.limit += 40; renderGlobal(p); };
      area.append(more);
    } else if (run && !p.busy && !results.length) {
      area.append(el("p", "model-status-empty", missing === run.targetMap.size ? "这次没有读到公开模型数据，可稍后重新查询。"
        : "暂无符合条件的模型。可放宽筛选，也可在「来源核对」查看各来源的情况。"));
    }
  }

  function bindGlobal() {
    global("dialog").addEventListener("close", () => { if (!global("dialog").open) closeGlobal(); });
    global("form").onsubmit = (event) => {
      event.preventDefault();
      if (globalPanel) void runGlobal(globalPanel);
    };
    global("stop").onclick = () => { if (globalPanel) stopGlobal(globalPanel); };
    for (const id of ["keyword", "success", "latency", "max-price", "sort", "price-kind", "tone"]) {
      global(id).oninput = () => {
        if (!globalPanel) return;
        globalPanel.limit = 40;
        renderGlobal(globalPanel);
      };
    }
    for (const id of ["group", "window", "all-sources"]) {
      global(id).onchange = () => {
        const p = globalPanel;
        if (!p) return;
        p.run?.controller.abort();
        p.run = null;
        p.busy = p.stopped = false;
        p.results.clear();
        renderGlobal(p);
      };
    }
  }
  function bind() {
    if (bound) return;
    bound = true;
    bindGlobal();
    for (const id of FILTER_IDS) {
      const label = global(id).closest("label").cloneNode(true);
      const field = label.querySelector("input,select");
      field.id = "model-status-condition-" + id;
      field.oninput = () => {
        if (!panel) return;
        panel.limit = 24;
        renderRows(panel);
        void enrichSingle(panel);
      };
      $("filter-fields").append(label);
    }
    $("dialog").addEventListener("close", () => { if (!$("dialog").open) closePanel(); });
    $("refresh").onclick = () => { if (panel) void refresh(panel, true); };
    $("source").onchange = () => {
      const p = panel;
      if (!p || !p.sources.includes($("source").value)) return;
      p.source = $("source").value;
      p.knownModel = p.autoExpand = false;
      p.initialGroup = "";
      setSettings(p, { ...p.settings, source: p.source });
      void refresh(p);
    };
    $("window").onchange = () => {
      const hours = Number($("window").value);
      if (panel && WINDOWS.includes(hours)) { panel.hours = hours; void refresh(panel); }
    };
    $("filter").oninput = () => {
      if (panel) { panel.filter = $("filter").value.trim().slice(0, 120); panel.limit = 24; renderRows(panel); void enrichSingle(panel); }
    };
    $("favourites").onclick = () => {
      if (!panel) return;
      panel.onlyFavourites = !panel.onlyFavourites;
      $("favourites").setAttribute("aria-pressed", String(panel.onlyFavourites));
      panel.limit = 24;
      renderRows(panel);
    };
    $("save-page").onclick = () => {
      const p = panel;
      if (!p) return;
      const value = $("page-url").value.trim();
      const url = value ? publicUrl(value) : null;
      if (value && !url) { $("page-error").textContent = "请输入不含账号信息和参数的 HTTPS 网页地址。"; return; }
      const monitor = monitorSource(url?.href);
      const settings = { ...p.settings, page: url?.href || "", readPage: Boolean(monitor) };
      if (monitor && !selectedSources(p.site, settings).includes(monitor)) {
        $("page-error").textContent = "页面地址不能包含已保存的令牌。";
        return;
      }
      if (monitor) p.source = monitor;
      else if (pageTarget(p.source)) p.source = getSources(p.site)[0] || "";
      p.knownModel = p.autoExpand = false;
      p.initialGroup = "";
      setSettings(p, { ...settings, source: p.source });
      syncSources(p);
      $("page-error").textContent = monitor ? "已保存，正在读取公开状态。"
        : url ? "已保存跳转入口；该地址暂不能直接读取。" : "已恢复默认原站入口。";
      void refresh(p, true);
    };
    $("origin-link").onclick = (event) => {
      const href = $("origin-link").getAttribute("href");
      if (!href) { event.preventDefault(); return; }
      if (window.BlueEyeNative) { event.preventDefault(); window.open(href, "_blank", "noopener,noreferrer"); }
    };
  }

  window.BlueEyeModelStatus = {
    open, openGlobal, resetSession, getSources, normalizeSettings,
    onResult(id, encoded) {
      const request = pending.get(id);
      if (!request) return;
      try {
        const result = JSON.parse(encoded);
        request.end(result && typeof result === "object" ? result : { ok: false, code: "response" });
      } catch { request.end({ ok: false, code: "response" }); }
    },
    onResultPart(id, part, done) {
      const request = pending.get(id);
      if (!request) return;
      if (typeof part !== "string" || request.length + part.length > request.limit + 1024) {
        request.end({ ok: false, code: "response" }); return;
      }
      request.parts.push(part);
      request.length += part.length;
      if (done) this.onResult(id, request.parts.join(""));
    }
  };
})();
