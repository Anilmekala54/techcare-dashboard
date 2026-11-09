# Tech.Care – Patient Dashboard (FED API Skills Test)

Pixel-matched build of the Adobe XD "HealthCare Dashboard" (1600 × 1195) using plain HTML, CSS and JavaScript.

## Run
Open `index.html` in a browser (or serve the folder, e.g. `npx serve .`).
Patient data is fetched live from the Coalition Technologies API with Basic Auth; Jessica Taylor is selected by default.

## Structure
- `index.html` – markup
- `css/style.css` – design tokens from the XD `:root`, layout and components
- `js/app.js` – API fetch, rendering, Chart.js blood-pressure chart, range filter, custom scrollbars
- `assets/` – logo, vitals illustrations, doctor avatar and Material Symbols (outlined, weight 300) icons used in the design

## Notes
- Font: Manrope (Google Fonts). Chart: Chart.js 4 (jsDelivr CDN).
- Desktop layout matches the 1600px artboard; it reflows for tablet and mobile.
