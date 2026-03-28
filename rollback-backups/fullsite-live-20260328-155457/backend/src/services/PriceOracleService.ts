import { ethers } from 'ethers';
import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';
import BigNumber from 'bignumber.js';

/**
 * Price Oracle Service
 * 
 * Fetches RWA/USDT price from PancakeSwap and caches in Redis
 * 
 * FEATURES:
 * 1. Fetch price from PancakeSwap Router
 * 2. Cache price in Redis (TTL: 5 minutes)
 * 3. Multi-level fallback strategy
 * 4. Price anomaly detection (>20% change triggers alert)
 * 5. Conversion utilities (RWA ↔ USDT)
 */

export interface PriceOracleConfig {
    rpcUrl: string;
    pancakeRouterAddress: string;
    rwaTokenAddress: string;
    usdtTokenAddress: string;
    redisUrl: string;
    cacheTTL: number; // seconds
    priceChangeThreshold: number; // 0.2 = 20%
}

interface CachedPrice {
    price: string;
    timestamp: number;
}

export class PriceOracleService {
    private config: PriceOracleConfig;
    private provider: ethers.JsonRpcProvider;
    private router: ethers.Contract;
    private redis: RedisClientType;
    private lastPrice: string | null = null;
    
    // PancakeSwap Router ABI (only getAmountsOut)
    private readonly ROUTER_ABI = [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
    ];
    
    constructor(config: PriceOracleConfig) {
        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.router = new ethers.Contract(
            config.pancakeRouterAddress,
            this.ROUTER_ABI,
            this.provider
        );
        
        // Initialize Redis client
        this.redis = createClient({ url: config.redisUrl });
        this.redis.on('error', (err) => logger.error('Redis error:', err));
    }
    
