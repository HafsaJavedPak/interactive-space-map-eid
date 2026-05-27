// data.js

const celestialData = {
    galaxies: [
        { id: "mw-core", name: "Sagittarius A* (Milky Way Core)", type: "galaxy", x: 0, y: 0, minZ: 0.001, maxZ: 0.8, color: "#eef2ff", size: 3000 }
    ],
    constellations: [
        { id: "c-ori", name: "Orion", type: "constellation", x: -2500, y: 1500, minZ: 0.05, maxZ: 1.5, color: "#38bdf8" },
        { id: "c-cas", name: "Cassiopeia", type: "constellation", x: 3000, y: -2000, minZ: 0.05, maxZ: 1.5, color: "#fcd34d" },
        { id: "c-urs", name: "Ursa Major", type: "constellation", x: -1000, y: -3500, minZ: 0.05, maxZ: 1.5, color: "#ffffff" },
        { id: "c-sco", name: "Scorpius", type: "constellation", x: 4000, y: 2500, minZ: 0.05, maxZ: 1.5, color: "#f87171" }
    ],
    stars: [
        // Orion Stars
        { id: "s-bet", name: "Betelgeuse", type: "star", x: -2700, y: 1300, minZ: 0.1, maxZ: 15, size: 16, color: "#fb923c" },
        { id: "s-rig", name: "Rigel", type: "star", x: -2300, y: 1700, minZ: 0.1, maxZ: 15, size: 14, color: "#93c5fd" },
        { id: "s-bel", name: "Bellatrix", type: "star", x: -2400, y: 1200, minZ: 0.2, maxZ: 15, size: 9, color: "#bfdbfe" },
        // Solar System
        { id: "s-sol", name: "Sol", type: "star", x: 1500, y: 500, minZ: 0.1, maxZ: 100, size: 10, color: "#fef08a" },
    ],
    planets: [
        // Sol System Planets
        { id: "p-mer", name: "Mercury", type: "planet", x: 1540, y: 500, minZ: 2, maxZ: 100, size: 1.5, color: "#9ca3af", parent: "s-sol", orbit: 40 },
        { id: "p-ven", name: "Venus", type: "planet", x: 1430, y: 530, minZ: 2, maxZ: 100, size: 2.5, color: "#fde047", parent: "s-sol", orbit: 76 },
        { id: "p-ear", name: "Earth", type: "planet", x: 1500, y: 390, minZ: 1.5, maxZ: 100, size: 3, color: "#60a5fa", parent: "s-sol", orbit: 110 },
        { id: "p-mar", name: "Mars", type: "planet", x: 1650, y: 450, minZ: 1.5, maxZ: 100, size: 2, color: "#f87171", parent: "s-sol", orbit: 158 },
        { id: "p-jup", name: "Jupiter", type: "planet", x: 1200, y: 750, minZ: 1, maxZ: 100, size: 6, color: "#fdba74", parent: "s-sol", orbit: 390 },
        { id: "p-sat", name: "Saturn", type: "planet", x: 1900, y: 150, minZ: 1, maxZ: 100, size: 5, color: "#fcd34d", parent: "s-sol", orbit: 531 }
    ],
    lines: [
        { source: "s-bet", target: "s-bel" },
        { source: "s-bet", target: "s-rig" }
    ]
};

// Procedurally generate thousands of star systems for infinite detail
const names1 = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Theta", "Sigma", "Omega"];
const names2 = ["Centauri", "Cygni", "Draconis", "Lyrae", "Orionis", "Pegasi", "Andromedae", "Eridani", "Ceti"];
const colors = ["#fb923c", "#93c5fd", "#bfdbfe", "#e0f2fe", "#fef08a", "#ffffff", "#f87171", "#fbcfe8", "#d8b4fe"];

function pToRoman(num) {
    const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return romans[num - 1] || "X";
}

let starIdCounter = 0;
// Generate 1500 procedurally detailed star systems
for (let i = 0; i < 1500; i++) {
    const starId = "ps-" + starIdCounter++;
    const name = names1[Math.floor(Math.random()*names1.length)] + " " + names2[Math.floor(Math.random()*names2.length)] + " " + Math.floor(Math.random()*999);
    
    // Spread along the galactic plane / spiral arms
    const maxRadius = 10000;
    const radius = Math.random() * maxRadius;
    const arms = 4;
    const armOffset = (Math.random() - 0.5) * 2000;
    const angle = (Math.log(radius) * 1.5) + (Math.PI * 2 / arms) * Math.floor(Math.random() * arms) + (Math.random() - 0.5) * 0.8;
    
    const sx = Math.cos(angle) * radius + armOffset;
    const sy = Math.sin(angle) * radius + armOffset;
    
    // Zoom visibility threshold depends on star size
    const starSize = 2 + Math.random() * 6;
    const minZ = 0.3 + (Math.random() * 1.5);
    
    celestialData.stars.push({
        id: starId,
        name: name,
        type: "star",
        x: sx,
        y: sy,
        minZ: minZ,
        maxZ: 150,
        size: starSize,
        color: colors[Math.floor(Math.random() * colors.length)]
    });
    
    // Generate Planets
    const numPlanets = 1 + Math.floor(Math.random() * 6);
    for (let p = 1; p <= numPlanets; p++) {
        const orbit = 20 + (p * 45) + Math.random() * 30;
        const pAngle = Math.random() * Math.PI * 2;
        const px = sx + Math.cos(pAngle) * orbit;
        const py = sy + Math.sin(pAngle) * orbit;
        
        celestialData.planets.push({
            id: starId + "-p" + p,
            name: name + " " + pToRoman(p),
            type: "planet",
            x: px,
            y: py,
            minZ: minZ + 1.5 + (Math.random() * 2), // Reveal planets only when zoomed in close to the star
            maxZ: 200,
            size: 1 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            parent: starId,
            orbit: orbit
        });
    }
}

const allObjects = [
    ...celestialData.galaxies,
    ...celestialData.constellations,
    ...celestialData.stars,
    ...celestialData.planets
];
