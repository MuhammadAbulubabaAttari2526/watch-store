import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, authenticateCustomer, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.post('/reviews', authenticateCustomer, async (req, res, next) => {
  try {
    const parsed = z.object({
      productId: z.string().min(1),
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(120).optional(),
      body: z.string().trim().min(10).max(3000),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid review', errors: parsed.error.flatten().fieldErrors })
    const review = await prisma.review.create({ data: { ...parsed.data, customerId: req.customer.id, status: 'PENDING' } })
    res.status(201).json({ review })
  } catch (error) { next(error) }
})

router.get('/admin/reviews', authenticate, requirePermission('reviews.manage'), async (_req, res, next) => {
  try {
    const items = await prisma.review.findMany({ include: { product: true, customer: true }, orderBy: { createdAt: 'desc' } })
    res.json({ items })
  } catch (error) { next(error) }
})

router.patch('/admin/reviews/:id/status', authenticate, requirePermission('reviews.manage'), async (req, res, next) => {
  try {
    const parsed = z.enum(['PENDING', 'APPROVED', 'REJECTED']).safeParse(req.body.status)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid review status' })
    const review = await prisma.review.update({ where: { id: req.params.id }, data: { status: parsed.data } })
    res.json({ review })
  } catch (error) { next(error) }
})

export default router
