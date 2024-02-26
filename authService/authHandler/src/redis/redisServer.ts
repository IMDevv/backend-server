import {Redis} from 'ioredis';

class RedisClientSingleton {
    private static instance: RedisClientSingleton;
    private redisClient!: Redis;
    private sentinels: { host: string; port: number }[];

    private constructor() {
        this.sentinels = [
            { host: '172.26.0.7', port: 5000 },
            { host: '172.26.0.5', port: 5001 },
            { host: '172.26.0.4', port: 5002 },
        ];

        this.connect();
    }

    private connect(): void {
        this.redisClient = new Redis({
            sentinels: this.sentinels,
            name: 'isolutions',
        });
    }

    public static getInstance(): RedisClientSingleton {
        if (!RedisClientSingleton.instance) {
            RedisClientSingleton.instance = new RedisClientSingleton();
        }
        return RedisClientSingleton.instance;
    }

    public updateConnectionDetails(sentinels: { host: string; port: number }[]): void {
        this.sentinels = sentinels;
        this.connect();
    }

    public getRedisClient(): Redis {
        return this.redisClient;
    }

    public async setItem(key: string, value: string | Record<string, string | number>, ttlSeconds?: number): Promise<void> {
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
        if (ttlSeconds) {
            await this.redisClient.set(key, serializedValue, 'EX', ttlSeconds);
        }else{
            await this.redisClient.set(key, serializedValue);
        }

    }

    public async getItem(key: string): Promise<string | null> {
        return await this.redisClient.get(key);
    }
}

const redisClientInstance = RedisClientSingleton.getInstance();

export default redisClientInstance;
