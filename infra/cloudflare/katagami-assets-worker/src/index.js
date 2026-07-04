const ALLOWED_PREFIXES = [
  "katagami/design-languages/",
  "katagami/art-styles/",
  "katagami/palettes/",
  "katagami/writing-styles/",
  "published-assets/",
];

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD, OPTIONS", ...corsHeaders() },
      });
    }

    const key = objectKeyFromPath(url.pathname);
    if (!isAllowedPublicAssetKey(key)) {
      return notFound();
    }

    if (request.method === "GET") {
      const cached = await caches.default.match(request);
      if (cached) {
        return withAssetCacheHeader(cached, "HIT");
      }
    }

    const object = request.method === "HEAD"
      ? await env.PUBLISHED_ASSETS.head(key)
      : await env.PUBLISHED_ASSETS.get(key);

    if (!object) {
      return notFound();
    }

    const headers = assetHeaders(object, key);
    const response = new Response(request.method === "HEAD" ? null : object.body, { headers });

    if (request.method === "GET") {
      ctx.waitUntil(caches.default.put(request, response.clone()));
    }

    return withAssetCacheHeader(response, "MISS");
  },
};

function objectKeyFromPath(pathname) {
  const trimmed = pathname.replace(/^\/+/, "");
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return "";
  }
}

function isAllowedPublicAssetKey(key) {
  if (!key || key.includes("\0")) return false;
  if (key.split("/").some((segment) => segment === "." || segment === "..")) return false;
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function assetHeaders(object, key) {
  const headers = new Headers(corsHeaders());
  object.writeHttpMetadata(headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", fallbackContentType(key));
  }
  headers.set("Cache-Control", IMMUTABLE_CACHE_CONTROL);
  headers.set("CDN-Cache-Control", IMMUTABLE_CACHE_CONTROL);
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function fallbackContentType(key) {
  if (key.endsWith(".html")) return "text/html; charset=utf-8";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match, If-Modified-Since",
  };
}

function notFound() {
  return new Response("not found", {
    status: 404,
    headers: { "Cache-Control": "public, max-age=60", ...corsHeaders() },
  });
}

function withAssetCacheHeader(response, value) {
  const headers = new Headers(response.headers);
  headers.set("X-Katagami-Asset-Cache", value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
