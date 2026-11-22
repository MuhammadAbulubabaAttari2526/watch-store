import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, authenticateCustomer, optionalAuthenticateCustomer, requirePermission } from '../middleware/auth.js'

const router = express.Router()

const checkoutSchema = z.object({
  cartId: z.string().min(1),
  contactEmail: z.email().transform((v) => v.toLowerCase()),
  paymentMethod: z.enum(['COD', 'BANK_TRANSFER', 'ONLINE']).default('COD'),
  discountCode: z.string().trim().optional(),
  orderNotes: z.string().trim().max(2000).optional(),
  shippingAddress: z.object({
    firstName: z.string().trim().min(2).max(50),
    lastName: z.string().trim().min(2).max(50),
    address1: z.string().trim().min(6).max(200),
    address2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    region: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().regex(/^\d{5}$/).optional(),
    countryCode: z.literal('PK').default('PK'),
    phone: z.string().trim().regex(/^(\+92|0092|0)?3\d{9}$/),
  }),
})

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `+92${digits.slice(1)}`
  if (digits.length === 10) return `+92${digits}`
  return `+92${digits.slice(-10)}`
}

router.post('/orders', optionalAuthenticateCustomer, async (req, res, next) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid checkout data', errors: parsed.error.flatten().fieldErrors })
    if (parsed.data.paymentMethod === 'ONLINE') {
      return res.status(400).json({ message: 'Online payment gateway is not configured; use COD or bank transfer' })
    }
    const data = parsed.data
    const idempotencyKey = req.headers['x-idempotency-key']?.toString() || null
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey } })
      if (existing) return res.status(200).json({ order: existing })
    }
    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { id: data.cartId },
        include: { items: { include: { variant: { include: { inventory: true, product: true } } } }, discount: true },
      })
      if (!cart || cart.items.length === 0) throw Object.assign(new Error('Cart is empty'), { status: 400 })
      if (cart.customerId && cart.customerId !== req.customer?.id) throw Object.assign(new Error('This cart belongs to another customer'), { status: 403 })

      let subtotal = 0
      for (const item of cart.items) {
        if (!item.variant.isActive || item.variant.product.status !== 'PUBLISHED') throw Object.assign(new Error('A cart item is no longer available'), { status: 409 })
        if (!item.variant.inventory || item.variant.inventory.quantity < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${item.variant.product.title}`), { status: 409 })
        const price = item.variant.salePrice ?? item.variant.price
        subtotal += Number(price) * item.quantity
      }

      let discount = null
      if (data.discountCode) {
        discount = await tx.discount.findUnique({ where: { code: data.discountCode.toUpperCase() } })
        const now = new Date()
        if (!discount || !discount.isActive || (discount.startsAt && discount.startsAt > now) || (discount.expiresAt && discount.expiresAt < now) || (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) || (discount.minimumOrder && subtotal < Number(discount.minimumOrder))) {
          throw Object.assign(new Error('That discount code is not valid'), { status: 400 })
        }
      }

      const shippingSettings = await tx.storeSetting.findMany({ where: { key: { in: ['shipping_karachi', 'shipping_nationwide'] } } })
      const rates = Object.fromEntries(shippingSettings.map((setting) => [setting.key, Number(setting.value)]))
      const shippingTotal = data.shippingAddress.city.trim().toLowerCase().includes('karachi')
        ? rates.shipping_karachi
        : rates.shipping_nationwide
      if (!Number.isFinite(shippingTotal) || shippingTotal < 0) throw Object.assign(new Error('Shipping is not configured. Please contact the store.'), { status: 503 })
      let discountTotal = 0
      if (discount) {
        discountTotal = discount.type === 'PERCENTAGE'
          ? subtotal * Number(discount.value) / 100
          : Number(discount.value)
        discountTotal = Math.min(discountTotal, subtotal)
      }
      const total = subtotal - discountTotal + shippingTotal
      const orderNumber = `VLX-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      const order = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey,
          customerId: req.customer?.id || cart.customerId || null,
          contactEmail: data.contactEmail,
          orderNotes: data.orderNotes,
          paymentMethod: data.paymentMethod,
          subtotal,
          discountTotal,
          shippingTotal,
          total,
          discountId: discount?.id || null,
          shippingFirstName: data.shippingAddress.firstName,
          shippingLastName: data.shippingAddress.lastName,
          shippingAddress1: data.shippingAddress.address1,
          shippingAddress2: data.shippingAddress.address2,
          shippingCity: data.shippingAddress.city,
          shippingRegion: data.shippingAddress.region,
          shippingPostalCode: data.shippingAddress.postalCode,
          shippingCountryCode: 'PK',
          shippingPhone: normalizePhone(data.shippingAddress.phone),
          items: {
            create: await Promise.all(cart.items.map(async (item) => {
              const price = item.variant.salePrice ?? item.variant.price
              return {
                productId: item.variant.productId,
                variantId: item.variantId,
                productTitle: item.variant.product.title,
                variantTitle: item.variant.title,
                sku: item.variant.sku,
                quantity: item.quantity,
                unitPrice: price,
                lineTotal: Number(price) * item.quantity,
              }
            })),
          },
          payments: { create: { method: data.paymentMethod, status: data.paymentMethod === 'COD' ? 'PENDING' : 'PENDING', amount: total } },
        },
        include: { items: true, payments: true },
      })
      await tx.orderTimeline.create({ data: { orderId: order.id, status: 'PENDING', note: 'Order placed' } })

      for (const item of cart.items) {
        const adjusted = await tx.inventory.updateMany({
          where: { variantId: item.variantId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        })
        if (adjusted.count !== 1) throw Object.assign(new Error(`Insufficient stock for ${item.variant.product.title}`), { status: 409 })
        await tx.inventoryTransaction.create({
          data: { variantId: item.variantId, variantSku: item.variant.sku, type: 'SOLD', change: -item.quantity, note: `Order ${order.orderNumber}` },
        })
      }
      if (discount) await tx.discount.update({ where: { id: discount.id }, data: { usageCount: { increment: 1 } } })
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      await tx.cart.delete({ where: { id: cart.id } })
      return order
    }, { isolationLevel: 'Serializable', timeout: 15000 })
    res.status(201).json({ order: result })
  } catch (error) { next(error) }
})

