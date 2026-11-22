import { existsSync } from 'node:fs'
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'

const envFiles = [
  fileURLToPath(new URL('../../../.env.local', import.meta.url)),
  fileURLToPath(new URL('../../.env', import.meta.url)),
]

for (const path of envFiles) {
  if (existsSync(path)) config({ path })
}
