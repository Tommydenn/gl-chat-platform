/**
 * Great Lakes Chat Widget — Loader
 *
 * One-line embed:
 *   <script src="https://yourdomain.com/widget/gl-loader.js"
 *     data-community-id="YOUR_COMMUNITY_ID"
 *     data-api="https://yourdomain.com"></script>
 *
 * The loader fetches community config from the API, loads the widget JS,
 * and injects the <gl-chat> element with the config.
 *
 * Attributes:
 *   data-community-id   — Required. Community UUID or slug.
 *   data-api             — API base URL (default: same origin)
 *   data-position        — "right" or "left"
 *   data-auto-open       — "true" to auto-open after 5s
 */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector('script[src*="gl-loader"]');
  if (!script) return;

  var communityId = script.getAttribute("data-community-id");
  var apiBase = script.getAttribute("data-api") || window.location.origin;
  var position = script.getAttribute("data-position");
  var autoOpen = script.getAttribute("data-auto-open") === "true";

  // Normalize apiBase: remove trailing slash
  if (apiBase.endsWith("/")) {
    apiBase = apiBase.slice(0, -1);
  }

  // Resolve widget.js path (same directory as loader)
  var widgetSrc = script.src.replace(/gl-loader\.js(\?.*)?$/, "gl-widget.js");

  function loadWidget(config) {
    var s = document.createElement("script");
    s.src = widgetSrc;
    s.onload = function () {
      var el = document.createElement("gl-chat");

      // Merge overrides
      if (position) config.position = position;
      if (autoOpen) config.autoOpen = true;
      // Set apiEndpoint to the base URL (not the /api/leads endpoint)
      config.apiEndpoint = apiBase;

      el.setAttribute("config", JSON.stringify(config));
      document.body.appendChild(el);
    };
    document.body.appendChild(s);
  }

  function init() {
    if (!communityId) {
      console.warn("[GL Chat] No data-community-id specified. Using defaults.");
      loadWidget({});
      return;
    }

    // Fetch config from API
    var xhr = new XMLHttpRequest();
    xhr.open("GET", apiBase + "/api/communities/" + encodeURIComponent(communityId));
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          loadWidget(JSON.parse(xhr.responseText));
        } catch (e) {
          console.warn("[GL Chat] Failed to parse config, using defaults.");
          loadWidget({});
        }
      } else {
        console.warn("[GL Chat] API returned " + xhr.status + ", using defaults.");
        loadWidget({});
      }
    };
    xhr.onerror = function () {
      console.warn("[GL Chat] API unreachable, using defaults.");
      loadWidget({});
    };
    xhr.send();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
