interface Player {
  id: string;
  x: number;
  y: number;
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${protocol}//${location.host}/ws`);
let myId: string | null = null;
let players: Record<string, Player> = {};

const sprites = {
  player1: new Image(),
  player2: new Image(),
};

sprites.player1.src = "Sprites/player1.png";
sprites.player1.className = "sprite"
sprites.player2.src = "Sprites/player2.png";
sprites.player2.className = "sprite"

socket.addEventListener("message", (event: MessageEvent) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "init") {
    myId = msg.id;
    players = msg.players;
  } else if (msg.type === "join") {
    players[msg.player.id] = msg.player;
  } else if (msg.type === "update") {
    players[msg.player.id] = msg.player;
  } else if (msg.type === "leave") {
    delete players[msg.id];
  }
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1) {
    socket.send(JSON.stringify({ type: "move", dir: keyToDir(e.key) }));
  }
});

document.getElementById("controls")!.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as HTMLButtonElement;
  if (target.tagName === "BUTTON") {
    const dir = target.id;
    socket.send(JSON.stringify({ type: "move", dir }));
  }
});

function keyToDir(key: string): string {
  switch (key) {
    case "w": case "ArrowUp": return "up";
    case "s": case "ArrowDown": return "down";
    case "a": case "ArrowLeft": return "left";
    case "d": case "ArrowRight": return "right";
    default: return "";
  }
}

function createSprites() {
  const sprite = document.createElement("img");
  sprite.src = "Sprites/player1.png"

  return sprite
}

function gameLoop(sprite: CanvasImageSource) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const id in players) {
    const p = players[id];
     requestAnimationFrame(gameLoop);
    ctx.drawImage(sprite, p.x, p.y);
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

