// Keeps repository-local production builds deterministic and offline. Next's
// font loader accepts this response map through
// NEXT_FONT_GOOGLE_MOCKED_RESPONSES and resolves each requested family to a
// system-local fallback instead of contacting Google.
const variableFontCss = (family) => `
  @font-face {
    font-family: "${family}";
    font-style: normal;
    font-weight: 100 900;
    src: local("Arial");
  }
`;

module.exports = {
  "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap":
    variableFontCss("Geist"),
  "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap":
    variableFontCss("Geist Mono"),
  "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap": `
    @font-face {
      font-family: "Sora";
      font-style: normal;
      font-weight: 400 800;
      src: local("Arial");
    }
  `
};
