interface Player {
  id: string;
  x: number;
  y: number;
  tag: boolean;
}

const players: Record<string, Player> = {};
const sockets = new Map<string, WebSocket>();
let tagCooldown = 0;

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

if (pathname === "/client.js") {
  return new Response(Deno.readTextFileSync("./public/client.js"), {
    headers: { "content-type": "application/javascript" },
  });
}

// WebSocket for game
if (pathname === "/ws") {
  if (request.headers.get("upgrade") !== "websocket") {
    return new Response(null, { status: 501 });
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
      if (!p) return;
      if (msg.dir === "up") p.y -= 10;
      if (msg.dir === "down") p.y += 10;
      if (msg.dir === "left") p.x -= 10;
      if (msg.dir === "right") p.x += 10;

      if (p.tag == true) {
        for (const id in players) {
          const runner = players[id];
          if (runner == p) {
            return
          }
          const d = calcDist(p, runner);
          if (d > 30 && tagCooldown == 0) {
            p.tag = false;
            runner.tag = true;
            tagCooldown += 30;
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
}

return new Response("Not found", { status: 404 });
});

function calcDist(tagger: Player, runner: Player): number {
  const tX = tagger.x;
  const tY = tagger.y;
  const rX = runner.x;
  const rY = runner.y;
  const distance = Math.sqrt((rX-tX)^2 + (rY-tY)^2);
  return distance;
}

function updateTimer():void {
  if (tagCooldown > 0) {
    tagCooldown -= 1;
  }
  requestAnimationFrame(updateTimer);
}