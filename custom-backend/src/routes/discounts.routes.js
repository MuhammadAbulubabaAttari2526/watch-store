import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()
const discountSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((v) => v.toUpperCase()),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.coerce.number().positive(),
  minimumOrder: z.coerce.number().nonnegative().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().default(true),
}).refine((value) => value.type !== 'PERCENTAGE' || value.value <= 100, {
  message: 'Percentage discounts cannot exceed 100',
  path: ['value'],
}).refine((value) => !value.startsAt || !value.expiresAt || value.expiresAt > value.startsAt, {
  message: 'Expiration must be after the start date',
  path: ['expiresAt'],
})

router.get('/admin/discounts', authenticate, requirePermission('discounts.manage'), async (_req, res, next) => {
  try {
    const items = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ items })
  } catch (error) { next(error) }
})
router.post('/admin/discounts', authenticate, requirePermission('discounts.manage'), async (req, res, next) => {
  try {
    const parsed = discountSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid discount', errors: parsed.error.flatten().fieldErrors })
    const item = await prisma.discount.create({ data: parsed.data })
    res.status(201).json({ discount: item })
  } catch (error) { next(error) }
})
router.put('/admin/discounts/:id', authenticate, requirePermission('discounts.manage'), async (req, res, next) => {
  try {
    const parsed = discountSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid discount', errors: parsed.error.flatten().fieldErrors })
    const item = await prisma.discount.update({ where: { id: req.params.id }, data: parsed.data })
    res.json({ discount: item })
  } catch (error) { next(error) }
})
router.delete('/admin/discounts/:id', authenticate, requirePermission('discounts.manage'), async (req, res, next) => {
  try { await prisma.discount.delete({ where: { id: req.params.id } }); res.status(204).end() }
  catch (error) { next(error) }
})

export default router
