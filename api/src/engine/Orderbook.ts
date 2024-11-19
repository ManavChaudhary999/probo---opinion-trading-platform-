import {OrderBookType, MessageFromAPI, BUY_ORDER, SELL_ORDER} from "../types";
import { StockBalances } from "./StockBalances";
import {UserBalances} from "./UserBalances";

const userBalances = UserBalances.getInstance();
const stockBalances = StockBalances.getInstance();

export class OrderBook {
    private static instance: OrderBook | null = null;
    private state: OrderBookType = {
        "BTC_USDT_10_Oct_2024_9_30": {
            yes: {
                "4": {
                    total: 100,
                    key: 1,
                    orders: {
                        1: {
                            "userId": "manav",
                            "type": "sell",
                            "quantity": 100
                        }
                    },
                },
            },
            no: {}
        }
    };
    
    private constructor() {
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
            this.state[stockSymbol] = {
                "yes": {},
                "no": {}
            }
        }
        if(!this.state[stockSymbol][stockType][price]) {
            this.state[stockSymbol][stockType][price] = {
                total: 0,
                key: 0,
                orders: {},
            }
        }
    }

    public processOrder(order: MessageFromAPI) {
        const {userId, stockSymbol, price, quantity, stockType} = order.payload;

        const oppStockType = stockType === "yes" ? "no" : "yes";
        const oppStockPrice = 10 - price;
        const cost = order.type === BUY_ORDER ? oppStockPrice * quantity : price * quantity;

        // Lock required funds or stocks
        userBalances.lockBalance(userId, cost);

        const targetStockType = order.type === BUY_ORDER ? oppStockType : stockType;
        const targetPrice = order.type === BUY_ORDER ? oppStockPrice : price;

        this.enusreStockSymbol(stockSymbol, targetStockType, targetPrice);

        // Add the order to the order book
        const orderBook = this.state[stockSymbol][targetStockType][targetPrice];
        orderBook.total += quantity;
        const orderKey = ++orderBook.key; // Increment key for a new order
        orderBook.orders[orderKey] = { userId, type: order.type === BUY_ORDER ? "buy" : "sell", quantity };

        console.log("-------------- Process Order -----------------");
        console.log("Side Stock Type: ", stockType);
        console.log("Opp Stock Type: ", oppStockType);

        // Attempt matching
        this.matcher(stockSymbol, targetStockType, targetPrice);

        // Publish updated state
        // redis.publish(stockSymbol, JSON.stringify(this.state[stockSymbol]));
    }

    private matcher(stockSymbol: string, stockType: 'yes' | 'no', price: number) {
        const oppStockType = stockType === 'yes' ? 'no' : 'yes';
        const oppPrices = Object.keys(this.state[stockSymbol][oppStockType]).map(Number).sort((a, b) => a - b);
    
        console.log("-------------- Matcher -----------------");
        console.log("Side Stock Type: ", oppStockType);
        console.log("Opp Stock Type: ", stockType);


        for (const oppPrice of oppPrices) {
          const reqQuant = this.state[stockSymbol][stockType][price].total;
          const availableQuant = this.state[stockSymbol][oppStockType][oppPrice].total;
    
          if (oppPrice <= (10 - price) && reqQuant > 0 && availableQuant > 0) {
            this.matchOrders(stockSymbol, stockType, price, oppPrice);
          }
        }
    }
      
    private matchOrders(stockSymbol: string, stockType: 'yes' | 'no', price: number, oppPrice: number) {
        const oppStockType = stockType === 'yes' ? 'no' : 'yes';
        const side = this.state[stockSymbol][stockType][price]; // 4
        const opp = this.state[stockSymbol][oppStockType][oppPrice]; // 6

        console.log("-------------- Match Orders -----------------");
        console.log("Side Stock Type: ", oppStockType);
        console.log("Opp Stock Type: ", stockType);

        while (side.total > 0 && opp.total > 0) {
            const sKey = this.lowestKey(Object.keys(side.orders).map(Number));
            const oKey = this.lowestKey(Object.keys(opp.orders).map(Number));

            const matchedQuant = this.processMatch(stockSymbol, side, opp, sKey, oKey, stockType, oppStockType, price, oppPrice);

            side.total -= matchedQuant;
            opp.total -= matchedQuant;
        }
    }
    
    private lowestKey(keys: number[]): number {
        return Math.min(...keys);
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

        console.log("-------------- Process Match -----------------");
        console.log("Side Stock Type: ", stockType2);
        console.log("Opp Stock Type: ", stockType1);

        return 100;
    
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
          type === 'buy' ? userBalances.decreaseLockBalance(userId, cost) : stockBalances.decreaseLockStock(userId, stockSymbol, quantity, stockType);
        } else {
          type === 'buy' ? stockBalances.increaseStock(userId, stockSymbol, quantity, stockType) : userBalances.increaseBalance(userId, cost);
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