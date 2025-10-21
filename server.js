"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const sockets = new Map();
const players = {};
let tagCooldown = 0;
setInterval(updateTimer, 500);
function broadcast(message, except) {
    for (const [id, socket] of sockets) {
        if (id !== except) {
            socket.send(JSON.stringify(message));
        }
    }
}
function calcDist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
function updateTimer() {
    if (tagCooldown > 0)
        tagCooldown -= 1;
}
function generateSpawnpoint() {
    const x = Math.floor(Math.random() * 1600);
    const y = Math.floor(Math.random() * 550);
    return [x, y];
}
Deno.serve((request) => __awaiter(void 0, void 0, void 0, function* () {
    const { pathname } = new URL(request.url);
    // --- Static file serving ---
    const staticFiles = {
        "/": "./public/index.html",
        "/style.css": "./public/style.css",
        "/client.js": "./public/client.js",
        "/background.jpg": "./public/background.jpg",
        "/Sprites/player1.png": "./public/Sprites/player1.png",
        "/Sprites/player2.png": "./public/Sprites/player2.png",
        "/Sprites/player3.png": "./public/Sprites/player3.png",
    };
    if (staticFiles[pathname]) {
        const path = staticFiles[pathname];
        const ext = path.split(".").pop();
        const mime = ext === "html" ? "text/html" :
            ext === "css" ? "text/css" :
                ext === "js" ? "application/javascript" :
                    ext === "jpg" ? "image/jpeg" :
                        "image/png";
        const content = ext === "jpg" || ext === "png"
            ? yield Deno.readFile(path)
            : yield Deno.readTextFile(path);
        return new Response(content, { headers: { "content-type": mime } });
    }
    // --- WebSocket Upgrade ---
    const { socket, response } = Deno.upgradeWebSocket(request);
    const id = crypto.randomUUID();
    const [spawnX, spawnY] = generateSpawnpoint();
    players[id] = { id, x: spawnX, y: spawnY, tag: false };
    sockets.set(id, socket);
    socket.addEventListener("open", () => {
        console.log(`Player ${id} connected`);
        socket.send(JSON.stringify({ type: "init", id, players }));
        broadcast({ type: "join", player: players[id] }, id);
    });
    socket.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        const p = players[id];
        if (!p)
            return;
        if (msg.type === "move") {
            if (msg.dir === "up")
                p.y -= 10;
            if (msg.dir === "down")
                p.y += 10;
            if (msg.dir === "left")
                p.x -= 10;
            if (msg.dir === "right")
                p.x += 10;
            // Tag logic
            if (p.tag && tagCooldown === 0) {
                for (const otherId in players) {
                    if (otherId === id)
                        continue;
                    const runner = players[otherId];
                    const d = calcDist(p.x, p.y, runner.x, runner.y);
                    if (d < 30) {
                        p.tag = false;
                        runner.tag = true;
                        tagCooldown = 30;
                        break;
                    }
                }
            }
            broadcast({ type: "update", player: p });
        }
    });
    socket.addEventListener("close", () => {
        console.log(`Player ${id} disconnected`);
        delete players[id];
        sockets.delete(id);
        broadcast({ type: "leave", id });
    });
    return response;
}));
