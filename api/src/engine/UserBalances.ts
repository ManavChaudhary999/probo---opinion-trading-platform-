import fs from "fs";
import path from "path";
import {InrBalances} from "../types";

export class UserBalances {
    private static instance: UserBalances | null = null;
    private state: InrBalances = {};
    
    private constructor() {
        let snapshot: Buffer | null = null;

        try {
            snapshot = fs.readFileSync(path.join(__dirname, '../../snapshot.json'));
        } catch (error) {
            console.log("Error loading snapshot: ", error);
        }

        if(snapshot) {
            const snapshotData = JSON.parse(snapshot.toString());
            this.state = snapshotData.userBalances;
        }
    }

    public static getInstance() : UserBalances {
        if(!this.instance) {
            this.instance = new UserBalances();
        }
        
        return this.instance;
    }

    public getInrBalances() : InrBalances {
        return this.state;
    }

    public createUser(userId: string) {
        this.state[userId] = {
            balance: 0,
            locked: 0
        };
    }

    public getUserBalance(userId: string) {
        return this.state[userId];
    }

    public increaseBalance(userId: string, amount: number) {
        this.state[userId].balance += amount;
        return this.getUserBalance(userId);
    }

    public decreaseBalance(userId: string, amount: number) {
        this.state[userId].balance -= amount;
        return this.getUserBalance(userId);
    }

    public lockBalance(userId: string, amount: number) {
        this.decreaseBalance(userId, amount);
        this.state[userId].locked += amount;
        return this.getUserBalance(userId);
    }

    public unlockBalance(userId: string, amount: number) {
        this.increaseBalance(userId, amount);
        this.state[userId].locked -= amount;
        return this.getUserBalance(userId);
    }

    public decreaseLockBalance(userId: string, amount: number) {
        this.state[userId].locked -= amount;
    }
}