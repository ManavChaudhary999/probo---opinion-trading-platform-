import {Router} from "express";
import {OrderBook} from "../engine/Orderbook";
import {UserBalances} from "../engine/UserBalances";
import { StockBalances } from "../engine/StockBalances";
import {BUY_ORDER, SELL_ORDER} from "../types";

export const router = Router();

const userBalances = UserBalances.getInstance();
const orderBook = OrderBook.getInstance();
const stockBalances = StockBalances.getInstance();

// User Routes
router.post("/user/create/:userId", (req, res) => {
    const userId = req.params.userId;

    // redisClient.lPush("message" as string, JSON.stringify({type: CREATE_USER, data: userId}));

    userBalances.createUser(userId);
    stockBalances.createUser(userId);

    res.json({
        status: "success",
        message: "User created successfully",
        data: userBalances.getUserBalance(userId)
    })
});

router.post("onramp/inr", (req, res) => {
    const {userId, amount} = req.body;

    // redisClient.lPush("message" as string, JSON.stringify({type: ON_RAMP, data: req.body}));

    userBalances.increaseBalance(userId, amount);

    res.json({
        status: "success",
        message: "Amount added successfully",
        data: userBalances.getUserBalance(userId)
    });
})

// Order Requests
router.post("/order/buy", (req, res) => {
   const {userId, stockSymbol, price, quantity, stockType} = req.body;

    // redisClient.lPush("message" as string, JSON.stringify({type: BUY_ORDER, data: req.body}));

    orderBook.processOrder({
        type: BUY_ORDER,
        payload: req.body
    })

   res.json({
       status: "success",
       message: "Order placed successfully",
       data: {
           userId,
           stockSymbol,
           price,
           quantity,
           stockType
       }
    });
});

router.post("/order/sell", (req, res) => {
    const {userId, stockSymbol, price, quantity, stockType} = req.body;

    // redisClient.lPush("message" as string, JSON.stringify({type: SELL_ORDER, data: req.body}));
 
    orderBook.processOrder({
        type: SELL_ORDER,
        payload: req.body
    })

    res.json({
        status: "success",
        message: "Order placed successfully",
        data: {
            userId,
            stockSymbol,
            price,
            quantity,
            stockType
        }
     });
 });

// Orderbook Routes
router.post("/symbol/create/:stockSymbol", (req, res) => {
    const symbol = req.params.stockSymbol;

    // redisClient.lPush("message" as string, JSON.stringify({type: CREATE_STOCK_SYMBOL, data: symbol}));

    orderBook.createStock(symbol);

    res.json({
        status: "success",
        message: "Symbol created successfully",
        // data: ORDERBOOK
    })
});

router.get("/orderbook", (req, res) => {
    res.json({
        status: "success",
        message: "Orderbook fetched successfully",
        data: orderBook.getOrderbook()
    })
})

router.get("/orderbook/:stockSymbol", (req, res) => {
    const symbol = req.params.stockSymbol;
    
    res.json({
        status: "success",
        message: "Orderbook fetched successfully",
        data: orderBook.getStockOrderbook(symbol)
    });
});

// Balances Routes
router.get("/balances/inr", (req, res) => {
    res.json({
        status: "success",
        message: "Balances fetched successfully",
        data: userBalances.getInrBalances()
    })
});

router.get("/balances/inr/:userId", (req, res) => {
    const userId = req.params.userId;

    res.json({
        status: "success",
        message: "Balances fetched successfully",
        data: userBalances.getUserBalance(userId)
    })
});

router.get("/balances/stock", (req, res) => {
    res.json({
        status: "success",
        message: "Balances fetched successfully",
        data: stockBalances.getStockBalances()
    })
});

router.get("/balances/stock/:userId", (req, res) => {
    const userId = req.params.userId;

    res.json({
        status: "success",
        message: "Balances fetched successfully",
        data: stockBalances.getUserStockBalance(userId)
    })
});

// Reset
router.post("/reset", (req, res) => {
    // redisClient.lPush("message" as string, JSON.stringify({type: RESET}));

    res.json({
        status: "success",
        message: "Balances and Orderbook reset successfully",
    })
})