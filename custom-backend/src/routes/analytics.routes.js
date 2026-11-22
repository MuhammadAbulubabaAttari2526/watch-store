import express from 'express'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.get('/admin/analytics/overview', authenticate, requirePermission('analytics.view'), async (_req, res, next) => {
  try {
    const [revenueRows, orderAggregate, orders, customers, products, pendingOrders, completedOrders, recentOrders] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({ _avg: { total: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.product.count({ where: { status: 'PUBLISHED' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { customer: { select: { firstName: true, lastName: true, email: true } }, items: true } }),
    ])
    const lowStockItems = await prisma.inventory.findMany({
      include: { variant: { include: { product: { select: { title: true, slug: true } } } } },
    })
    const low = lowStockItems.filter((item) => item.quantity <= item.lowStockThreshold)
    res.json({
      totalRevenue: revenueRows._sum.total || 0,
      averageOrderValue: orderAggregate._avg.total || 0,
      totalOrders: orders,
      totalCustomers: customers,
      totalProducts: products,
      pendingOrders,
      completedOrders,
      lowStock: low,
      recentOrders,
    })
  } catch (error) { next(error) }
})

router.get('/admin/analytics/revenue', authenticate, requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30))
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const since = new Date(today)
    since.setUTCDate(since.getUTCDate() - days + 1)
    const until = new Date(today)
    until.setUTCDate(until.getUTCDate() + 1)
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since, lt: until }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    })
    const buckets = new Map()
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since)
      date.setUTCDate(since.getUTCDate() + offset)
      buckets.set(date.toISOString().slice(0, 10), 0)
    }
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10)
      buckets.set(key, (buckets.get(key) || 0) + Number(order.total))
    }
    res.json({ series: [...buckets].map(([date, revenue]) => ({ date, revenue })) })
  } catch (error) { next(error) }
})

router.get('/admin/analytics/products', authenticate, requirePermission('analytics.view'), async (_req, res, next) => {
  try {
    const items = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })
    const productIds = items.map((item) => item.productId).filter(Boolean)
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true, slug: true } })
    res.json({
      items: items.map((item) => ({
        product: products.find((product) => product.id === item.productId) || null,
        quantity: item._sum.quantity || 0,
        revenue: item._sum.lineTotal || 0,
      })),
    })
  } catch (error) { next(error) }
})

export default router
