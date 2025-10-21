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
// Collision 
function collides(x, y, size = 32) {
    for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i];
        let playerLeft = x;
        let playerRight = x + size;
        let playerTop = y;
        let playerBottom = y + size;
        let obstacleLeft = o.x;
        let obstacleRight = o.x + o.width;
        let obstacleTop = o.y;
        let obstacleBottom = o.y + o.height;
        let overlapX = playerLeft < obstacleRight && playerRight > obstacleLeft;
        let overlapY = playerTop < obstacleBottom && playerBottom > obstacleTop;
        if (overlapX && overlapY) {
            return true;
        }
    }
    return false;
}
setTimeout(updateTimer, 500);
function broadcast(message, except) {
    for (const [id, socket] of sockets) {
        if (id !== except) {
            socket.send(JSON.stringify(message));
        }
    }
}
Deno.serve((request) => __awaiter(void 0, void 0, void 0, function* () {
    const { pathname } = new URL(request.url);
    // Static file serving
    if (pathname === "/") {
        return new Response(Deno.readTextFileSync("./public/index.html"), {
            headers: { "content-type": "text/html" },
        });
    }
    if (pathname === "/style.css") {
        return new Response(Deno.readTextFileSync("./public/style.css"), {
            headers: { "content-type": "text/css" },
        });
    }
    if (pathname === "/background.jpg") {
        const image = yield Deno.readFile("./public/background.jpg");
        return new Response(image, {
            headers: { "content-type": "image/jpeg" },
        });
    }
    if (pathname === "/Sprites/player1.png") {
        const image = yield Deno.readFile("./public/Sprites/player1.png");
        return new Response(image, {
            headers: { "content-type": "image/png" },
        });
    }
    if (pathname === "/Sprites/player2.png") {
        const image = yield Deno.readFile("./public/Sprites/player2.png");
        return new Response(image, {
            headers: { "content-type": "image/png" },
        });
    }
    if (pathname === "/Sprites/player3.png") {
        const image = yield Deno.readFile("./public/Sprites/player3.png");
        return new Response(image, {
            headers: { "content-type": "image/png" },
        });
    }
    if (pathname === "/client.js") {
        return new Response(Deno.readTextFileSync("./public/client.js"), {
            headers: { "content-type": "application/javascript" },
        });
    }
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
            let newX = p.x;
            let newY = p.y;
            if (msg.dir === "up")
                newY -= 10;
            if (msg.dir === "down")
                newY += 10;
            if (msg.dir === "left")
                newX -= 10;
            if (msg.dir === "right")
                newX += 10;
            // only update if not colliding
            if (collides(newX, newY) === false) {
                p.x = newX;
                p.y = newY;
            }
            broadcast({ type: "update", player: p });
        }
    });
    // Tag logic
    if (p.tag && tagCooldown === 0) {
        for (const otherId in players) {
            if (otherId === id)
                continue;
            const runner = players[otherId];
            const d = calcDist(p.x, p.y, runner.x, runner.y);
            if (d > 30) {
                p.tag = false;
                runner.tag = true;
                tagCooldown = 30;
                break;
            }
        }
    }
    broadcast({ type: "update", player: p });
}));
socket.addEventListener("close", () => {
    console.log(`Player ${id} disconnected`);
    delete players[id];
    sockets.delete(id);
    broadcast({ type: "leave", id });
});
return response;
;
function calcDist(x1, y1, x2, y2) {
    const distance = Math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2);
    return distance;
}
function updateTimer() {
    if (tagCooldown > 0) {
        tagCooldown -= 1;
    }
}
function generateSpawnpoint() {
    const pos = [];
    const x = Math.floor(Math.random() * 1600);
    const y = Math.floor(Math.random() * 550);
    pos.push(x);
    pos.push(y);
    return pos;
}
