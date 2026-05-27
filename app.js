// app.js

// --- State & Config ---
let width = window.innerWidth;
let height = window.innerHeight;

const BOUNDS = 20000; // Limit panning
let MIN_ZOOM = Math.max(width, height) / 12000;
const MAX_ZOOM = 50;

// Current view transform: screen_coord = world_coord * k + pan
let transform = {
    x: width / 2, // Start looking at origin (0,0)
    y: height / 2,
    k: MIN_ZOOM // Macro view (Fit to page)
};

// --- DOM Elements ---
const canvas = document.getElementById('space-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimize
const svgGrid = document.getElementById('grid-layer');
const svgConstellations = document.getElementById('constellation-layer');
const svgLabels = document.getElementById('label-layer');

const uiX = document.getElementById('coord-x');
const uiY = document.getElementById('coord-y');
const uiZoom = document.getElementById('zoom-level');
const uiSector = document.getElementById('sector-name');

// Minimap Elements
const minimap = document.getElementById('minimap');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d', { alpha: false });
const minimapViewport = document.getElementById('minimap-viewport');

// --- Initialization ---
function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // Generate static background stars for depth
    generateBackgroundStars();
    
    // Setup Minimap
    initMinimap();
    
    // Setup Interaction
    setupInteraction();
    
    // Start Loop
    requestAnimationFrame(render);
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    
    // Fit ~80% of the Milky Way (20000 bounds -> 80% is 16000 units wide) into the screen
    MIN_ZOOM = Math.max(width, height) / 16000;
    
    // Ensure current zoom isn't lower than new MIN_ZOOM
    if (transform.k < MIN_ZOOM) transform.k = MIN_ZOOM;

    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    requestAnimationFrame(render);
}

// Background starfield
const bgStars = [];
const starColors = ["#ffffff", "#bfdbfe", "#fbcfe8", "#fef08a", "#c7d2fe"]; // Faint colors

function generateBackgroundStars() {
    // 1. Uniform background stars (Faint, dense)
    const starCount = 20000;
    for (let i = 0; i < starCount; i++) {
        bgStars.push({
            x: (Math.random() - 0.5) * BOUNDS * 2,
            y: (Math.random() - 0.5) * BOUNDS * 2,
            size: Math.random() * 1.5 + 0.2,
            opacity: Math.random() * 0.7 + 0.1,
            color: starColors[Math.floor(Math.random() * starColors.length)],
            isGalaxy: false
        });
    }

    // 2. Milky Way Spiral Arms (Very dense point cloud)
    const arms = 4;
    const galaxyStarCount = 50000;
    const maxRadius = 10000;
    for (let i = 0; i < galaxyStarCount; i++) {
        const radius = Math.random() * maxRadius;
        // Central bulge is denser
        const armOffset = (Math.random() - 0.5) * (3000 * Math.exp(-radius/3000)); 
        const angle = (Math.log(radius) * 1.5) + (Math.PI * 2 / arms) * Math.floor(Math.random() * arms) + (Math.random() - 0.5) * 0.8;
        
        bgStars.push({
            x: Math.cos(angle) * radius + armOffset,
            y: Math.sin(angle) * radius + armOffset,
            size: Math.random() * 1.8 + 0.4,
            opacity: Math.random() * 0.9 + 0.2,
            color: starColors[Math.floor(Math.random() * starColors.length)],
            isGalaxy: true
        });
    }

    // Sort by color to optimize fillStyle changes during rendering
    bgStars.sort((a, b) => a.color.localeCompare(b.color));
}

