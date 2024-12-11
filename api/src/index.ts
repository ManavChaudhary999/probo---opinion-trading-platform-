import express from "express";
import cors from "cors";
import {router} from "./routes";
import RedisClient from "./engine/RedisManager";

const app = express();

app.use(cors());
app.use(express.json());

app.use(router);

app.get('/home', (req, res) => {
    const promise = new Promise((resolve, reject)=> {
        setTimeout(() => {
            resolve("Hello");
        }, 5000);
    });

    promise.then((data) => {
        res.json({
            message: data
        })
    }).catch((err) => {
        res.json({
            message: err
        })
    })
})

async function startServer() {
    app.listen(3000, () => {
        console.log("Server started on port 3000");
    });

    // await RedisClient.connect();
    console.log("Redis is Connected");
}

startServer();