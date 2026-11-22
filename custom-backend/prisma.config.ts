import { defineConfig, env } from 'prisma/config'
import './src/config/load-env.js'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: env('DATABASE_URL'),
    directUrl: process.env.DATABASE_URL_UNPOOLED ?? env('DATABASE_URL'),
  },
})