// --- Minimap Initialization ---
function initMinimap() {
    minimapCtx.fillStyle = '#02040a';
    minimapCtx.fillRect(0, 0, 192, 192);
    
    const MINIMAP_BOUNDS = 12000;
    const mmScale = 192 / MINIMAP_BOUNDS; 
    const cx = 192 / 2;
    const cy = 192 / 2;

    // Draw Milky Way Core Glow
    const grad = minimapCtx.createRadialGradient(cx, cy, 1, cx, cy, 6000 * mmScale);
    grad.addColorStop(0, 'rgba(50, 40, 100, 0.8)');
    grad.addColorStop(0.3, 'rgba(30, 40, 80, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    minimapCtx.fillStyle = grad;
    minimapCtx.fillRect(0, 0, 192, 192);

    // Draw major stars/galaxies
    minimapCtx.fillStyle = '#ffffff';
    for (let obj of allObjects) {
        if (obj.type === 'galaxy' || obj.type === 'star') {
            const mx = cx + obj.x * mmScale;
            const my = cy + obj.y * mmScale;
            minimapCtx.beginPath();
            minimapCtx.arc(mx, my, obj.type === 'galaxy' ? 3 : 0.8, 0, Math.PI * 2);
            minimapCtx.fill();
        }
    }
}

// --- Interaction Logic ---
let isDragging = false;
let startX, startY;
let showEidMessage = false;

function setupInteraction() {
    // Panning
    window.addEventListener('mousedown', e => {
        if (e.target.closest('.hud-panel') || e.target.closest('button')) return; // Ignore clicks on UI
        e.preventDefault(); // Stop native text/image selection dragging
        isDragging = true;
        showEidMessage = false; // clear message on pan
        startX = e.clientX - transform.x;
        startY = e.clientY - transform.y;
    }, { passive: false });

    window.addEventListener('mousemove', e => {
        // Always update coords
        const worldX = (e.clientX - transform.x) / transform.k;
        const worldY = (e.clientY - transform.y) / transform.k;
        
        uiX.textContent = worldX.toFixed(2);
        uiY.textContent = worldY.toFixed(2);

        if (!isDragging) return;

        let newX = e.clientX - startX;
        let newY = e.clientY - startY;

        // Apply bounds to center
        const centerX = width / 2;
        const centerY = height / 2;
        
        // World coordinates of screen center
        const centerWorldX = (centerX - newX) / transform.k;
        const centerWorldY = (centerY - newY) / transform.k;

        if (Math.abs(centerWorldX) > BOUNDS) {
            newX = centerX - (Math.sign(centerWorldX) * BOUNDS * transform.k);
        }
        if (Math.abs(centerWorldY) > BOUNDS) {
            newY = centerY - (Math.sign(centerWorldY) * BOUNDS * transform.k);
        }

        transform.x = newX;
        transform.y = newY;
        
        requestAnimationFrame(render);
    });

    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('mouseleave', () => isDragging = false);

    // Zooming
    window.addEventListener('wheel', e => {
        if (e.target.closest('.hud-panel') || e.target.closest('button')) return;
        e.preventDefault();
        showEidMessage = false; // clear message on zoom
        const zoomIntensity = 0.002;
        const delta = e.deltaY;
        let newK = transform.k * Math.exp(-delta * zoomIntensity);
        
        zoomTo(newK, e.clientX, e.clientY);
    }, { passive: false });

    // Buttons
    document.getElementById('btn-zoom-in').addEventListener('click', () => { showEidMessage = false; zoomTo(transform.k * 1.5, width/2, height/2); });
    document.getElementById('btn-zoom-out').addEventListener('click', () => { showEidMessage = false; zoomTo(transform.k * 0.66, width/2, height/2); });
    document.getElementById('btn-reset').addEventListener('click', () => {
        showEidMessage = false;
        transform.x = width / 2;
        transform.y = height / 2;
        transform.k = MIN_ZOOM;
        requestAnimationFrame(render);
    });

    // Find Home (Earth)
    document.getElementById('btn-find-home').addEventListener('click', () => {
        const earth = allObjects.find(o => o.id === 'p-ear');
        if (!earth) return;
        
        // High zoom target
        const targetK = 25; 
        const targetX = width / 2 - earth.x * targetK;
        const targetY = height / 2 - earth.y * targetK;
        
        let frames = 90; // 1.5 second animation
        let f = 0;
        const startK = transform.k;
        const startX_anim = transform.x;
        const startY_anim = transform.y;
        
        function anim() {
            f++;
            const t = f / frames;
            // cubic ease-in-out
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            
            transform.k = startK + (targetK - startK) * ease;
            transform.x = startX_anim + (targetX - startX_anim) * ease;
            transform.y = startY_anim + (targetY - startY_anim) * ease;
            
            requestAnimationFrame(render);
            if (f < frames) {
                requestAnimationFrame(anim);
            } else {
                showEidMessage = true;
                requestAnimationFrame(render);
            }
        }
        showEidMessage = false;
        anim();
    });

    // Minimap Interaction
    minimap.addEventListener('mousedown', (e) => {
        function jumpTo(e) {
            const rect = minimap.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            const MINIMAP_BOUNDS = 12000;
            const mmScale = 192 / MINIMAP_BOUNDS; 
            const cx = 192 / 2;
            const cy = 192 / 2;
            
            // Convert mx, my back to world coords
            const worldX = (mx - cx) / mmScale;
            const worldY = (my - cy) / mmScale;
            
            // Center the screen on worldX, worldY
            transform.x = width / 2 - worldX * transform.k;
            transform.y = height / 2 - worldY * transform.k;
            
            // Enforce bounds manually since we bypass panning logic
            const centerX = width / 2;
            const centerY = height / 2;
            const centerWorldX = (centerX - transform.x) / transform.k;
            const centerWorldY = (centerY - transform.y) / transform.k;
            if (Math.abs(centerWorldX) > BOUNDS) transform.x = centerX - (Math.sign(centerWorldX) * BOUNDS * transform.k);
            if (Math.abs(centerWorldY) > BOUNDS) transform.y = centerY - (Math.sign(centerWorldY) * BOUNDS * transform.k);
            
            requestAnimationFrame(render);
        }
        
        jumpTo(e);
        
        function onMove(e) { jumpTo(e); }
        function onUp() {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });
}

function zoomTo(newK, mouseX, mouseY) {
    newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newK));
    
    // Zoom around point
    transform.x = mouseX - (mouseX - transform.x) * (newK / transform.k);
    transform.y = mouseY - (mouseY - transform.y) * (newK / transform.k);
    transform.k = newK;
    
    requestAnimationFrame(render);
}

