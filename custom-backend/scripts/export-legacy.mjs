import { createHash } from 'node:crypto'
import { constants, createReadStream, readFileSync as fsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backupRoot = path.join(backendRoot, 'backups')

const tableExports = [
  ['roles', 'Role', 'select * from "Role"'],
  ['permissions', 'Permission', 'select * from "Permission"'],
  ['rolePermissions', 'RolePermission', 'select * from "RolePermission"'],
  ['users', 'User', 'select "id","email","firstName","lastName","status","roleId","createdAt","updatedAt" from "User"'],
  ['products', 'Product', 'select * from "Product"'],
  ['productImages', 'ProductImage', 'select * from "ProductImage"'],
  ['productVariants', 'ProductVariant', 'select * from "ProductVariant"'],
  ['categories', 'Category', 'select * from "Category"'],
  ['collections', 'Collection', 'select * from "Collection"'],
  ['inventory', 'Inventory', 'select * from "Inventory"'],
  ['inventoryTransactions', 'InventoryTransaction', 'select * from "InventoryTransaction"'],
  ['customers', 'Customer', 'select "id","email","firstName","lastName","phone","status","createdAt","updatedAt" from "Customer"'],
  ['addresses', 'Address', 'select * from "Address"'],
  ['carts', 'Cart', 'select * from "Cart"'],
  ['cartItems', 'CartItem', 'select * from "CartItem"'],
  ['orders', 'Order', 'select * from "Order"'],
  ['orderItems', 'OrderItem', 'select * from "OrderItem"'],
  ['payments', 'Payment', 'select * from "Payment"'],
  ['orderTimeline', 'OrderTimeline', 'select * from "OrderTimeline"'],
  ['discounts', 'Discount', 'select * from "Discount"'],
  ['reviews', 'Review', 'select * from "Review"'],
  ['wishlists', 'Wishlist', 'select * from "Wishlist"'],
  ['wishlistItems', 'WishlistItem', 'select * from "WishlistItem"'],
  ['storeSettings', 'StoreSetting', 'select * from "StoreSetting"'],
  ['newsletterSubscribers', 'NewsletterSubscriber', 'select * from "NewsletterSubscriber"'],
  ['auditLogs', 'AuditLog', 'select * from "AuditLog"'],
  ['productCategories', 'CategoryToProduct', 'select "A" as "categoryId","B" as "productId" from "_CategoryToProducts"'],
  ['productCollections', 'CollectionToProduct', 'select "A" as "collectionId","B" as "productId" from "_CollectionToProducts"'],
]

function loadLocalEnv() {
  for (const envFile of [path.join(backendRoot, '..', '.env.local'), path.join(backendRoot, '.env')]) {
    try {
      const content = fsSync.readFileSync(envFile, 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\\s*([A-Z0-9_]+)\\s*=\\s*(.*?)\\s*$/)
        if (match && !(match[1] in process.env)) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
}

async function hashFile(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

async function walkFiles(directory, relativeDirectory = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name)
    const absolutePath = path.join(directory, entry.name)
    const details = await fs.lstat(absolutePath)
    if (details.isSymbolicLink()) {
      throw new Error(`Refusing to export symbolic link: ${relativePath}`)
    }
    if (details.isDirectory()) {
      files.push(...await walkFiles(absolutePath, relativePath))
    } else if (details.isFile()) {
      files.push({ absolutePath, relativePath, size: details.size })
    } else {
      throw new Error(`Unsupported upload entry: ${relativePath}`)
    }
  }

  return files
}

export async function copyUploads(uploadRoot, destinationRoot) {
  const resolvedUploadRoot = path.resolve(uploadRoot)
  const resolvedDestinationRoot = path.resolve(destinationRoot)
  const relativeDestination = path.relative(resolvedUploadRoot, resolvedDestinationRoot)
  if (relativeDestination === '' || (!relativeDestination.startsWith(`..${path.sep}`) && relativeDestination !== '..' && !path.isAbsolute(relativeDestination))) {
    throw new Error('Export destination must not be inside the upload directory.')
  }

  const files = await walkFiles(resolvedUploadRoot)
  const manifest = []
  for (const file of files) {
    const destination = path.join(resolvedDestinationRoot, file.relativePath)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.copyFile(file.absolutePath, destination, constants.COPYFILE_EXCL)
    manifest.push({
      path: file.relativePath.split(path.sep).join('/'),
      size: file.size,
      sha256: await hashFile(destination),
    })
  }
  return manifest
}

export async function createMigrationExport() {
  loadLocalEnv()
  if (!process.env.DATABASE_URL) {
    throw new Error('Set DATABASE_URL in custom-backend/.env before running the migration export.')
  }
  let pg
  try {
    pg = await import('pg')
  } catch (error) {
    throw new Error('Migration export dependencies are missing. Run npm install in custom-backend/', { cause: error })
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

  const timestamp = new Date().toISOString().replace(/[-:.]/g, '')
  const backupDirectory = path.join(backupRoot, `legacy-export-${timestamp}`)
  const rawUploadDirectory = process.env.UPLOAD_DIR || 'uploads'
  const uploadRoot = path.isAbsolute(rawUploadDirectory)
    ? rawUploadDirectory
    : path.resolve(backendRoot, rawUploadDirectory)

  if (path.resolve(uploadRoot) === backendRoot) {
    throw new Error('UPLOAD_DIR must point to a dedicated uploads directory, not the backend root.')
  }

  await fs.mkdir(backupRoot, { recursive: true })
  await fs.mkdir(backupDirectory, { recursive: false })
  try {
    const tables = {}
    const tableCounts = {}
    await client.connect()
    await client.query('begin isolation level repeatable read read only')
    for (const [name, tableName, query] of tableExports) {
      try {
        const result = await client.query(query)
        tables[name] = result.rows
        tableCounts[name] = result.rows.length
      } catch (error) {
        throw new Error(`Failed to export legacy table ${tableName}: ${error.message}`, { cause: error })
      }
    }
    await client.query('commit')

    await fs.writeFile(
      path.join(backupDirectory, 'database.json'),
      `${JSON.stringify({ tables }, null, 2)}\n`,
      { flag: 'wx' },
    )

    const uploads = await copyUploads(uploadRoot, path.join(backupDirectory, 'uploads'))
    const manifest = {
      createdAt: new Date().toISOString(),
      artifactType: 'sanitized-migration-export',
      source: 'VELTRIX legacy Prisma database and configured uploads directory',
      credentialHashesExcluded: ['User.passwordHash', 'Customer.passwordHash'],
      fullDatabaseBackup: false,
      tableCounts,
      uploadCount: uploads.length,
      uploads,
    }
    await fs.writeFile(
      path.join(backupDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: 'wx' },
    )
    await client.end()

    console.log(`Legacy migration export created at ${backupDirectory}`)
    console.log(`Exported ${Object.values(tableCounts).reduce((sum, count) => sum + count, 0)} rows across ${Object.keys(tableCounts).length} tables and ${uploads.length} upload files.`)
    return backupDirectory
  } catch (error) {
    await client.end().catch(() => {})
    console.error(`Migration export failed. Partial output is retained at ${backupDirectory}:`, error)
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await createMigrationExport()
  } catch (error) {
    process.exitCode = 1
  }
}
