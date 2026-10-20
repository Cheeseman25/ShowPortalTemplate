/** Tailwind v3 config. Theme colors come from the show settings. */
const show = require("./show/show.config.js");

module.exports = {
  content: ["./src/**/*.{js,jsx,html}"],
  theme: {
    extend: {
      colors: {
        primary: show.theme.primary,
        accent: show.theme.accent,
        page: show.theme.pageGradient,
      },
    },
  },
};