router.get('/admin/orders', authenticate, requirePermission('orders.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const status = String(req.query.status || '')
    const where = status ? { status } : {}
    const [items, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true, payments: true, customer: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.order.count({ where }),
    ])
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  } catch (error) { next(error) }
})

router.get('/admin/orders/:id', authenticate, requirePermission('orders.view'), async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true, payments: true, customer: true, discount: true, timeline: { orderBy: { createdAt: 'asc' } } } })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ order })
  } catch (error) { next(error) }
})

router.patch('/admin/orders/:id/status', authenticate, requirePermission('orders.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid order status', errors: parsed.error.flatten().fieldErrors })
    if (parsed.data.status === 'CANCELLED') return res.status(400).json({ message: 'Use the cancel action so inventory can be restored' })
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: req.params.id } })
      if (!current) throw Object.assign(new Error('Order not found'), { status: 404 })
      const allowed = {
        PENDING: ['CONFIRMED'],
        CONFIRMED: ['PROCESSING'],
        PROCESSING: ['SHIPPED'],
        SHIPPED: ['DELIVERED', 'RETURNED'],
        DELIVERED: ['RETURNED'],
        CANCELLED: [],
        RETURNED: [],
      }
      if (!allowed[current.status].includes(parsed.data.status)) {
        throw Object.assign(new Error(`Order cannot move from ${current.status} to ${parsed.data.status}`), { status: 409 })
      }
      if (parsed.data.status === 'RETURNED') {
        const items = await tx.orderItem.findMany({ where: { orderId: current.id } })
        for (const item of items) {
          if (item.variantId) {
            await tx.inventory.update({ where: { variantId: item.variantId }, data: { quantity: { increment: item.quantity } } })
            await tx.inventoryTransaction.create({
              data: { variantId: item.variantId, variantSku: item.sku, type: 'RETURNED', change: item.quantity, note: `Returned order ${current.orderNumber}`, userId: req.user.id },
            })
          }
        }
      }
      const updated = await tx.order.update({ where: { id: current.id }, data: { status: parsed.data.status } })
      await tx.orderTimeline.create({ data: { orderId: current.id, status: parsed.data.status, actorId: req.user.id, note: `Status changed from ${current.status}` } })
      await tx.auditLog.create({ data: { actorId: req.user.id, action: 'order.status.updated', entityType: 'order', entityId: current.id, details: { from: current.status, to: parsed.data.status } } })
      return updated
    })
    res.json({ order })
  } catch (error) { next(error) }
})

router.post('/admin/orders/:id/cancel', authenticate, requirePermission('orders.manage'), async (req, res, next) => {
  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } })
      if (!current) throw Object.assign(new Error('Order not found'), { status: 404 })
      if (current.status === 'CANCELLED') return current
      if (['DELIVERED', 'SHIPPED'].includes(current.status)) throw Object.assign(new Error('This order can no longer be cancelled'), { status: 409 })
      for (const item of current.items) {
        if (item.variantId) {
          await tx.inventory.update({ where: { variantId: item.variantId }, data: { quantity: { increment: item.quantity } } })
          await tx.inventoryTransaction.create({
            data: { variantId: item.variantId, variantSku: item.sku, type: 'RELEASED', change: item.quantity, note: `Cancelled order ${current.orderNumber}`, userId: req.user.id },
          })
        }
      }
      const updated = await tx.order.update({ where: { id: current.id }, data: { status: 'CANCELLED' } })
      await tx.orderTimeline.create({ data: { orderId: current.id, status: 'CANCELLED', actorId: req.user.id, note: 'Order cancelled; stock restored' } })
      await tx.auditLog.create({ data: { actorId: req.user.id, action: 'order.cancelled', entityType: 'order', entityId: current.id } })
      return updated
    })
    res.json({ order })
  } catch (error) { next(error) }
})

router.patch('/admin/orders/:id/payment', authenticate, requirePermission('orders.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid payment status' })
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: req.params.id }, include: { payments: true } })
      if (!current || !current.payments.length) throw Object.assign(new Error('Payment record not found'), { status: 404 })
      if (parsed.data.status === 'PAID' && current.payments.some((payment) => payment.method === 'ONLINE')) {
        throw Object.assign(new Error('Online payments can only be marked paid after provider verification'), { status: 409 })
      }
      await tx.payment.updateMany({
        where: { orderId: req.params.id },
        data: { status: parsed.data.status, verifiedAt: parsed.data.status === 'PAID' ? new Date() : null },
      })
      await tx.auditLog.create({ data: { actorId: req.user.id, action: 'payment.status.updated', entityType: 'order', entityId: req.params.id, details: { status: parsed.data.status } } })
      return tx.order.findUnique({ where: { id: req.params.id }, include: { payments: true } })
    })
    res.json({ order })
  } catch (error) { next(error) }
})

router.get('/orders/me', authenticateCustomer, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({ where: { customerId: req.customer.id }, include: { items: true, payments: true, timeline: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } })
    res.json({ orders })
  } catch (error) { next(error) }
})

router.get('/orders/me/:id', authenticateCustomer, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
      include: { items: true, payments: true, timeline: { orderBy: { createdAt: 'asc' } } },
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ order })
  } catch (error) { next(error) }
})

export default router