// --- Rendering Loop ---
let lastRenderTime = 0;
function render(time) {
    // Only render once per frame if multiple events fire
    if (time === lastRenderTime) return;
    lastRenderTime = time;

    updateHUD();
    renderCanvas();
    renderSVG();
}

function updateHUD() {
    uiZoom.textContent = transform.k.toFixed(2) + 'x';
    
    if (transform.k < 0.15) {
        uiSector.textContent = "Galactic Macro";
        uiSector.className = "text-slate-300 font-bold";
    } else if (transform.k < 1.0) {
        uiSector.textContent = "Local Interstellar Cloud";
        uiSector.className = "text-slate-300 font-bold";
    } else if (transform.k < 5.0) {
        uiSector.textContent = "Stellar Neighborhood";
        uiSector.className = "text-slate-300 font-bold";
    } else {
        uiSector.textContent = "Planetary System View";
        uiSector.className = "text-slate-300 font-bold";
    }
    
    updateMinimap();
}

function updateMinimap() {
    const MINIMAP_BOUNDS = 12000;
    const mmScale = 192 / MINIMAP_BOUNDS; 
    const cx = 192 / 2;
    const cy = 192 / 2;

    // Viewport in world coords
    const minW_X = -transform.x / transform.k;
    const maxW_X = (width - transform.x) / transform.k;
    const minW_Y = -transform.y / transform.k;
    const maxW_Y = (height - transform.y) / transform.k;

    const w = maxW_X - minW_X;
    const h = maxW_Y - minW_Y;

    // Convert to minimap coords
    const left = cx + minW_X * mmScale;
    const top = cy + minW_Y * mmScale;
    const mmW = w * mmScale;
    const mmH = h * mmScale;

    minimapViewport.style.left = `${left}px`;
    minimapViewport.style.top = `${top}px`;
    minimapViewport.style.width = `${mmW}px`;
    minimapViewport.style.height = `${mmH}px`;
}

