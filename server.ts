interface Player {
  id: string;
  x: number;
  y: number;
  tag: boolean;
}

const sockets = new Map<string, WebSocket>();
const players: Record<string, Player> = {};
let tagCooldown = 0;
let tagger = false;

setTimeout(updateTimer, 500);

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

    if (msg.type === "move") {
      if (msg.dir === "up") p.y -= 10;
      if (msg.dir === "down") p.y += 10;
      if (msg.dir === "left") p.x -= 10;
      if (msg.dir === "right") p.x += 10;

      // Tag logic
      if (p.tag && tagCooldown === 0) {
        for (const otherId in players) {
          if (otherId === id) continue;
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
    if(players[id].tag = true){
      tagger = false;
    }
    delete players[id];
    sockets.delete(id);
    broadcast({ type: "leave", id });
  });

  return response;
});

function calcDist(x1: number, y1: number, x2: number, y2: number): number {
  const distance = Math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2);
  return distance;
}

function updateTimer(): void {
  if (tagCooldown > 0) {
    tagCooldown -= 1;
  }
}

function generateSpawnpoint(): number[] {
  const pos = [];
  const x = Math.floor(Math.random() * 1600);
  const y = Math.floor(Math.random() * 550);
  for (const id in players) {
    if(players[id].tag == true) {
      const t = players[id];
      const x2 = t.x;
      const y2 = t.y;
      const d = calcDist(x,y,x2,y2);
      if(d <= 100) {
        generateSpawnpoint()
      }
    }
  }
  pos.push(x);
  pos.push(y);
  return pos;
}