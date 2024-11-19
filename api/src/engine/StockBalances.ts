import {StockBalancesType} from "../types";

export class StockBalances {
    private static instance: StockBalances | null = null;
    private stocks: StockBalancesType = {};
    
    private constructor() {
    }

    public static getInstance() : StockBalances {
        if(!this.instance) {
            this.instance = new StockBalances();
        }
        
        return this.instance;
    }

    public getStockBalances() : StockBalancesType {
        return this.stocks;
    }

    public getUserStockBalance(userId: string) {
        return this.stocks[userId];
    }

    public createUser(userId: string) {
        this.stocks[userId] = {}
    }

    public ensureStock(userId: string, stockSymbol: string) {
        if(!this.stocks[userId][stockSymbol]) {
            this.stocks[userId][stockSymbol] = {
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
        this.stocks[userId][stockSymbol][stockType].quantity += quantity
    }

    public decreaseStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.stocks[userId][stockSymbol][stockType].quantity -= quantity
    }

    public lockStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.stocks[userId][stockSymbol][stockType].locked += quantity;
        this.decreaseStock(userId, stockSymbol, quantity, stockType);
    }

    public unlockStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.stocks[userId][stockSymbol][stockType].locked -= quantity;
        this.increaseStock(userId, stockSymbol, quantity, stockType);
    }

    public decreaseLockStock(userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no") {
        this.stocks[userId][stockSymbol][stockType].locked -= quantity
    }
}