import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use('/admin/inventory', authenticate)

router.get('/admin/inventory', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const items = await prisma.inventory.findMany({
      include: { variant: { include: { product: { select: { id: true, title: true, slug: true, status: true } } } } },
      orderBy: { quantity: 'asc' },
    })
    res.json({ items })
  } catch (error) { next(error) }
})

router.patch('/admin/inventory/:id', requirePermission('inventory.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({
      quantity: z.coerce.number().int().min(0),
      lowStockThreshold: z.coerce.number().int().min(0).optional(),
      note: z.string().trim().max(500).optional(),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid inventory update', errors: parsed.error.flatten().fieldErrors })
    const { quantity, lowStockThreshold, note } = parsed.data
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({ where: { id: req.params.id }, include: { variant: true } })
      if (!current) throw Object.assign(new Error('Inventory record not found'), { status: 404 })
      const inventory = await tx.inventory.update({
        where: { id: req.params.id },
        data: { quantity, ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}) },
      })
      await tx.inventoryTransaction.create({
        data: {
          variantId: current.variantId,
          variantSku: current.variant.sku,
          type: 'ADJUSTED',
          change: quantity - current.quantity,
          note,
          userId: req.user.id,
        },
      })
      return inventory
    })
    res.json({ inventory: result })
  } catch (error) { next(error) }
})

router.get('/admin/inventory/history', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const items = await prisma.inventoryTransaction.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ items })
  } catch (error) { next(error) }
})

export default router
