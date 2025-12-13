/**
 * Rate Limiter using Token Bucket algorithm
 * Shared across Generator and Critic to ensure we stay within API limits
 */
export class RateLimiter {
    private rpm: number
    private tokens: number
    private maxTokens: number
    private lastRefill: number
    private msPerToken: number

    constructor(rpm: number = 30) {
        this.rpm = rpm
        this.maxTokens = rpm
        this.tokens = rpm
        this.lastRefill = Date.now()
        this.msPerToken = 60000 / rpm // milliseconds per token
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now()
        const elapsed = now - this.lastRefill
        const tokensToAdd = elapsed / this.msPerToken

        if (tokensToAdd >= 1) {
            this.tokens = Math.min(this.maxTokens, this.tokens + Math.floor(tokensToAdd))
            this.lastRefill = now
        }
    }

    /**
     * Acquire a token, waiting if necessary
     * Returns a promise that resolves when a token is available
     */
    async acquire(): Promise<void> {
        this.refill()

        if (this.tokens >= 1) {
            this.tokens -= 1
            return
        }

        // Calculate wait time for next token
        const waitTime = this.msPerToken - (Date.now() - this.lastRefill)
        await this.sleep(Math.max(0, waitTime))

        // Try again after waiting
        this.refill()
        this.tokens -= 1
    }

    /**
     * Get current available tokens (for debugging/monitoring)
     */
    getAvailableTokens(): number {
        this.refill()
        return Math.floor(this.tokens)
    }

    /**
     * Get the configured RPM
     */
    getRpm(): number {
        return this.rpm
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// Singleton instance with configurable RPM from environment
const DEFAULT_RPM = parseInt(process.env.GEMINI_RPM || '30', 10)
export const rateLimiter = new RateLimiter(DEFAULT_RPM)
