(function initTheme() {
  (function () {
    try {
      let mode = localStorage.getItem("mode") || undefined;
      const thing = {
        defaultMode: "system",
        defaultLightColorScheme: "light",
        defaultDarkColorScheme: "dark",
        modeStorageKey: "joy-mode",
        colorSchemeStorageKey: "DEFAULT_COLOR_SCHEME_STORAGE_KEY",
        attribute: "class",
        colorSchemeNode: "document.documentElement",
      };
      console.group("running theme.js");
      const initialColorSchemeCookie =
        document.cookie.match(/color-scheme=([^;]+)/);
      if (initialColorSchemeCookie) {
        mode = initialColorSchemeCookie[0].split("=")[1];
        console.debug("initialColorSchemeCookie", mode);
      } else {
        mode = localStorage.getItem(thing.modeStorageKey) || thing.defaultMode;
        console.debug("mode", mode);
      }
      let cssColorScheme = mode;
      let colorScheme = "";
      if (mode === "system") {
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        if (mql.matches) {
          cssColorScheme = "dark";
          colorScheme =
            localStorage.getItem(`${thing.colorSchemeStorageKey}-dark`) ||
            thing.defaultDarkColorScheme;
        } else {
          cssColorScheme = "light";
          colorScheme =
            localStorage.getItem(`${thing.colorSchemeStorageKey}-light`) ||
            thing.defaultLightColorScheme;
        }
      }
      if (mode === "light") {
        colorScheme =
          localStorage.getItem(`${thing.colorSchemeStorageKey}-light`) ||
          thing.defaultLightColorScheme;
      }
      if (mode === "dark") {
        colorScheme =
          localStorage.getItem(`${thing.colorSchemeStorageKey}-dark`) ||
          thing.defaultDarkColorScheme;
      }
      if (colorScheme) {
        document.body.setAttribute(
          thing.attribute,
          `bg-honeycomb ${colorScheme}`,
        );
      } else if (cssColorScheme) {
        document.body.setAttribute(
          thing.attribute,
          `bg-honeycomb ${cssColorScheme}`,
        );
      }
    } catch (e) {
    } finally {
      console.groupEnd();
    }
  })();
})();