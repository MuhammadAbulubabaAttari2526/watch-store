import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { env } from '../config/env.js'
import { authenticateAdmin, authenticateCustomer } from '../middleware/auth.js'
import { validate } from '../validators/common.js'

const router = express.Router()
const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(30).optional(),
})
const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1),
})

function signSession(subject) {
  return jwt.sign({ sub: subject }, env.jwtSecret, { expiresIn: '7d', issuer: 'veltrix', audience: 'veltrix-app' })
}

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { password, ...profile } = req.validated
    const existing = await prisma.customer.findUnique({ where: { email: profile.email } })
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' })
    const customer = await prisma.customer.create({
      data: { ...profile, passwordHash: await bcrypt.hash(password, 12) },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    })
    const token = signSession(customer.id)
    res.cookie('veltrix_customer', token, { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 604800000 })
    res.status(201).json({ customer })
  } catch (error) { next(error) }
})

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated
    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer || customer.status !== 'ACTIVE' || !customer.passwordHash) {
      return res.status(401).json({ message: 'Email or password is incorrect' })
    }
    if (!(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect' })
    }
    const token = signSession(customer.id)
    res.cookie('veltrix_customer', token, { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 604800000 })
    res.json({ customer: { id: customer.id, email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone } })
  } catch (error) { next(error) }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('veltrix_customer')
  res.clearCookie('veltrix_admin')
  res.json({ ok: true })
})

router.post('/admin/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    })
    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect' })
    }
    const token = signSession(user.id)
    res.cookie('veltrix_admin', token, { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 604800000 })
    res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.code, permissions: user.role.permissions.map((item) => item.permission.code) } })
  } catch (error) { next(error) }
})

router.get('/me', authenticateCustomer, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.id },
      include: { addresses: true },
    })
    if (!customer) return res.status(404).json({ message: 'Customer not found' })
    res.json({ customer })
  } catch (error) { next(error) }
})

router.get('/admin/me', authenticateAdmin, (req, res) => {
  res.json({ user: req.user })
})

export default router
