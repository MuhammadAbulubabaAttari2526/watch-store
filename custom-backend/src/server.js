import express from 'express'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import multer from 'multer'
import fs from 'node:fs'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import productsRoutes from './routes/products.routes.js'
import catalogRoutes from './routes/catalog.routes.js'
import inventoryRoutes from './routes/inventory.routes.js'
import customersRoutes from './routes/customers.routes.js'
import cartRoutes from './routes/cart.routes.js'
import ordersRoutes from './routes/orders.routes.js'
import discountsRoutes from './routes/discounts.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import reviewsRoutes from './routes/reviews.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import customerRoutes from './routes/customer.routes.js'
import adminUsersRoutes from './routes/admin-users.routes.js'
import newsletterRoutes from './routes/newsletter.routes.js'
import { notFound, errorHandler } from './middleware/error.js'
import { authenticate, requirePermission } from './middleware/auth.js'
import { prisma } from './config/prisma.js'

const app = express()
app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: env.corsOrigin.split(','), credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }))

const uploadRoot = path.resolve(env.uploadDir)
fs.mkdirSync(uploadRoot, { recursive: true })
app.use('/uploads', express.static(uploadRoot, { fallthrough: false, maxAge: '1d' }))
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadRoot,
    filename: (_req, file, cb) => {
      const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype]
      cb(null, `${randomBytes(20).toString('hex')}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    cb(['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? null : new Error('Only JPEG, PNG, and WebP images are allowed'), ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
  },
})
app.post('/api/admin/uploads', authenticate, requirePermission('products.manage'), upload.array('files', 8), async (req, res, next) => {
  try {
    const files = req.files || []
    for (const file of files) {
      const signature = await fs.promises.readFile(file.path).then((buffer) => buffer.subarray(0, 12))
      const validJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
      const validPng = signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      const validWebp = signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 12) === 'WEBP'
      if (!validJpeg && !validPng && !validWebp) {
        await Promise.all(files.map((item) => fs.promises.unlink(item.path).catch(() => {})))
        return res.status(415).json({ message: 'File contents are not a supported image format' })
      }
    }
    res.json({ files: files.map((file) => ({ url: `/uploads/${file.filename}`, originalName: file.originalname, size: file.size })) })
  } catch (error) { next(error) }
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api', productsRoutes)
app.use('/api', catalogRoutes)
app.use('/api', inventoryRoutes)
app.use('/api', customersRoutes)
app.use('/api', cartRoutes)
app.use('/api', ordersRoutes)
app.use('/api', discountsRoutes)
app.use('/api', analyticsRoutes)
app.use('/api', reviewsRoutes)
app.use('/api', settingsRoutes)
app.use('/api', customerRoutes)
app.use('/api', adminUsersRoutes)
app.use('/api', newsletterRoutes)

app.use(notFound)
app.use(errorHandler)

await prisma.$connect()
app.listen(env.port, () => {
  console.log(`VELTRIX custom backend listening on http://localhost:${env.port}`)
})
