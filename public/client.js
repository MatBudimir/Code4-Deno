"use strict";
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${protocol}//${location.host}/ws`);
let myId = null;
let players = {};
const sprites = {
    player1: new Image(),
    player2: new Image(),
    player3: new Image(),
};
sprites.player1.src = "Sprites/player1.png";
sprites.player1.className = "sprite";
sprites.player2.src = "Sprites/player2.png";
sprites.player2.className = "sprite";
sprites.player3.src = "Sprites/player3.png";
sprites.player3.className = "sprite";
const obstacles = [
    // Left corridor walls
    { x: 100, y: 50, width: 30, height: 450 },
    { x: 300, y: 50, width: 30, height: 450 },
    // Right corridor walls
    { x: 1300, y: 50, width: 30, height: 450 },
    { x: 1500, y: 50, width: 30, height: 450 },
    // Middle 
    { x: 600, y: 100, width: 150, height: 30 },
    { x: 800, y: 200, width: 150, height: 30 },
    { x: 600, y: 300, width: 150, height: 30 },
    { x: 800, y: 400, width: 150, height: 30 },
    // Square
    { x: 1150, y: 100, width: 80, height: 80 },
    // Bottom 
    { x: 500, y: 470, width: 200, height: 30 },
    { x: 1000, y: 470, width: 200, height: 30 },
];
socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "init") {
        myId = msg.id;
        players = msg.players;
    }
    else if (msg.type === "join") {
        players[msg.player.id] = msg.player;
    }
    else if (msg.type === "update") {
        players[msg.player.id] = msg.player;
    }
    else if (msg.type === "leave") {
        delete players[msg.id];
    }
});
document.addEventListener("keydown", (e) => {
    if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1) {
        socket.send(JSON.stringify({ type: "move", dir: keyToDir(e.key) }));
    }
});
document.getElementById("controls").addEventListener("click", (e) => {
    const target = e.target;
    if (target.tagName === "BUTTON") {
        const dir = target.id;
        socket.send(JSON.stringify({ type: "move", dir }));
    }
});
function keyToDir(key) {
    switch (key) {
        case "w":
        case "ArrowUp": return "up";
        case "s":
        case "ArrowDown": return "down";
        case "a":
        case "ArrowLeft": return "left";
        case "d":
        case "ArrowRight": return "right";
        default: return "";
    }
}
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
function createSprites() {
    const sprite = document.createElement("img");
    sprite.src = "Sprites/player1.png";
    return sprite;
}
function gameLoop(sprite) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw obstacles
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i];
        ctx.fillRect(o.x, o.y, o.width, o.height);
    }
    for (const id in players) {
        const p = players[id];
        let img = id === myId ? sprites.player1 : sprites.player2;
        if (p.tag == true) {
            img = sprites.player3;
        }
        ctx.drawImage(img, p.x, p.y);
        //ctx.fillStyle = id === myId ? "blue" : "red";
        //ctx.fillRect(p.x, p.y, 20, 20);
    }
    requestAnimationFrame(() => gameLoop(sprite));
}
window.onload = function () {
    const sprite = createSprites();
    sprite.onload = function () {
        gameLoop(sprite);
    };
};
