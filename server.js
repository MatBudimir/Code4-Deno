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
const players = {};
const sockets = new Map();
let tagCooldown = 0;
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
    players[id] = { id, x: 100, y: 100, tag: false };
    sockets.set(id, socket);
    socket.addEventListener("open", () => {
        console.log(`Player ${id} connected`);
        socket.send(JSON.stringify({ type: "init", id, players }));
        broadcast({ type: "join", player: players[id] }, id);
    });
    socket.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "move") {
            const p = players[id];
            if (!p)
                return;
            if (msg.dir === "up")
                p.y -= 10;
            if (msg.dir === "down")
                p.y += 10;
            if (msg.dir === "left")
                p.x -= 10;
            if (msg.dir === "right")
                p.x += 10;
            if (p.tag == true) {
                for (const id in players) {
                    const runner = players[id];
                    if (runner == p) {
                        return;
                    }
                    const d = calcDist(p.x, p.y, runner.x, runner.y);
                    if (d > 30 && tagCooldown == 0) {
                        p.tag = false;
                        runner.tag = true;
                        tagCooldown += 30;
                    }
                }
            }
            broadcast({ type: "update", player: p });
        }
        const { socket, response } = Deno.upgradeWebSocket(request);
        const id = crypto.randomUUID();
        players[id] = { id, x: 100, y: 100, tag: false };
        sockets.set(id, socket);
        socket.addEventListener("open", () => {
            console.log(`Player ${id} connected`);
            socket.send(JSON.stringify({ type: "init", id, players }));
            broadcast({ type: "join", player: players[id] }, id);
        });
        socket.addEventListener("message", (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "move") {
                const p = players[id];
                if (!p)
                    return;
                if (msg.dir === "up")
                    p.y -= 10;
                if (msg.dir === "down")
                    p.y += 10;
                if (msg.dir === "left")
                    p.x -= 10;
                if (msg.dir === "right")
                    p.x += 10;
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
    });
    return new Response("Not found", { status: 404 });
}));
function calcDist(x1, y1, x2, y2) {
    const distance = Math.sqrt((x2 - x1) ^ 2 + (y2 - x2) ^ 2);
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
