/* Crawlvane audit widget. Paste where the widget should appear:
   <script src="https://YOUR_DOMAIN/widget.js" data-widget="WIDGET_ID" async></script> */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var id = s.getAttribute("data-widget");
  if (!id || !/^[\w-]{6,64}$/.test(id)) return;
  var origin = new URL(s.src).origin;
  var f = document.createElement("iframe");
  f.src = origin + "/embed/" + id;
  f.title = "Website audit";
  f.loading = "lazy";
  f.style.cssText = "width:100%;max-width:720px;border:0;height:420px;display:block;margin:0 auto;color-scheme:normal";
  s.parentNode.insertBefore(f, s);
  window.addEventListener("message", function (e) {
    if (e.origin !== origin || e.source !== f.contentWindow || !e.data || e.data.type !== "crawlvane:height") return;
    var h = Number(e.data.height);
    if (h > 0 && h < 5000) f.style.height = h + "px";
  });
})();
