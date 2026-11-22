import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.get('/shipping-options', async (req, res, next) => {
  try {
    const settings = await prisma.storeSetting.findMany({
      where: { key: { in: ['shipping_karachi', 'shipping_nationwide'] } },
    })
    const rates = Object.fromEntries(settings.map((setting) => [setting.key, Number(setting.value)]))
    const options = [
      { id: 'karachi', name: 'Karachi Delivery', amount: rates.shipping_karachi },
      { id: 'nationwide', name: 'Nationwide Delivery', amount: rates.shipping_nationwide },
    ]
    const city = String(req.query.city || '').trim().toLowerCase()
    const visible = city
      ? options.filter((option) => option.id === (city.includes('karachi') ? 'karachi' : 'nationwide'))
      : options
    if (visible.some((option) => !Number.isFinite(option.amount) || option.amount < 0)) {
      return res.status(503).json({ message: 'Shipping is not configured. Please contact the store.' })
    }
    res.json({ shippingOptions: visible })
  } catch (error) { next(error) }
})

router.get('/settings/public', async (_req, res, next) => {
  try {
    const settings = await prisma.storeSetting.findMany({ where: { key: { in: ['store_name', 'store_phone', 'store_email', 'store_address', 'announcement'] } } })
    res.json({ settings: Object.fromEntries(settings.map((item) => [item.key, item.value])) })
  } catch (error) { next(error) }
})

router.get('/admin/settings', authenticate, requirePermission('settings.manage'), async (_req, res, next) => {
  try {
    const settings = await prisma.storeSetting.findMany({ orderBy: { key: 'asc' } })
    res.json({ settings })
  } catch (error) { next(error) }
})

router.put('/admin/settings', authenticate, requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const parsed = z.record(z.string(), z.unknown()).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid settings' })
    await prisma.$transaction(Object.entries(parsed.data).map(([key, value]) =>
      prisma.storeSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    ))
    res.json({ ok: true })
  } catch (error) { next(error) }
})

export default router
