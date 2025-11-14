/**
 * Dark theme support for cockpit-apt
 *
 * Listens to Cockpit's theme preferences and system dark mode.
 * Applies PatternFly v6 dark theme class to document root.
 */

function debug(...args: unknown[]) {
  if (window.debugging === "all" || window.debugging?.includes("style")) {
    console.debug(`cockpit-apt dark-theme:`, ...args);
  }
}

function setDarkMode(style?: string) {
  const themeStyle = style || localStorage.getItem("shell:style") || "auto";
  let darkMode = false;

  // Check if dark mode should be enabled
  if (themeStyle === "dark") {
    darkMode = true;
  } else if (themeStyle === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    darkMode = true;
  }

  debug(`Setting theme to ${darkMode ? "dark" : "light"} (style=${themeStyle})`);

  // Apply PatternFly v6 dark theme class
  if (darkMode) {
    document.documentElement.classList.add("pf-v6-theme-dark");
  } else {
    document.documentElement.classList.remove("pf-v6-theme-dark");
  }
}

// Listen for localStorage changes from other tabs/windows
window.addEventListener("storage", (event) => {
  if (event.key === "shell:style") {
    debug(`Storage changed: ${event.oldValue} → ${event.newValue}`);
    setDarkMode();
  }
});

// Listen for Cockpit shell theme changes in same window
window.addEventListener("cockpit-style", (event) => {
  if (event instanceof CustomEvent) {
    const style = event.detail.style;
    debug(`Cockpit style event: ${style}`);
    setDarkMode(style);
  }
});

// Listen for OS theme preference changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  debug(
    `OS theme changed: ${window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"}`
  );
  setDarkMode();
});

// Set initial theme
setDarkMode();
