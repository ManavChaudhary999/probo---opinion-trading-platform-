import redis, {createClient} from "redis";
import { MessageFromRedis } from "../types";

class RedisManager {
    private static instance: RedisManager | null = null;
    private client: redis.RedisClientType | null = null;

    private constructor() {
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public async connect() : Promise<void> {
        this.client = createClient({url: "redis://localhost:6379"});
        await this.client.connect();
    }

    public publish(stockSymbol: string, message: MessageFromRedis) : void {
        this.client?.publish(stockSymbol, JSON.stringify(message));
    }
}

export default RedisManager.getInstance();