    /**
     * Connect to Redis
     */
    async connect(): Promise<void> {
        if (!this.redis.isOpen) {
            await this.redis.connect();
            logger.info('Price Oracle Redis connected');
        }
    }
    
    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.redis.isOpen) {
            await this.redis.disconnect();
            logger.info('Price Oracle Redis disconnected');
        }
    }
    
    /**
     * Get RWA price as number (for DailyYieldService compatibility)
     */
    async getRwaPrice(): Promise<number> {
        const priceStr = await this.getRWAPrice();
        return parseFloat(priceStr) || 0;
    }

    /**
     * Get RWA/USDT price with multi-level fallback
     */
    async getRWAPrice(): Promise<string> {
        try {
            // Level 1: Try Redis cache (< 5 minutes)
            const cached = await this.getCachedPrice();
            if (cached && Date.now() - cached.timestamp < this.config.cacheTTL * 1000) {
                logger.debug(`Using cached price: ${cached.price}`);
                return cached.price;
            }
            
            // Level 2: Fetch from PancakeSwap
            const price = await this.fetchFromPancakeSwap();
            
            // Check for price anomaly
            if (this.lastPrice) {
                const changeRatio = this.calculatePriceChange(this.lastPrice, price);
                if (Math.abs(changeRatio) > this.config.priceChangeThreshold) {
                    logger.warn(`⚠️ Price anomaly detected: ${(changeRatio * 100).toFixed(2)}% change`);
                    // TODO: Send alert to Telegram
                }
            }
            
            // Cache the new price
            await this.cachePrice(price);
            this.lastPrice = price;
            
            logger.info(`Fetched new price from PancakeSwap: ${price}`);
            return price;
            
        } catch (error) {
            logger.error('Failed to fetch price from PancakeSwap:', error);
            
            // Level 3: Use last cached price (< 10 minutes)
            const cached = await this.getCachedPrice();
            if (cached && Date.now() - cached.timestamp < 600000) { // 10 minutes
                logger.warn(`Using stale cached price: ${cached.price}`);
                return cached.price;
            }
            
            // Level 4: Fail - no valid price available
            throw new Error('Price oracle unavailable: no valid price found');
        }
    }
    
    /**
     * Fetch price from PancakeSwap
     */
    private async fetchFromPancakeSwap(): Promise<string> {
        try {
            // Get amounts out for 1 RWA -> USDT
            const amountIn = ethers.parseUnits('1', 18); // 1 RWA (18 decimals)
            const path = [this.config.rwaTokenAddress, this.config.usdtTokenAddress];
            
            const amounts = await this.router.getAmountsOut(amountIn, path);
            
            // amounts[1] is USDT amount (6 decimals)
            // Convert to 18 decimals for internal use
            const usdtAmount = amounts[1]; // 6 decimals
            const price = ethers.formatUnits(usdtAmount, 6); // Convert to readable format
            const priceIn18Decimals = ethers.parseUnits(price, 18).toString(); // Convert to 18 decimals
            
            return priceIn18Decimals;
            
        } catch (error) {
            logger.error('PancakeSwap price fetch failed:', error);
            throw error;
        }
    }
    
    /**
     * Cache price in Redis
     */
    private async cachePrice(price: string): Promise<void> {
        try {
            const cached: CachedPrice = {
                price,
                timestamp: Date.now()
            };
            
            await this.redis.set(
                'rwa_price',
                JSON.stringify(cached),
                { EX: this.config.cacheTTL }
            );
        } catch (error) {
            logger.error('Failed to cache price:', error);
            // Non-critical error, continue
        }
    }
    
    /**
     * Get cached price from Redis
     */
    private async getCachedPrice(): Promise<CachedPrice | null> {
        try {
            const cached = await this.redis.get('rwa_price');
            if (!cached) {
                return null;
            }
            
            return JSON.parse(cached) as CachedPrice;
        } catch (error) {
            logger.error('Failed to get cached price:', error);
            return null;
        }
    }
    
    /**
     * Calculate price change ratio
     */
    private calculatePriceChange(oldPrice: string, newPrice: string): number {
        const old = new BigNumber(oldPrice);
        const current = new BigNumber(newPrice);
        
        const change = current.minus(old);
        const ratio = change.dividedBy(old).toNumber();
        
        return ratio;
    }
    
    /**
     * Convert RWA amount to USDT equivalent
     */
    async convertRWAToUSDT(rwaAmount: string): Promise<string> {
        const price = await this.getRWAPrice();
        
        const rwa = new BigNumber(rwaAmount);
        const priceNum = new BigNumber(price);
        
        const usdtAmount = rwa.multipliedBy(priceNum).dividedBy('1000000000000000000');
        
        return usdtAmount.toString();
    }
    
    /**
     * Convert USDT amount to RWA equivalent
     */
    async convertUSDTToRWA(usdtAmount: string): Promise<string> {
        const price = await this.getRWAPrice();
        
        const usdt = new BigNumber(usdtAmount);
        const priceNum = new BigNumber(price);
        
        const rwaAmount = usdt.multipliedBy('1000000000000000000').dividedBy(priceNum);
        
        return rwaAmount.toString();
    }
    
    /**
     * Validate withdrawal amount (>= 100 equivalent)
     */
    async validateWithdrawalAmount(rwaAmount: string): Promise<{
        isValid: boolean;
        usdtValue: string;
        minRequired: string;
    }> {
        const usdtValue = await this.convertRWAToUSDT(rwaAmount);
        const minRequired = '100000000000000000000'; // 100 (18 decimals)
        
        const value = new BigNumber(usdtValue);
        const min = new BigNumber(minRequired);
        
        return {
            isValid: value.gte(min),
            usdtValue,
            minRequired
        };
    }
    
    /**
     * Get price statistics
     */
    async getPriceStatistics(): Promise<{
        currentPrice: string;
        lastUpdate: number;
        cacheAge: number;
    }> {
        const cached = await this.getCachedPrice();
        
        if (!cached) {
            return {
                currentPrice: '0',
                lastUpdate: 0,
                cacheAge: 0
            };
        }
        
        return {
            currentPrice: cached.price,
            lastUpdate: cached.timestamp,
            cacheAge: Date.now() - cached.timestamp
        };
    }
    
    /**
     * Force refresh price (bypass cache)
     */
    async forceRefresh(): Promise<string> {
        logger.info('Force refreshing price...');
        
        const price = await this.fetchFromPancakeSwap();
        await this.cachePrice(price);
        this.lastPrice = price;
        
        return price;
    }
}

export default PriceOracleService;
