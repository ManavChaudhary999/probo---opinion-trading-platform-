import fs from "fs";
import path from "path";
import {StockBalancesType} from "../types";

export class StockBalances {
    private static instance: StockBalances | null = null;
    private state: StockBalancesType = {};
    
    private constructor() {
        let snapshot: Buffer | null = null;

        try {
            snapshot = fs.readFileSync(path.join(__dirname, '../../snapshot.json'));
        } catch (error) {
            console.log("Error loading snapshot: ", error);
        }

        if(snapshot) {
            const snapshotData = JSON.parse(snapshot.toString());
            this.state = snapshotData.stockBalances;
        }
    }

    public static getInstance() : StockBalances {
        if(!this.instance) {
            this.instance = new StockBalances();
        }
        
        return this.instance;
    }

    public getStockBalances() : StockBalancesType {
        return this.state;
    }

    public getUserStockBalances(userId: string) {
        return this.state[userId];
    }

    public getUserStockBalance(userId: string, stockSymbol: string, stockType: "yes" | "no") {
        return this.state[userId][stockSymbol][stockType];
    }

    public createUser(userId: string) {
        this.state[userId] = {}
    }

    public ensureStock(userId: string, stockSymbol: string) {
        if(!this.state[userId][stockSymbol]) {
            this.state[userId][stockSymbol] = {
                yes: {
                    quantity: 0,
                    locked: 0
                },
                no: {
                    quantity: 0,
                    locked: 0
                },
            }
        }
    }

    public increaseStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.ensureStock(userId, stockSymbol);
        this.state[userId][stockSymbol][stockType].quantity += quantity
    }

    public decreaseStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.state[userId][stockSymbol][stockType].quantity -= quantity
    }

    public lockStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.state[userId][stockSymbol][stockType].locked += quantity;
        this.decreaseStock(userId, stockSymbol, quantity, stockType);
    }

    public unlockStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.state[userId][stockSymbol][stockType].locked -= quantity;
        this.increaseStock(userId, stockSymbol, quantity, stockType);
    }

    public decreaseLockStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.state[userId][stockSymbol][stockType].locked -= quantity
    }
}