import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { copyUploads } from './export-legacy.mjs'

test('copies upload files and reports their hashes and relative paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'veltrix-backup-'))
  const source = path.join(root, 'source')
  const destination = path.join(root, 'backup', 'uploads')
  await fs.mkdir(path.join(source, 'nested'), { recursive: true })
  await fs.writeFile(path.join(source, 'nested', 'watch.png'), 'image-data')

  try {
    const [entry] = await copyUploads(source, destination)
    assert.equal(entry.path, 'nested/watch.png')
    assert.equal(entry.size, 10)
    assert.match(entry.sha256, /^[a-f0-9]{64}$/)
    assert.equal(await fs.readFile(path.join(destination, 'nested', 'watch.png'), 'utf8'), 'image-data')
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('refuses to write an export within the source upload directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'veltrix-backup-'))
  try {
    await assert.rejects(
      copyUploads(root, path.join(root, 'backup')),
      /Export destination must not be inside the upload directory/,
    )
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
