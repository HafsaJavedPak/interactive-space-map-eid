# Interactive Space Map 🐄🪐

<img width="1864" height="934" alt="image" src="https://github.com/user-attachments/assets/cd5402f8-49a3-4d82-88c4-68f18a8e6484" />


A minimalist, interactive deep space map built on HTML5 Canvas and procedural SVGs. Follow a cow's journey across the cosmos, navigating from the galactic macro view down to individual planetary systems.

This project was built to celebrate Eid Ul Adha with a creative, cosmic theme.

## Features

-   **Deep Space Canvas Rendering:** Efficient rendering of an infinite, procedural starfield and the Milky Way spiral arms.
-   **Procedural SVG Overlay:** Crisp, dynamic level-of-detail text rendering and interactive coordinate grids that adapt to your zoom level.
-   **Seamless Panning & Zooming:** Navigate across lightyears smoothly using your mouse.
-   **Custom Astro-Cow Cursor:** Navigate the universe with a custom cow cursor that actively responds to grabbing/dragging interactions (`cow_cursor.svg` & `cow_cursor_active.svg`).
-   **Interactive Minimap HUD:** Keep track of your location in the galaxy with a functional minimap.
-   **Find Home Sequence:** Click the "Find Home" button to initiate a smooth, animated zoom directly to Earth.
-   **Eid Celebration:** Reaching Earth displays an animated, glowing "Eid Ul Azha Mubarak" message.

## Technologies Used

-   **HTML5 & Canvas API** for high-performance rendering of stars and planets.
-   **JavaScript (ES6+)** for state management, animation loops, and interactivity.
-   **Tailwind CSS** for the minimalist, dark-mode futuristic UI and HUD.
-   **Vanilla CSS** for cursor overrides and specific animations.

## How to Run

Since the application is purely frontend (HTML, CSS, JS), you can run it entirely in your browser without any build tools.

1.  Clone or download the repository.
2.  Open the `interactive-space-map` directory.
3.  Open `index.html` in your favorite modern web browser.
    *Note: If you run into CORS issues with local files (depending on your browser), you can serve the directory using a simple local server, for example: `python3 -m http.server 8000` or `npx serve`.*

## Navigation Controls

-   **Pan:** Click and drag anywhere on the canvas to move around.
-   **Zoom:** Use your mouse scroll wheel to zoom in and out.
-   **Minimap:** Click anywhere on the bottom-left minimap to instantly jump to that sector.
-   **HUD Buttons:** Use the zoom controls or click "Find Home" on the bottom-right menu.

---
*A cow's journey across space - Eid Ul Adha Mubarak!*
