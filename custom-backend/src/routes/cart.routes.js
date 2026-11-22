import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticateCustomer } from '../middleware/auth.js'

const router = express.Router()

router.post('/carts', async (req, res, next) => {
  try {
    let customerId = null
    const authorization = req.headers.authorization
    if (authorization?.startsWith('Bearer ')) {
      // Carts may be linked by the authenticated frontend after login.
      customerId = req.customer?.id || null
    }
    const cart = await prisma.cart.create({ data: { customerId }, include: { items: { include: { variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } }, inventory: true } } } } } })
    res.status(201).json({ cart })
  } catch (error) { next(error) }
})

router.get('/carts/:id', async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } }, inventory: true } } } }, discount: true },
    })

    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    res.json({ cart })
  } catch (error) { next(error) }
})

router.post('/carts/:id/discount', async (req, res, next) => {
  try {
    const parsed = z.object({ code: z.string().trim().min(1).max(40) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Enter a valid discount code' })
    const cart = await prisma.cart.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { variant: true } } },
    })
    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
    const discount = await prisma.discount.findUnique({ where: { code: parsed.data.code.toUpperCase() } })
    const now = new Date()
    if (!discount || !discount.isActive || (discount.startsAt && discount.startsAt > now) || (discount.expiresAt && discount.expiresAt < now) || (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) || (discount.minimumOrder && subtotal < Number(discount.minimumOrder))) {
      return res.status(400).json({ message: 'That discount code is not valid for this cart' })
    }
    const updated = await prisma.cart.update({
      where: { id: cart.id },
      data: { discountId: discount.id },
      include: { items: { include: { variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } }, inventory: true } } } }, discount: true },
    })
    res.json({ cart: updated })
  } catch (error) { next(error) }
})

router.delete('/carts/:id/discount', async (req, res, next) => {
  try {
    const cart = await prisma.cart.update({
      where: { id: req.params.id },
      data: { discountId: null },
      include: { items: { include: { variant: { include: { product: true, inventory: true } } } }, discount: true },
    })
    res.json({ cart })
  } catch (error) { next(error) }
})

router.post('/carts/:id/attach', authenticateCustomer, async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { id: req.params.id } })
    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    if (cart.customerId && cart.customerId !== req.customer.id) return res.status(403).json({ message: 'Cart belongs to another customer' })
    const updated = await prisma.cart.update({ where: { id: cart.id }, data: { customerId: req.customer.id } })
    res.json({ cart: updated })
  } catch (error) { next(error) }
})

router.post('/carts/:id/items', async (req, res, next) => {
  try {
    const parsed = z.object({ variantId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(20) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid cart item', errors: parsed.error.flatten().fieldErrors })
    const { variantId, quantity } = parsed.data
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId }, include: { inventory: true, product: true } })
      if (!variant || !variant.isActive || variant.product.status !== 'PUBLISHED') throw Object.assign(new Error('This watch is unavailable'), { status: 404 })
      const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: req.params.id, variantId } } })
      const nextQuantity = (existing?.quantity || 0) + quantity
      if (!variant.inventory || variant.inventory.quantity < nextQuantity) throw Object.assign(new Error('Requested quantity is not in stock'), { status: 409 })
      const unitPrice = variant.salePrice ?? variant.price
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: req.params.id, variantId } },
        create: { cartId: req.params.id, variantId, quantity, unitPrice },
        update: { quantity: { increment: quantity }, unitPrice },
      })
      return tx.cart.findUnique({ where: { id: req.params.id }, include: { items: { include: { variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } }, inventory: true } } } }, discount: true } })
    })
    if (!result) return res.status(404).json({ message: 'Cart not found' })
    res.json({ cart: result })
  } catch (error) { next(error) }
})

router.patch('/carts/:id/items/:itemId', async (req, res, next) => {
  try {
    const parsed = z.object({ quantity: z.coerce.number().int().min(0).max(20) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid quantity' })
    const { quantity } = parsed.data
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: req.params.itemId } })
    } else {
      const item = await prisma.cartItem.findUnique({ where: { id: req.params.itemId }, include: { variant: { include: { inventory: true } } } })
      if (!item) return res.status(404).json({ message: 'Cart item not found' })
      if (!item.variant.inventory || item.variant.inventory.quantity < quantity) return res.status(409).json({ message: 'Requested quantity is not in stock' })
      await prisma.cartItem.update({ where: { id: req.params.itemId }, data: { quantity } })
    }
    const cart = await prisma.cart.findUnique({ where: { id: req.params.id }, include: { items: { include: { variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } }, inventory: true } } } }, discount: true } })
    res.json({ cart })
  } catch (error) { next(error) }
})

router.delete('/carts/:id/items/:itemId', async (req, res, next) => {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.itemId } })
    const cart = await prisma.cart.findUnique({ where: { id: req.params.id }, include: { items: { include: { variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } }, inventory: true } } } }, discount: true } })
    res.json({ cart })
  } catch (error) { next(error) }
})

export default router
