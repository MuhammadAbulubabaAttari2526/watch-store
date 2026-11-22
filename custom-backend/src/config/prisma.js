import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
const adapter = new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 15000 })
const globalForPrisma = globalThis
export const prisma = globalForPrisma.__veltrixPrisma || new PrismaClient({
  adapter,
  transactionOptions: { maxWait: 10000, timeout: 60000 },
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.__veltrixPrisma = prisma
