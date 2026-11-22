import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { validate } from '../validators/common.js'

const router = express.Router()

router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } }, children: true }, orderBy: { name: 'asc' } })
    res.json({ categories })
  } catch (error) { next(error) }
})
router.get('/collections', async (_req, res, next) => {
  try {
    const collections = await prisma.collection.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' } })
    res.json({ collections })
  } catch (error) { next(error) }
})

const catalogSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().optional(),
  parentId: z.string().optional(),
})

router.post('/admin/categories', authenticate, requirePermission('products.manage'), validate(catalogSchema), async (req, res, next) => {
  try {
    const category = await prisma.category.create({ data: req.validated })
    res.status(201).json({ category })
  } catch (error) { next(error) }
})
router.put('/admin/categories/:id', authenticate, requirePermission('products.manage'), validate(catalogSchema), async (req, res, next) => {
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: req.validated })
    res.json({ category })
  } catch (error) { next(error) }
})
router.delete('/admin/categories/:id', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try { await prisma.category.delete({ where: { id: req.params.id } }); res.status(204).end() }
  catch (error) { next(error) }
})

router.post('/admin/collections', authenticate, requirePermission('products.manage'), validate(catalogSchema), async (req, res, next) => {
  try {
    const { name, slug, description } = req.validated
    const collection = await prisma.collection.create({ data: { name, slug, description } })
    res.status(201).json({ collection })
  } catch (error) { next(error) }
})
router.put('/admin/collections/:id', authenticate, requirePermission('products.manage'), validate(catalogSchema), async (req, res, next) => {
  try {
    const { name, slug, description } = req.validated
    const collection = await prisma.collection.update({ where: { id: req.params.id }, data: { name, slug, description } })
    res.json({ collection })
  } catch (error) { next(error) }
})
router.delete('/admin/collections/:id', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try { await prisma.collection.delete({ where: { id: req.params.id } }); res.status(204).end() }
  catch (error) { next(error) }
})

export default router
