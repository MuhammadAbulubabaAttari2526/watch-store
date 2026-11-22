import '../src/config/load-env.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { prisma } from '../src/config/prisma.js'
const base = `http://localhost:${process.env.PORT || 4000}/api`
const id = randomUUID().replaceAll('-', '').slice(0, 12)
const email = `smoke-${id}@example.test`
const sku = `SMOKE-${id}`
const created = { customerId: null, productId: null, categoryId: null, collectionId: null, orderId: null, cartId: null, managerId: null }

async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] }
}

async function run() {
  const health = await request('/health')
  assert.equal(health.response.status, 200)

  const forbidden = await request('/admin/products')
  assert.equal(forbidden.response.status, 401)

  const adminLogin = await request('/auth/admin/login', {
    method: 'POST',
    body: { email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD },
  })
  assert.equal(adminLogin.response.status, 200, 'local super admin login')
  const adminCookie = adminLogin.cookie
  assert.ok(adminCookie?.startsWith('veltrix_admin='), 'admin uses an HttpOnly session cookie')
  assert.equal('token' in adminLogin.data, false, 'JWT is not returned to browser JavaScript')
  const adminSession = await request('/auth/admin/me', { cookie: adminCookie })
  assert.equal(adminSession.response.status, 200, 'admin session endpoint is registered before customer requests')

  const category = await request('/admin/categories', { method: 'POST', cookie: adminCookie, body: { name: `Smoke ${id}`, slug: `smoke-${id}` } })
  assert.equal(category.response.status, 201)
  created.categoryId = category.data.category.id
  const collection = await request('/admin/collections', { method: 'POST', cookie: adminCookie, body: { name: `Smoke ${id}`, slug: `smoke-${id}` } })
  assert.equal(collection.response.status, 201)
  created.collectionId = collection.data.collection.id

  const product = await request('/admin/products', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      title: `Smoke Watch ${id}`,
      slug: `smoke-watch-${id}`,
      description: 'Temporary product for transactional checkout verification.',
      brand: 'VELTRIX',
      status: 'PUBLISHED',
      categoryIds: [created.categoryId],
      collectionIds: [created.collectionId],
      images: [],
      variants: [{ title: 'Default', sku, options: { color: 'Gold', strap: 'Steel' }, price: 2500, quantity: 3 }],
    },
  })
  assert.equal(product.response.status, 201)
  created.productId = product.data.product.id
  const variantId = product.data.product.variants[0].id

  const published = await request('/products?search=Smoke%20Watch')
  assert.equal(published.response.status, 200)
  assert.ok(published.data.items.some((item) => item.id === created.productId))
  const bySearchAlias = await request('/products?q=Smoke%20Watch')
  assert.ok(bySearchAlias.data.items.some((item) => item.id === created.productId), 'search accepts the storefront q parameter')
  const byColor = await request('/products?color=Gold')
  assert.ok(byColor.data.items.some((item) => item.id === created.productId), 'color filters match variant options')
  const byStrap = await request('/products?strap=Steel')
  assert.ok(byStrap.data.items.some((item) => item.id === created.productId), 'strap filters match variant options')
  const byPriceSort = await request('/products?search=Smoke%20Watch&sort=price-asc')
  assert.ok(byPriceSort.data.items.some((item) => item.id === created.productId), 'price sorting is supported')
  const byCategorySlug = await request(`/products?category=smoke-${id}`)
  assert.ok(byCategorySlug.data.items.some((item) => item.id === created.productId), 'category filters accept category slugs')
  const byCategoryName = await request(`/products?category=${encodeURIComponent(`Smoke ${id}`)}`)
  assert.ok(byCategoryName.data.items.some((item) => item.id === created.productId), 'category filters accept category names')
  const byCategoryAlias = await request(`/products?category=${id}`)
  assert.equal(byCategoryAlias.data.items.some((item) => item.id === created.productId), false, 'category filters do not match unrelated values')
  const byPrice = await request('/products?min=2400&max=2600')
  assert.ok(byPrice.data.items.some((item) => item.id === created.productId))

  const registration = await request('/auth/register', {
    method: 'POST',
    body: { firstName: 'Smoke', lastName: 'Customer', email, password: 'LocalSmoke!2026', phone: '03001234567' },
  })
  assert.equal(registration.response.status, 201)
  created.customerId = registration.data.customer.id
  const customerCookie = registration.cookie
  assert.ok(customerCookie?.startsWith('veltrix_customer='))
  assert.equal('token' in registration.data, false)
  const customerAdminAccess = await request('/admin/orders', { cookie: customerCookie })
  assert.equal(customerAdminAccess.response.status, 401)

  const newCart = await request('/carts', { method: 'POST' })
  assert.equal(newCart.response.status, 201)
  created.cartId = newCart.data.cart.id
  const attached = await request(`/carts/${created.cartId}/attach`, { method: 'POST', cookie: customerCookie, body: {} })
  assert.equal(attached.response.status, 200)
  const added = await request(`/carts/${created.cartId}/items`, { method: 'POST', body: { variantId, quantity: 2 } })
  assert.equal(added.response.status, 200)
  const oversell = await request(`/carts/${created.cartId}/items`, { method: 'POST', body: { variantId, quantity: 2 } })
  assert.equal(oversell.response.status, 409, 'cart cannot reserve more than available inventory')

  const checkout = {
    cartId: created.cartId,
    contactEmail: email,
    paymentMethod: 'COD',
    shippingAddress: { firstName: 'Smoke', lastName: 'Customer', address1: '12 Smoke Testing Road', city: 'Karachi', countryCode: 'PK', phone: '03001234567' },
  }
  const unsupportedOnline = await request('/orders', { method: 'POST', cookie: customerCookie, body: { ...checkout, paymentMethod: 'ONLINE' } })
  assert.equal(unsupportedOnline.response.status, 400, 'unconfigured online payments are rejected')
  const idempotencyKey = `smoke-${id}`
  const placed = await request('/orders', { method: 'POST', cookie: customerCookie, body: { ...checkout, total: 1, subtotal: 1 }, headers: { 'x-idempotency-key': idempotencyKey } })
  assert.equal(placed.response.status, 201)
  created.orderId = placed.data.order.id
  const replay = await request('/orders', { method: 'POST', cookie: customerCookie, body: checkout, headers: { 'x-idempotency-key': idempotencyKey } })
  assert.equal(replay.response.status, 200, 'retrying the same checkout key returns the existing order')
  assert.equal(replay.data.order.id, created.orderId)
  assert.equal(Number(placed.data.order.subtotal), 5000, 'order price is recalculated from database')
  assert.equal(Number(placed.data.order.shippingTotal), 250, 'Karachi delivery charge is calculated server-side')
  assert.equal(Number(placed.data.order.total), 5250)
  const stockAfterSale = await prisma.inventory.findUnique({ where: { variantId } })
  assert.equal(stockAfterSale.quantity, 1)

  const transition = await request(`/admin/orders/${created.orderId}/status`, { method: 'PATCH', cookie: adminCookie, body: { status: 'DELIVERED' } })
  assert.equal(transition.response.status, 409, 'invalid order status transitions are rejected')
  const cancel = await request(`/admin/orders/${created.orderId}/cancel`, { method: 'POST', cookie: adminCookie, body: {} })
  assert.equal(cancel.response.status, 200)
  const restored = await prisma.inventory.findUnique({ where: { variantId } })
  assert.equal(restored.quantity, 3, 'cancellation restores reserved stock once')
  assert.ok(cancel.data.order.status === 'CANCELLED')

  const newsletter = await request('/newsletter', { method: 'POST', body: { email } })
  assert.equal(newsletter.response.status, 200)

  const manager = await request('/admin/users', {
    method: 'POST',
    cookie: adminCookie,
    body: { firstName: 'Smoke', lastName: 'Manager', email: `manager-${id}@example.test`, password: 'LocalSmoke!2026', roleCode: 'ORDER_MANAGER' },
  })
  assert.equal(manager.response.status, 201)
  created.managerId = manager.data.user.id
  const managerLogin = await request('/auth/admin/login', { method: 'POST', body: { email: manager.data.user.email, password: 'LocalSmoke!2026' } })
  assert.equal(managerLogin.response.status, 200)
  const deniedProductAdmin = await request('/admin/products', { cookie: managerLogin.cookie })
  assert.equal(deniedProductAdmin.response.status, 403, 'order manager cannot access product management')
  const allowedOrders = await request('/admin/orders', { cookie: managerLogin.cookie })
  assert.equal(allowedOrders.response.status, 200, 'order manager can view orders')

  console.log('Custom commerce smoke checks passed: auth/RBAC, catalog, price filtering, cart stock, server-priced COD checkout, stock restoration, and newsletter.')
}

try {
  await run()
} finally {
  if (created.orderId) await prisma.order.deleteMany({ where: { id: created.orderId } })
  if (created.cartId) await prisma.cart.deleteMany({ where: { id: created.cartId } })
  if (created.customerId) await prisma.customer.deleteMany({ where: { id: created.customerId } })
  if (created.productId) await prisma.product.deleteMany({ where: { id: created.productId } })
  if (created.categoryId) await prisma.category.deleteMany({ where: { id: created.categoryId } })
  if (created.collectionId) await prisma.collection.deleteMany({ where: { id: created.collectionId } })
  if (created.managerId) await prisma.user.deleteMany({ where: { id: created.managerId } })
  await prisma.newsletterSubscriber.deleteMany({ where: { email } })
  await prisma.inventoryTransaction.deleteMany({ where: { variantSku: sku } })
  await prisma.$disconnect()
}
