import fs from "fs";
import path from "path";
import {OrderBookType, MessageFromAPI, BUY_ORDER, SELL_ORDER} from "../types";
import { StockBalances } from "./StockBalances";
import {UserBalances} from "./UserBalances";
import RedisClient from "./RedisManager";

const userBalances = UserBalances.getInstance();
const stockBalances = StockBalances.getInstance();

export class OrderBook {
    private static instance: OrderBook | null = null;
    private state: OrderBookType = {};
    
    private constructor() {
        let snapshot: Buffer | null = null;

        try {
            snapshot = fs.readFileSync(path.join(__dirname, '../../snapshot.json'));
        } catch (error) {
            console.log("Error loading snapshot: ", error);
        }

        if(snapshot) {
            const snapshotData = JSON.parse(snapshot.toString());
            this.state = snapshotData.orderbook;
        }
    }

    public static getInstance() : OrderBook {
        if(!this.instance) {
            this.instance = new OrderBook();
        }
        
        return this.instance;
    }

    public getOrderbook() : OrderBookType {
        return this.state;
    }

    public getStockOrderbook(stockSymbol: string) {
        return this.state[stockSymbol];
    }

    public createStock(stockSymbol: string) {
        this.state[stockSymbol] = {
            "yes": {},
            "no": {}
        }
    }

    public enusreStockSymbol(stockSymbol: string, stockType: "yes" | "no", price: number) {
        if(!this.state[stockSymbol]) {
            this.createStock(stockSymbol);
        }
        
        if(!this.state[stockSymbol][stockType][price]) {
            this.state[stockSymbol][stockType] = {
                ...this.state[stockSymbol][stockType],
                [price]: {
                    total: 0,
                    key: 0,
                    orders: {},
                }
            }
        }
    }

    public processOrder(order: MessageFromAPI) {
        const {userId, stockSymbol, price, quantity, stockType} = order.payload;

        if(order.type === SELL_ORDER) {
            this.PlaceSellOrder(stockSymbol, userId, stockType, price, quantity);
        } else {
            this.PlaceBuyOrder(stockSymbol, userId, stockType, price, quantity);
        }

        // Publish updated state
        RedisClient.publish(stockSymbol, {stockSymbol: this.state[stockSymbol]});
    }

    private PlaceBuyOrder(stockSymbol: string, userId: string, stockType: 'yes' | 'no', price: number, quantity: number) {
        const oppStockType = stockType === 'yes' ? 'no' : 'yes';
        const oppStockPrice = 10 - price;
        const cost = price * quantity;

        this.enusreStockSymbol(stockSymbol, stockType, price);
        this.enusreStockSymbol(stockSymbol, oppStockType, oppStockPrice);

        if(userBalances.getUserBalance(userId).balance < cost) {
            throw new Error("Insufficient funds");
            return;
        }

        // Lock required funds
        userBalances.lockBalance(userId, cost);

        let reqQuant = quantity;

        // Fetch Side price orderbook to match
        const sideOrders = this.state[stockSymbol][stockType][price];
        for(const key in sideOrders.orders) {
            const sideOrder = sideOrders.orders[key];

            if(reqQuant === 0) break;

            if(sideOrder.userId === userId || sideOrder.type === "buy") continue;

            const {userId: oppUserId, quantity: availableQuant} = sideOrder;

            const matchedQuantity = Math.min(reqQuant, availableQuant);

            // Unlock and debit required funds from user and increase stock quantity
            stockBalances.increaseStock(userId, stockSymbol, matchedQuantity, stockType);
            userBalances.decreaseLockBalance(userId, price * matchedQuantity);

            // Unlock and credit required funds to selling user and decrease stock quantity
            stockBalances.decreaseLockStock(oppUserId, stockSymbol, matchedQuantity, stockType);
            userBalances.increaseBalance(oppUserId, price * matchedQuantity);

            sideOrders.total -= matchedQuantity;
            sideOrder.quantity -= matchedQuantity;
            reqQuant -= matchedQuantity;
            if(sideOrder.quantity === 0) delete sideOrders.orders[key];
            if(sideOrders.total === 0) sideOrders.key = 0;
        }

        // Fetch Opposite price orderbook to match
        const oppOrders = this.state[stockSymbol][oppStockType][oppStockPrice];
        for(const key in oppOrders.orders) {
            const oppOrder = oppOrders.orders[key];

            if(reqQuant === 0) break;

            if(oppOrder.userId === userId || oppOrder.type === "sell")   continue;

            const {userId: oppUserId, quantity: availableQuant} = oppOrder;

            const matchedQuantity = Math.min(reqQuant, availableQuant);
            
            // Unlock and debit required funds from user and increase stock quantity
            stockBalances.increaseStock(userId, stockSymbol, matchedQuantity, stockType);
            userBalances.decreaseLockBalance(userId, price * matchedQuantity);
            // Unlock and debit required funds from selling user and increase stock quantity
            stockBalances.increaseStock(oppUserId, stockSymbol, matchedQuantity, oppStockType);
            userBalances.decreaseLockBalance(oppUserId, oppStockPrice * matchedQuantity);
            
            oppOrders.total -= matchedQuantity;
            oppOrder.quantity -= matchedQuantity;
            reqQuant -= matchedQuantity;
            if(oppOrder.quantity === 0) delete oppOrders.orders[key];
            if(oppOrders.total === 0) oppOrders.key = 0;
        }

        if(reqQuant === 0) {
            console.log("Order placed successfully and all quantity matched");
            return;
        }
    
        // Add the order to the order book
        const orderBook = this.state[stockSymbol][stockType][price];
        orderBook.total += reqQuant;
        const orderKey = ++orderBook.key;
        orderBook.orders[orderKey] = { userId, type: "buy", quantity: reqQuant };
        console.log("Order placed successfully and some quantity matched");
    }

