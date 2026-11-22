import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticateCustomer } from '../middleware/auth.js'

const router = express.Router()

router.use('/customers', authenticateCustomer)

router.put('/customers/me', async (req, res, next) => {
  try {
    const parsed = z.object({
      firstName: z.string().trim().min(2).max(50),
      lastName: z.string().trim().min(2).max(50),
      phone: z.string().trim().max(30).optional(),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid profile', errors: parsed.error.flatten().fieldErrors })
    const customer = await prisma.customer.update({ where: { id: req.customer.id }, data: parsed.data })
    res.json({ customer })
  } catch (error) { next(error) }
})

const addressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  addressLine1: z.string().trim().min(6).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/).optional(),
  phone: z.string().trim().max(30),
  isDefault: z.boolean().default(false),
})

router.get('/customers/me/addresses', async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({ where: { customerId: req.customer.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })
    res.json({ addresses })
  } catch (error) { next(error) }
})

router.post('/customers/me/addresses', async (req, res, next) => {
  try {
    const parsed = addressSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid address', errors: parsed.error.flatten().fieldErrors })
    const address = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) await tx.address.updateMany({ where: { customerId: req.customer.id }, data: { isDefault: false } })
      return tx.address.create({ data: { ...parsed.data, customerId: req.customer.id, countryCode: 'PK' } })
    })
    res.status(201).json({ address })
  } catch (error) { next(error) }
})

router.put('/customers/me/addresses/:id', async (req, res, next) => {
  try {
    const parsed = addressSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid address', errors: parsed.error.flatten().fieldErrors })
    const address = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id: req.params.id, customerId: req.customer.id } })
      if (!existing) throw Object.assign(new Error('Address not found'), { status: 404 })
      if (parsed.data.isDefault) await tx.address.updateMany({ where: { customerId: req.customer.id }, data: { isDefault: false } })
      return tx.address.update({ where: { id: req.params.id }, data: parsed.data })
    })
    res.json({ address })
  } catch (error) { next(error) }
})

router.delete('/customers/me/addresses/:id', async (req, res, next) => {
  try {
    await prisma.address.deleteMany({ where: { id: req.params.id, customerId: req.customer.id } })
    res.status(204).end()
  } catch (error) { next(error) }
})

router.get('/customers/me/wishlist', async (req, res, next) => {
  try {
    let wishlist = await prisma.wishlist.findUnique({ where: { customerId: req.customer.id }, include: { items: { include: { product: { include: { images: true, variants: { include: { inventory: true } } } } } } } })
    if (!wishlist) wishlist = await prisma.wishlist.create({ data: { customerId: req.customer.id }, include: { items: true } })
    res.json({ wishlist })
  } catch (error) { next(error) }
})

router.put('/customers/me/wishlist/:productId', async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.upsert({ where: { customerId: req.customer.id }, create: { customerId: req.customer.id }, update: {} })
    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: req.params.productId } },
      create: { wishlistId: wishlist.id, productId: req.params.productId },
      update: {},
    })
    res.status(201).json({ ok: true })
  } catch (error) { next(error) }
})

router.delete('/customers/me/wishlist/:productId', async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.findUnique({ where: { customerId: req.customer.id } })
    if (wishlist) await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId: req.params.productId } })
    res.status(204).end()
  } catch (error) { next(error) }
})

export default router
