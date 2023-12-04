!(function () {
  try {
    let e = localStorage.getItem("mode") || void 0;
    const t = {
        defaultMode: "system",
        defaultLightColorScheme: "light",
        defaultDarkColorScheme: "dark",
        modeStorageKey: "joy-mode",
        colorSchemeStorageKey: "DEFAULT_COLOR_SCHEME_STORAGE_KEY",
        attribute: "class",
        colorSchemeNode: "document.documentElement",
      },
      o = document.cookie.match(/color-scheme=([^;]+)/);
    o
      ? (e = o[0].split("=")[1])
      : ((e = localStorage.getItem(t.modeStorageKey) || t.defaultMode),
        console.debug("mode", e));
    let a = e,
      c = "";
    "system" === e &&
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? ((a = "dark"),
          (c =
            localStorage.getItem(`${t.colorSchemeStorageKey}-dark`) ||
            t.defaultDarkColorScheme))
        : ((a = "light"),
          (c =
            localStorage.getItem(`${t.colorSchemeStorageKey}-light`) ||
            t.defaultLightColorScheme))),
      "light" === e &&
        (c =
          localStorage.getItem(`${t.colorSchemeStorageKey}-light`) ||
          t.defaultLightColorScheme),
      "dark" === e &&
        (c =
          localStorage.getItem(`${t.colorSchemeStorageKey}-dark`) ||
          t.defaultDarkColorScheme),
      c
        ? document.body.setAttribute(t.attribute, `bg-honeycomb ${c}`)
        : a && document.body.setAttribute(t.attribute, `bg-honeycomb ${a}`);
  } catch {}
})();
