import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use('/admin/users', authenticate, requireRole('SUPER_ADMIN'))

router.get('/admin/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: 'desc' } })
    res.json({ users })
  } catch (error) { next(error) }
})

router.post('/admin/users', async (req, res, next) => {
  try {
    const parsed = z.object({
      firstName: z.string().trim().min(2).max(50),
      lastName: z.string().trim().min(2).max(50),
      email: z.email().transform((v) => v.toLowerCase()),
      password: z.string().min(10).max(72),
      roleCode: z.enum(['SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_MANAGER']),
      status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid admin', errors: parsed.error.flatten().fieldErrors })
    const { roleCode, password, ...data } = parsed.data
    const role = await prisma.role.findUnique({ where: { code: roleCode } })
    if (!role) return res.status(400).json({ message: 'Unknown role' })
    const user = await prisma.user.create({
      data: { ...data, passwordHash: await bcrypt.hash(password, 12), roleId: role.id },
      include: { role: true },
    })
    res.status(201).json({ user })
  } catch (error) { next(error) }
})

router.patch('/admin/users/:id', async (req, res, next) => {
  try {
    const parsed = z.object({
      roleCode: z.enum(['SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_MANAGER']).optional(),
      status: z.enum(['ACTIVE', 'DISABLED']).optional(),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid admin update' })
    const role = parsed.data.roleCode ? await prisma.role.findUnique({ where: { code: parsed.data.roleCode } }) : null
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(parsed.data.status ? { status: parsed.data.status } : {}), ...(role ? { roleId: role.id } : {}) },
      include: { role: true },
    })
    res.json({ user })
  } catch (error) { next(error) }
})

export default router
