import '../src/config/load-env.js'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/prisma.js'

async function main() {
  const permissions = [
    ['products.manage', 'Manage products'],
    ['inventory.view', 'View inventory'],
    ['inventory.manage', 'Manage inventory'],
    ['orders.view', 'View orders'],
    ['orders.manage', 'Manage orders'],
    ['customers.view', 'View customers'],
    ['customers.manage', 'Manage customers'],
    ['discounts.manage', 'Manage discounts'],
    ['analytics.view', 'View analytics'],
    ['reviews.manage', 'Manage reviews'],
    ['settings.manage', 'Manage settings'],
  ]

  for (const [code, name] of permissions) {
    await prisma.permission.upsert({ where: { code }, create: { code, name }, update: { name } })
  }

  for (const code of ['SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_MANAGER']) {
    await prisma.role.upsert({
      where: { code },
      create: { code, name: code.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' ') },
      update: { name: code.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' ') },
    })
  }

  const superRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } })
  const allPermissions = await prisma.permission.findMany()
  await prisma.rolePermission.createMany({
    data: allPermissions.map((permission) => ({ roleId: superRole.id, permissionId: permission.id })),
    skipDuplicates: true,
  })

  const storeManager = await prisma.role.findUnique({ where: { code: 'STORE_MANAGER' } })
  const storePermissionCodes = ['products.manage', 'inventory.view', 'inventory.manage', 'orders.view', 'orders.manage', 'customers.view', 'discounts.manage', 'analytics.view', 'reviews.manage']
  const storePermissions = allPermissions.filter((permission) => storePermissionCodes.includes(permission.code))
  await prisma.rolePermission.createMany({
    data: storePermissions.map((permission) => ({ roleId: storeManager.id, permissionId: permission.id })),
    skipDuplicates: true,
  })

  const orderManager = await prisma.role.findUnique({ where: { code: 'ORDER_MANAGER' } })
  const orderPermissionCodes = ['orders.view', 'orders.manage', 'customers.view']
  const orderPermissions = allPermissions.filter((permission) => orderPermissionCodes.includes(permission.code))
  await prisma.rolePermission.createMany({
    data: orderPermissions.map((permission) => ({ roleId: orderManager.id, permissionId: permission.id })),
    skipDuplicates: true,
  })

  const email = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_PASSWORD
  if (email && password) {
    if (password.length < 12) throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters')
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: {
        email: email.toLowerCase(),
        passwordHash,
        firstName: 'VELTRIX',
        lastName: 'Admin',
        roleId: superRole.id,
      },
    })
  }

  await prisma.storeSetting.upsert({
    where: { key: 'store_name' },
    create: { key: 'store_name', value: 'VELTRIX' },
    update: {},
  })
  for (const [key, value] of [['shipping_karachi', 250], ['shipping_nationwide', 400]]) {
    await prisma.storeSetting.upsert({ where: { key }, create: { key, value }, update: {} })
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
