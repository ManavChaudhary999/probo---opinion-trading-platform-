import {createClient} from "redis";
import ws, {WebSocket} from "ws";

const wss = new ws.Server({ port: 8080 });
console.log("Web Socket Server started");  
const redisClient = createClient({url: "redis://localhost:6379"});

async function startServer() {
    await redisClient.connect();
    console.log("Redis is Connected");
}

interface Sockets {
    [stockSymbol: string]: WebSocket[];
}
const sockets: Sockets = {};

function ensureChannel(stockSymbol: string) {
    if(!sockets[stockSymbol]) {
        sockets[stockSymbol] = [];
    }
}

wss.on("connection", (ws) => {
    console.log("Web Socket Connection established");
    
    ws.on("message", (d) => {
        const data = JSON.parse(d.toString());
        console.log(data);

        if(data.type === "SUBSCRIBE") {
            console.log("Subscribing to", data.stockSymbol);

            redisClient.subscribe(data.stockSymbol, (message, channel) => {
                if(sockets[channel]) {
                    sockets[channel].forEach(socket => socket.send(message.toString()));
                } else {
                    console.log("Channel not found");
                }
            });

            ensureChannel(data.stockSymbol);
            sockets[data.stockSymbol].push(ws);
        }
        else if(data.type === "UNSUBSCRIBE") {
            console.log("Unsubscribing from", data.stockSymbol);

            redisClient.unsubscribe(data.stockSymbol, (message, channel) => {
                console.log(`Unsubscribed from ${data.stockSymbol}`);
            });

            sockets[data.stockSymbol] = sockets[data.stockSymbol].filter(socket => socket !== ws);
        }
    });

    // Remove client from all channels on close
    ws.on("close", () => {
        for (const stockSymbol of Object.keys(sockets)) {
            sockets[stockSymbol] = sockets[stockSymbol].filter((socket) => socket !== ws);
        }
        console.log("WebSocket client disconnected");
    });
});

startServer();