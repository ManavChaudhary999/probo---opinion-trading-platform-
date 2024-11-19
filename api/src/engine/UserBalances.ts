import {InrBalances} from "../types";

export class UserBalances {
    private static instance: UserBalances | null = null;
    private inrBalances: InrBalances = {};
    
    private constructor() {
    }

    public static getInstance() : UserBalances {
        if(!this.instance) {
            this.instance = new UserBalances();
        }
        
        return this.instance;
    }

    public getInrBalances() : InrBalances {
        return this.inrBalances;
    }

    public createUser(userId: string) {
        this.inrBalances[userId] = {
            balance: 0,
            locked: 0
        };
    }

    public getUserBalance(userId: string) {
        return this.inrBalances[userId];
    }

    public increaseBalance(userId: string, amount: number) {
        this.inrBalances[userId].balance += amount;
        return this.getUserBalance(userId);
    }

    public decreaseBalance(userId: string, amount: number) {
        this.inrBalances[userId].balance -= amount;
        return this.getUserBalance(userId);
    }

    public lockBalance(userId: string, amount: number) {
        this.decreaseBalance(userId, amount);
        this.inrBalances[userId].locked += amount;
        return this.getUserBalance(userId);
    }

    public unlockBalance(userId: string, amount: number) {
        this.increaseBalance(userId, amount);
        this.inrBalances[userId].locked -= amount;
        return this.getUserBalance(userId);
    }

    public decreaseLockBalance(userId: string, amount: number) {
        this.inrBalances[userId].locked -= amount;
    }
}