function renderCanvas() {
    // Background fill
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    
    // 1. Draw Milky Way Core Glow (fade out as we zoom in)
    if (transform.k < 1.0) {
        const glowOpacity = Math.max(0, 1 - (transform.k * 1.5));
        const grad = ctx.createRadialGradient(0, 0, 100, 0, 0, 5000);
        grad.addColorStop(0, `rgba(50, 40, 100, ${glowOpacity})`);
        grad.addColorStop(0.3, `rgba(30, 40, 80, ${glowOpacity * 0.6})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(-6000, -6000, 12000, 12000);
    }

    // 2. Parallax Background Stars (slight depth effect)
    let lastColor = "";
    for (let s of bgStars) {
        // Culling
        const sx = s.x * transform.k + transform.x;
        const sy = s.y * transform.k + transform.y;
        if (sx < -10 || sx > width + 10 || sy < -10 || sy > height + 10) continue;
        
        let op = s.opacity * Math.min(1, 0.1 / transform.k + 0.2); // Dim bg stars when zoomed in
        if (s.isGalaxy) op *= Math.max(0, 1 - (transform.k * 0.8)); // Fade spiral arms deeply as we zoom
        
        if (op <= 0.02) continue;
        
        if (s.color !== lastColor) {
            ctx.fillStyle = s.color;
            lastColor = s.color;
        }

        ctx.globalAlpha = op;
        const size = s.size / transform.k;
        ctx.fillRect(s.x - size/2, s.y - size/2, size, size);
    }
    ctx.globalAlpha = 1;

    // 3. Render Objects (Stars, Planets)
    for (let obj of allObjects) {
        if (transform.k >= obj.minZ && transform.k <= obj.maxZ) {
            // Culling
            const sx = obj.x * transform.k + transform.x;
            const sy = obj.y * transform.k + transform.y;
            if (sx < -200 || sx > width + 200 || sy < -200 || sy > height + 200) continue;

            if (obj.type === "star" || obj.type === "planet") {
                // Draw Orbit
                if (obj.orbit && transform.k >= 2.0) {
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                    ctx.lineWidth = 1 / transform.k;
                    ctx.beginPath();
                    const parent = allObjects.find(o => o.id === obj.parent);
                    if (parent) {
                        ctx.arc(parent.x, parent.y, obj.orbit, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }

                // Object Glow & Body
                ctx.fillStyle = obj.color;
                
                // Stars glow
                if (obj.type === "star") {
                    ctx.shadowBlur = obj.size * 3 * transform.k;
                    ctx.shadowColor = obj.color;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.beginPath();
                // Base size logic: stars scale slightly less than planets to feel massive from afar
                const size = obj.type === "star" 
                    ? Math.max(2 / transform.k, obj.size) 
                    : obj.size;
                
                ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw continents for Earth
                if (obj.id === "p-ear" && transform.k > 5) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2);
                    ctx.clip(); // Ensure continents don't spill into space
                    
                    ctx.fillStyle = "#22c55e"; // Green continents
                    ctx.beginPath();
                    ctx.arc(obj.x - size*0.3, obj.y - size*0.1, size*0.5, 0, Math.PI*2);
                    ctx.arc(obj.x + size*0.4, obj.y + size*0.3, size*0.4, 0, Math.PI*2);
                    ctx.arc(obj.x - size*0.1, obj.y + size*0.6, size*0.3, 0, Math.PI*2);
                    ctx.fill();
                    ctx.restore();
                }

                ctx.shadowBlur = 0; // Reset
            }
        }
    }

    ctx.restore();
}

function renderSVG() {
    const fadeRange = 0.2;

    // --- 1. Dynamic Coordinate Grid ---
    let gridHTML = "";
    
    // Choose grid spacing based on zoom
    let spacing = 2000;
    let gridOpacity = 0.25; // Made lines more visible
    let gridColor = "255, 255, 255"; // RGB
    
    if (transform.k > 0.3) { spacing = 500; gridOpacity = 0.3; gridColor = "100, 200, 255"; }
    if (transform.k > 2.0) { spacing = 100; gridOpacity = 0.35; gridColor = "50, 255, 150"; }
    
    // Viewport in world bounds
    const minW_X = -transform.x / transform.k;
    const maxW_X = (width - transform.x) / transform.k;
    const minW_Y = -transform.y / transform.k;
    const maxW_Y = (height - transform.y) / transform.k;
    
    const startX = Math.floor(minW_X / spacing) * spacing;
    const startY = Math.floor(minW_Y / spacing) * spacing;
    
    // Verticals
    for (let x = startX; x <= maxW_X; x += spacing) {
        const screenX = x * transform.k + transform.x;
        gridHTML += `<line x1="${screenX}" y1="0" x2="${screenX}" y2="${height}" stroke="rgba(${gridColor},${gridOpacity})" stroke-width="1.5" stroke-dasharray="2 6" />`;
        if (transform.k > 0.05) {
            gridHTML += `<text x="${screenX + 4}" y="${height - 30}" fill="rgba(${gridColor},${gridOpacity + 0.4})" font-size="12" font-family="'JetBrains Mono', monospace" font-weight="bold">${x}</text>`;
        }
    }
    // Horizontals
    for (let y = startY; y <= maxW_Y; y += spacing) {
        const screenY = y * transform.k + transform.y;
        gridHTML += `<line x1="0" y1="${screenY}" x2="${width}" y2="${screenY}" stroke="rgba(${gridColor},${gridOpacity})" stroke-width="1.5" stroke-dasharray="2 6" />`;
        if (transform.k > 0.05) {
            gridHTML += `<text x="10" y="${screenY - 4}" fill="rgba(${gridColor},${gridOpacity + 0.4})" font-size="12" font-family="'JetBrains Mono', monospace" font-weight="bold">${y}</text>`;
        }
    }
    svgGrid.innerHTML = gridHTML;

    // --- 2. Constellation Lines ---
    let lineHTML = "";
    if (transform.k > 0.05 && transform.k < 2.0) {
        for (let conn of celestialData.lines) {
            const s = allObjects.find(o => o.id === conn.source);
            const t = allObjects.find(o => o.id === conn.target);
            if (s && t) {
                // Opacity fades out as we zoom in too far
                let lineOp = 0.4;
                if (transform.k > 1.0) {
                    lineOp = 0.4 * (1 - ((transform.k - 1.0) / 1.0));
                }
                
                const sx = s.x * transform.k + transform.x;
                const sy = s.y * transform.k + transform.y;
                const tx = t.x * transform.k + transform.x;
                const ty = t.y * transform.k + transform.y;
                lineHTML += `<line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="rgba(100, 200, 255, ${lineOp})" stroke-width="1.5" />`;
            }
        }
    }
    svgConstellations.innerHTML = lineHTML;

    // --- 3. Crisp SVG Labels ---
    let labelHTML = "";
    for (let obj of allObjects) {
        if (transform.k >= obj.minZ && transform.k <= obj.maxZ) {
            const screenX = obj.x * transform.k + transform.x;
            const screenY = obj.y * transform.k + transform.y;
            
            // Culling
            if (screenX < -100 || screenX > width + 100 || screenY < -100 || screenY > height + 100) continue;

            let opacity = 1;
            // Fade logic based on zoom limits
            if (transform.k - obj.minZ < fadeRange) {
                opacity = (transform.k - obj.minZ) / fadeRange;
            } else if (obj.maxZ - transform.k < fadeRange) {
                opacity = (obj.maxZ - transform.k) / fadeRange;
            }
            opacity = Math.max(0, Math.min(1, opacity));

            if (obj.type === "galaxy") {
                // Reduced Sagittarius A font size from 32 to 18, made it fully opaque white
                labelHTML += `<text x="${screenX}" y="${screenY}" fill="rgba(255,255,255,${opacity})" font-size="18" font-family="'Inter', sans-serif" font-weight="800" text-anchor="middle" letter-spacing="4">${obj.name.toUpperCase()}</text>`;
            } else if (obj.type === "constellation") {
                labelHTML += `<text x="${screenX}" y="${screenY}" fill="rgba(255,255,255,${opacity * 0.7})" font-size="24" font-family="'Inter', sans-serif" font-weight="600" text-anchor="middle" letter-spacing="4">${obj.name.toUpperCase()}</text>`;
            } else if (obj.type === "star") {
                const yOffset = -15 - (obj.size * transform.k * 0.5);
                let textColor = `rgba(200,230,255,${opacity})`;
                let fontWeight = "600";
                
                // Highlight Sol massively so the user can easily find it
                if (obj.id === "s-sol") {
                    textColor = `rgba(167, 243, 208, ${opacity})`; // Tailwind emerald-200
                    fontWeight = "800";
                    labelHTML += `<circle cx="${screenX}" cy="${screenY}" r="${20 * transform.k + 15}" stroke="rgba(167,243,208,${opacity})" stroke-width="2" fill="none" stroke-dasharray="4 4" />`;
                    labelHTML += `<text x="${screenX}" y="${screenY - (25 * transform.k + 20)}" fill="${textColor}" font-size="16" font-family="'Inter', sans-serif" font-weight="800" text-anchor="middle" letter-spacing="2">SOLAR SYSTEM</text>`;
                }

                labelHTML += `<text x="${screenX}" y="${screenY + yOffset}" fill="${textColor}" font-size="14" font-family="'Inter', sans-serif" font-weight="${fontWeight}" text-anchor="middle">${obj.name}</text>`;
                // Exact coords
                if (transform.k > 1.5) {
                    labelHTML += `<text x="${screenX}" y="${screenY + yOffset - 16}" fill="rgba(100,200,255,${opacity * 0.7})" font-size="10" font-family="'JetBrains Mono', monospace" text-anchor="middle">RA:${obj.x.toFixed(1)} DEC:${obj.y.toFixed(1)}</text>`;
                }
            } else if (obj.type === "planet") {
                const xOffset = 12 + (obj.size * transform.k);
                labelHTML += `<text x="${screenX + xOffset}" y="${screenY + 4}" fill="rgba(255,255,255,${opacity})" font-size="12" font-family="'Inter', sans-serif">${obj.name}</text>`;
                
                if (obj.id === "p-ear" && showEidMessage) {
                    // Radius of text curve relative to zoom
                    const r = obj.size * transform.k + 30; 
                    // Draw semi-circle path above Earth
                    labelHTML += `<path id="earth-text-path" d="M ${screenX - r},${screenY} A ${r},${r} 0 0,1 ${screenX + r},${screenY}" fill="none" stroke="none" />`;
                    
                    labelHTML += `
                    <text fill="#fcd34d" font-size="24" font-family="'Inter', sans-serif" font-weight="900" letter-spacing="2" filter="drop-shadow(0px 0px 8px rgba(252,211,77,0.8))" class="squiggle-text">
                        <textPath href="#earth-text-path" startOffset="50%" text-anchor="middle">
                            EID UL AZHA MUBARAK
                            <animate attributeName="startOffset" values="45%; 55%; 45%" dur="1.5s" repeatCount="indefinite" />
                        </textPath>
                    </text>`;
                }
            }
        }
    }
    svgLabels.innerHTML = labelHTML;
}

// Kickoff
init();
