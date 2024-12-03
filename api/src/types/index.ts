export const BUY_ORDER = "CREATE_ORDER";
export const SELL_ORDER = "SELL_ORDER";
// export const CREATE_USER = "CREATE_USER";
// export const ON_RAMP = "ON_RAMP";
// export const CREATE_STOCK_SYMBOL = "CREATE_STOCK_SYMBOL";
// export const RESET = "RESET";

interface InrBalance {
    balance: number;
    locked: number;
}
export type InrBalances = Record<string, InrBalance>;

type PositionType = {
	quantity: number;
	locked: number;
};
export type StockBalancesType = {
	[userId: string]: {
		[stockSymbol: string]: {
			yes: PositionType;
			no: PositionType;
		};
	};
};

interface Order {
	userId: string;
	type: "buy" | "sell";
	quantity: number;
}
type Orders =  Record<number, Order>
interface OrderType {
    total: number;
	key: number;
    orders: Orders;
}
type SideOrders = Record<number, OrderType>;
interface TotalOrders {
    yes: SideOrders;
    no: SideOrders;
}
export type OrderBookType = Record<string, TotalOrders>;

export type MessageFromAPI = {
	type: typeof BUY_ORDER | typeof SELL_ORDER;
	payload: {
		userId: string;
		stockSymbol: string;
		price: number;
		quantity: number;
		stockType: "yes" | "no";
	}
}

export type MessageFromRedis = {
	[stockSymbol: string]: TotalOrders;
}