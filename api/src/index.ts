import express from "express";
import cors from "cors";
import {router} from "./routes";
import RedisClient from "./engine/RedisManager";

const app = express();

app.use(cors());
app.use(express.json());

app.use(router);

async function startServer() {
    app.listen(3000, () => {
        console.log("Server started on port 3000");
    });

    await RedisClient.connect();
    console.log("Redis is Connected");
}

startServer();