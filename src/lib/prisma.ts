import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
    
    transactionOptions: {
        maxWait: 10000, // Wait up to 10s for the transaction to start
        timeout: 15000, // Transaction expires after 15s
    },
});
