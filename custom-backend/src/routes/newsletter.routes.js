import express from 'express'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.post('/newsletter', async (req, res, next) => {
  try {
    const parsed = z.object({ email: z.email().transform((value) => value.toLowerCase()) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email address' })
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, status: 'SUBSCRIBED' },
      update: { status: 'SUBSCRIBED', subscribedAt: new Date() },
    })
    res.json({ ok: true })
  } catch (error) { next(error) }
})

router.get('/admin/newsletter', authenticate, requirePermission('settings.manage'), async (_req, res, next) => {
  try {
    const items = await prisma.newsletterSubscriber.findMany({ where: { status: 'SUBSCRIBED' }, orderBy: { subscribedAt: 'desc' } })
    res.json({ items })
  } catch (error) { next(error) }
})

export default router
