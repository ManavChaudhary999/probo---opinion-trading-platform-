import express from "express";
import redis from "redis";
import ws from "ws";

const wss = new ws.Server({ port: 3002 });

wss.on("connection", (ws) => {
    console.log("Web Socket Connection established");
    
    ws.on("message", (message) => {
        console.log(message);
    });
});