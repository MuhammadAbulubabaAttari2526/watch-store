import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'

export async function authenticate(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null
    const token = bearer || req.cookies?.veltrix_admin || req.cookies?.veltrix_customer
    if (!token) return res.status(401).json({ message: 'Authentication required' })

    const payload = jwt.verify(token, env.jwtSecret)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    })
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ message: 'Account unavailable' })
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.code,
      permissions: user.role.permissions.map((item) => item.permission.code),
    }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' })
  }
}

export async function authenticateCustomer(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null
    const token = bearer || req.cookies?.veltrix_customer
    if (!token) return res.status(401).json({ message: 'Authentication required' })
    const payload = jwt.verify(token, env.jwtSecret)
    const customer = await prisma.customer.findUnique({ where: { id: payload.sub } })
    if (!customer || customer.status !== 'ACTIVE') return res.status(401).json({ message: 'Account unavailable' })
    req.customer = customer
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' })
  }
}

export async function optionalAuthenticateCustomer(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null
  const token = bearer || req.cookies?.veltrix_customer
  if (!token) return next()
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    const customer = await prisma.customer.findUnique({ where: { id: payload.sub } })
    if (!customer || customer.status !== 'ACTIVE') return res.status(401).json({ message: 'Account unavailable' })
    req.customer = customer
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' })
  }
}

export async function authenticateAdmin(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null
    const token = bearer || req.cookies?.veltrix_admin
    if (!token) return res.status(401).json({ message: 'Authentication required' })
    const payload = jwt.verify(token, env.jwtSecret)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    })
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ message: 'Account unavailable' })
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.code,
      permissions: user.role.permissions.map((item) => item.permission.code),
    }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }
    next()
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && !req.user.permissions.includes(permission))) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }
    next()
  }
}
