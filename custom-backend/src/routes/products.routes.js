import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { validate, paginationSchema } from '../validators/common.js'

const router = express.Router()

router.get('/products', async (req, res, next) => {
  try {
    const parsed = paginationSchema.extend({
      category: z.string().optional(),
      collection: z.string().optional(),
      q: z.string().trim().max(100).optional(),
      color: z.string().trim().optional(),
      strap: z.string().trim().optional(),
      sort: z.enum(['newest', 'oldest', 'title', 'price-asc', 'price-desc']).optional(),
      min: z.coerce.number().nonnegative().optional(),
      max: z.coerce.number().nonnegative().optional(),
    }).safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten().fieldErrors })
    const { page, limit, category, collection, sort, min, max, color, strap } = parsed.data
    const search = parsed.data.search || parsed.data.q
    if (min !== undefined && max !== undefined && min > max) return res.status(400).json({ message: 'Minimum price cannot exceed maximum price' })
    const where = {
      status: 'PUBLISHED',
      ...(min !== undefined || max !== undefined ? { variants: { some: { OR: [
        { salePrice: { not: null, ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) } },
        { salePrice: null, price: { ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) } },
      ] } } } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { brand: { contains: search, mode: 'insensitive' } }, { model: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(category ? { categories: { some: { OR: [
        { slug: category },
        { name: { equals: category, mode: 'insensitive' } },
      ] } } } : {}),
      ...(collection ? { collections: { some: { slug: collection } } } : {}),
    }
    const orderBy = sort === 'oldest' ? { createdAt: 'asc' } : sort === 'title' ? { title: 'asc' } : { createdAt: 'desc' }
    const needsClientSort = sort === 'price-asc' || sort === 'price-desc'
    const needsOptionFilter = Boolean(color || strap)
    if (needsClientSort || needsOptionFilter) {
      const matches = await prisma.product.findMany({
        where,
        include: { images: { orderBy: { position: 'asc' } }, variants: { include: { inventory: true } }, categories: true, collections: true },
        orderBy,
      })
      const hasOption = (product, pattern, value) => product.variants.some((variant) => {
        const options = variant.options && typeof variant.options === 'object' && !Array.isArray(variant.options)
          ? Object.entries(variant.options)
          : []
        return options.some(([key, option]) => pattern.test(key) && String(option).toLowerCase() === value.toLowerCase())
      })
      const filtered = matches.filter((product) =>
        (!color || hasOption(product, /colou?r|dial/i, color)) &&
        (!strap || hasOption(product, /strap/i, strap))
      )
      if (needsClientSort) {
        const lowestPrice = (product) => Math.min(...product.variants.map((variant) => Number(variant.salePrice ?? variant.price)))
        filtered.sort((a, b) => sort === 'price-asc' ? lowestPrice(a) - lowestPrice(b) : lowestPrice(b) - lowestPrice(a))
      }
      const total = filtered.length
      const items = filtered.slice((page - 1) * limit, page * limit)
      return res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
    }
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { images: { orderBy: { position: 'asc' } }, variants: { include: { inventory: true } }, categories: true, collections: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  } catch (error) { next(error) }
})

router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }], status: 'PUBLISHED' },
      include: { images: { orderBy: { position: 'asc' } }, variants: { include: { inventory: true } }, categories: true, collections: true, reviews: { where: { status: 'APPROVED' }, include: { customer: { select: { firstName: true, lastName: true } } } } },
    })

    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (error) { next(error) }
})

router.get('/admin/products', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try {
    const parsed = paginationSchema.extend({
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    }).safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten().fieldErrors })
    const { page, limit, search, status } = parsed.data
    const where = {
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { brand: { contains: search, mode: 'insensitive' } }, { model: { contains: search, mode: 'insensitive' } }] } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, include: { images: { orderBy: { position: 'asc' } }, variants: { include: { inventory: true } }, categories: true, collections: true }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ])
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  } catch (error) { next(error) }
})

const productSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().optional(),
  movement: z.string().trim().optional(),
  caseMaterial: z.string().trim().optional(),
  caseDiameter: z.string().trim().optional(),
  strapMaterial: z.string().trim().optional(),
  waterResistance: z.string().trim().optional(),
  dialColor: z.string().trim().optional(),
  warranty: z.string().trim().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  categoryIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  images: z.array(z.object({
    url: z.string().trim().min(1).refine((value) => value.startsWith('/uploads/') || z.url().safeParse(value).success),
    altText: z.string().optional(),
    position: z.number().int().min(0).optional(),
  })).default([]),
  variants: z.array(z.object({
    title: z.string().trim().min(1),
    sku: z.string().trim().min(1),
    options: z.record(z.string(), z.unknown()).optional(),
    price: z.coerce.number().positive(),
    salePrice: z.coerce.number().positive().optional(),
    quantity: z.coerce.number().int().min(0).default(0),
  })).min(1),
})

async function saveProduct(req, res, next, existingId) {
  try {
    const data = req.validated
    const { categoryIds, collectionIds, images, variants, ...fields } = data
    const result = await prisma.$transaction(async (tx) => {
      const product = existingId
        ? await tx.product.update({
            where: { id: existingId },
            data: { ...fields, publishedAt: fields.status === 'PUBLISHED' ? new Date() : null, categories: { set: categoryIds.map((id) => ({ id })) }, collections: { set: collectionIds.map((id) => ({ id })) } },
          })
        : await tx.product.create({
            data: { ...fields, publishedAt: fields.status === 'PUBLISHED' ? new Date() : null, categories: { connect: categoryIds.map((id) => ({ id })) }, collections: { connect: collectionIds.map((id) => ({ id })) } },
          })
      if (existingId) {
        await tx.productImage.deleteMany({ where: { productId: product.id } })
      }
      if (images.length) {
        await tx.productImage.createMany({ data: images.map((image, position) => ({ ...image, position: image.position ?? position, productId: product.id })) })
      }
      const retainedVariantIds = []
      for (const variant of variants) {
        const { quantity, price, salePrice, ...variantFields } = variant
        const bySku = await tx.productVariant.findUnique({ where: { sku: variantFields.sku }, include: { inventory: true } })
        if (bySku && bySku.productId !== product.id) throw Object.assign(new Error(`SKU ${variantFields.sku} is already assigned to another product`), { status: 409 })
        const savedVariant = bySku
          ? await tx.productVariant.update({ where: { id: bySku.id }, data: { ...variantFields, price, salePrice: salePrice ?? null, isActive: true } })
          : await tx.productVariant.create({ data: { ...variantFields, productId: product.id, price, salePrice: salePrice ?? null } })
        retainedVariantIds.push(savedVariant.id)
        const previousQuantity = bySku?.inventory?.quantity ?? 0
        await tx.inventory.upsert({
          where: { variantId: savedVariant.id },
          create: { variantId: savedVariant.id, quantity },
          update: { quantity },
        })
        if (quantity !== previousQuantity) {
          await tx.inventoryTransaction.create({
            data: {
              variantId: savedVariant.id,
              variantSku: savedVariant.sku,
              type: 'ADJUSTED',
              change: quantity - previousQuantity,
              note: existingId ? `Product inventory updated: ${product.title}` : `Initial product stock: ${product.title}`,
              userId: req.user.id,
            },
          })
        }
      }
      await tx.productVariant.updateMany({
        where: { productId: product.id, ...(retainedVariantIds.length ? { id: { notIn: retainedVariantIds } } : {}) },
        data: { isActive: false },
      })
      await tx.auditLog.create({
        data: { actorId: req.user.id, action: existingId ? 'product.updated' : 'product.created', entityType: 'product', entityId: product.id, details: { status: product.status, variants: variants.length } },
      })
      return tx.product.findUnique({ where: { id: product.id }, include: { images: true, variants: { include: { inventory: true } }, categories: true, collections: true } })
    })
    res.status(existingId ? 200 : 201).json({ product: result })
  } catch (error) { next(error) }
}

router.post('/admin/products', authenticate, requirePermission('products.manage'), validate(productSchema), (req, res, next) => saveProduct(req, res, next))
router.put('/admin/products/:id', authenticate, requirePermission('products.manage'), validate(productSchema), (req, res, next) => saveProduct(req, res, next, req.params.id))
router.patch('/admin/products/:id/status', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try {
    const status = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).safeParse(req.body.status)
    if (!status.success) return res.status(400).json({ message: 'Invalid product status' })
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { status: status.data, publishedAt: status.data === 'PUBLISHED' ? new Date() : null } })
    res.json({ product })
  } catch (error) { next(error) }
})
router.delete('/admin/products/:id', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (error) { next(error) }
})

export default router