    private PlaceSellOrder(stockSymbol: string, userId: string, stockType: 'yes' | 'no', price: number, quantity: number) {
        const oppStockType = stockType === 'yes' ? 'no' : 'yes';
        const oppStockPrice = 10 - price;
        const cost = price * quantity;

        this.enusreStockSymbol(stockSymbol, stockType, price);

        if(stockBalances.getUserStockBalance(userId, stockSymbol, stockType).quantity < quantity) {
            throw new Error("Insufficient stocks");
            return;
        }

        // Lock required Stocks
        stockBalances.lockStock(userId, stockSymbol, quantity, stockType);

        let reqQuant = quantity;

        // Fetch Side price orderbook to match already buy demand waiting order
        const sideOrders = this.state[stockSymbol][stockType][price];
        console.log("Side Orders", sideOrders);
        for(const key in sideOrders.orders) {
            const sideOrder = sideOrders.orders[key];

            console.log("Inside Loop");

            if(reqQuant === 0) break;

            if(sideOrder.userId === userId || sideOrder.type === "sell") continue;

            const {userId: oppUserId, quantity: availableQuant} = sideOrder;

            const matchedQuantity = Math.min(reqQuant, availableQuant);

            // Unlock and debit required stocks from selling user and add credit amount
            stockBalances.decreaseLockStock(userId, stockSymbol, matchedQuantity, stockType);
            userBalances.increaseBalance(userId, price * matchedQuantity);
            // Unlock and debit required funds from buying user and increase stock quantity
            stockBalances.increaseStock(oppUserId, stockSymbol, matchedQuantity, oppStockType);
            userBalances.decreaseLockBalance(oppUserId, oppStockPrice * matchedQuantity);

            sideOrders.total -= matchedQuantity;
            sideOrder.quantity -= matchedQuantity;
            reqQuant -= matchedQuantity;
            if(sideOrder.quantity === 0) delete sideOrders.orders[key];
            if(sideOrders.total === 0) sideOrders.key = 0;
        }

        if(reqQuant === 0) {
            console.log("Order placed successfully and all quantity matched");
            return;
        }

        // Add the sell order to the order book
        const orderBook = this.state[stockSymbol][stockType][price];
        orderBook.total += reqQuant;
        const orderKey = ++orderBook.key;
        orderBook.orders[orderKey] = { userId, type: "sell", quantity: reqQuant };
        console.log("Order placed successfully and some quantity matched");
    }

    private processMatch(stockSymbol: string, side: any, opp: any, sKey: number, oKey: number, stockType1: 'yes' | 'no', stockType2: 'yes' | 'no', price1: number, price2: number) : number {
        const user1 = side.orders[sKey].userId;
        const user2 = opp.orders[oKey].userId;
        const quant1 = side.orders[sKey].quantity;
        const quant2 = opp.orders[oKey].quantity;
        const type1 = side.orders[sKey].type;
        const type2 = opp.orders[oKey].type;
    
        const matchedQuant = Math.min(quant1, quant2);
        const cost1 = price1 * matchedQuant;
        const cost2 = price2 * matchedQuant;

        // console.log("-------------- Process Match -----------------");
        // console.log("Side Stock Type: ", stockType2);
        // console.log("Opp Stock Type: ", stockType1);
    
        // Adjust locked balances or stocks
        this.adjustAssets(user1, stockSymbol, type1, stockType1, cost1, quant1, 'deduct');
        this.adjustAssets(user2, stockSymbol, type2, stockType2, cost2, quant2, 'deduct');
    
        // Update or delete matched orders
        this.updateOrders(side, sKey, quant1, matchedQuant);
        this.updateOrders(opp, oKey, quant2, matchedQuant);
    
        // Credit matched stocks or funds
        this.adjustAssets(user1, stockSymbol, type1,  stockType1, cost1, matchedQuant, 'credit');
        this.adjustAssets(user2, stockSymbol, type2, stockType2, cost2, matchedQuant, 'credit');
    
        return matchedQuant;
    }
    
    private adjustAssets(userId: string, stockSymbol: string, type: 'buy' | 'sell', stockType: 'yes' | 'no', cost: number, quantity: number, action: 'credit' | 'deduct') {
        if (action === 'deduct') {
        //   type === 'buy' ? userBalances.decreaseLockBalance(userId, cost) : stockBalances.decreaseLockStock(userId, stockSymbol, quantity, stockType);
        } else {
        //   type === 'buy' ? stockBalances.increaseStock(userId, stockSymbol, quantity, stockType) : userBalances.increaseBalance(userId, cost);
        }
    }
    
    private updateOrders(book: any, key: number, currentQuantity: number, matchedQuantity: number) {
        if (currentQuantity === matchedQuantity) {
          delete book.orders[key];
        } else {
          book.orders[key].quantity -= matchedQuantity;
        }
    }
}