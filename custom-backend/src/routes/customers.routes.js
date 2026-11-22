import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.get('/admin/customers', authenticate, requirePermission('customers.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const search = String(req.query.search || '').trim()
    const where = search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] } : {}
    const [items, total] = await Promise.all([
      prisma.customer.findMany({ where, include: { _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.customer.count({ where }),
    ])
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  } catch (error) { next(error) }
})

router.get('/admin/customers/:id', authenticate, requirePermission('customers.view'), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { addresses: true, orders: { orderBy: { createdAt: 'desc' }, include: { items: true, payments: true } } },
    })
    if (!customer) return res.status(404).json({ message: 'Customer not found' })
    res.json({ customer })
  } catch (error) { next(error) }
})

router.patch('/admin/customers/:id/status', authenticate, requirePermission('customers.manage'), async (req, res, next) => {
  try {
    const parsed = z.enum(['ACTIVE', 'DISABLED']).safeParse(req.body.status)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid customer status' })
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: { status: parsed.data } })
    res.json({ customer })
  } catch (error) { next(error) }
})

export default router
