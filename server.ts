interface Player {
  id: string;
  x: number;
  y: number;
  tag: boolean;
}

const sockets = new Map<string, WebSocket>();
const players: Record<string, Player> = {};
let canTag = true;
let tagger = false;

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 550;


// Obstacles 
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

// Collision 
function collides(x: number, y: number, size = 32): boolean {
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

function broadcast(message: unknown, except?: string) {
  for (const [id, socket] of sockets) {
    if (id !== except) {
      socket.send(JSON.stringify(message));
    }
  }
}

Deno.serve(async (request) => {
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
    const image = await Deno.readFile("./public/background.jpg");
    return new Response(image, {
      headers: { "content-type": "image/jpeg" },
    });
  }

  if (pathname === "/canvasbg.jpg") {
    const image = await Deno.readFile("./public/canvasbg.jpg");
    return new Response(image, {
      headers: { "content-type": "image/jpeg" },
    });
  }

  if (pathname === "/Sprites/player1.png") {
    const image = await Deno.readFile("./public/Sprites/player1.png");
    return new Response(image, {
      headers: { "content-type": "image/png" },
    });
  }

  if (pathname === "/Sprites/player2.png") {
    const image = await Deno.readFile("./public/Sprites/player2.png");
    return new Response(image, {
      headers: { "content-type": "image/png" },
    });
  }

  if (pathname === "/Sprites/player3.png") {
    const image = await Deno.readFile("./public/Sprites/player3.png");
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

  const spawn = generateSpawnpoint();
  const spawnX = spawn[0];
  const spawnY = spawn[1];

  let newPlayerTag = false;
  if (!tagger) {
    newPlayerTag = true;
    tagger = true;
  }

  players[id] = { id, x: spawnX, y: spawnY, tag: newPlayerTag };
  sockets.set(id, socket);

  socket.addEventListener("open", () => {
    console.log(`Player ${id} connected`);
    socket.send(JSON.stringify({ type: "init", id, players }));
    broadcast({ type: "join", player: players[id] }, id);
  });

  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    const p = players[id];
    if (!p) return;

    let newX = p.x;
    let newY = p.y;

    if (msg.type === "move") {
      if (msg.dir === "up") newY -= 10;
      if (msg.dir === "down") newY += 10;
      if (msg.dir === "left") newX -= 10;
      if (msg.dir === "right") newX += 10;
    }

    // Tag logic
    if (p.tag && canTag === true) {
      for (const otherId in players) {
        if (otherId === id) continue;
        const runner = players[otherId];
        const d = calcDist(p.x, p.y, runner.x, runner.y);
        if (d < 30) {
          p.tag = false;
          runner.tag = true;
          canTag = false;
          setTimeout(updateCooldown, 2000);

          broadcast({ type: "update", player: p });
          broadcast({ type: "update", player: runner });
          break;
        }
      }
    } else {
      broadcast({ type: "update", player: p });
    }

    // only update if not colliding
    if (collides(newX, newY) === false) {
      p.x = newX;
      p.y = newY;

      if (p.x < 0) p.x = CANVAS_WIDTH;
      if (p.x > CANVAS_WIDTH) p.x = 0;
      if (p.y < 0) p.y = CANVAS_HEIGHT;
      if (p.y > CANVAS_HEIGHT) p.y = 0;

      broadcast({ type: "update", player: p });
    }
  });

  socket.addEventListener("close", () => {
    console.log(`Player ${id} disconnected`);
    if (players[id].tag = true) {
      tagger = false;
    }
    delete players[id];
    sockets.delete(id);
    broadcast({ type: "leave", id });
  });

  return response;
});

function calcDist(x1: number, y1: number, x2: number, y2: number): number {
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return distance;
}

function updateCooldown(): void {
  canTag = true
}

function generateSpawnpoint(): number[] {
  const pos = [];
  const x = Math.floor(Math.random() * 1600);
  const y = Math.floor(Math.random() * 550);
  for (const id in players) {
    if (players[id].tag == true) {
      const t = players[id];
      const x2 = t.x;
      const y2 = t.y;
      const d = calcDist(x, y, x2, y2);
      if (d <= 100) {
        generateSpawnpoint()
      }
    }
  }
  pos.push(x);
  pos.push(y);
  return pos;
}