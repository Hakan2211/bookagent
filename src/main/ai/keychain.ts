import { safeStorage, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

const KEYS_FILE = 'api-keys.json'

function getKeysPath(): string {
  return path.join(app.getPath('userData'), KEYS_FILE)
}

async function readKeysFile(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(getKeysPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeKeysFile(keys: Record<string, string>): Promise<void> {
  const dir = path.dirname(getKeysPath())
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(getKeysPath(), JSON.stringify(keys, null, 2), 'utf-8')
}

export const keychain = {
  async storeKey(provider: string, apiKey: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system')
    }

    const encrypted = safeStorage.encryptString(apiKey)
    const keys = await readKeysFile()
    keys[`${provider}-api-key`] = encrypted.toString('base64')
    await writeKeysFile(keys)
  },

  async getKey(provider: string): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }

    const keys = await readKeysFile()
    const encrypted = keys[`${provider}-api-key`]
    if (!encrypted) return null

    try {
      const buffer = Buffer.from(encrypted, 'base64')
      return safeStorage.decryptString(buffer)
    } catch {
      return null
    }
  },

  async deleteKey(provider: string): Promise<boolean> {
    const keys = await readKeysFile()
    const key = `${provider}-api-key`
    if (key in keys) {
      delete keys[key]
      await writeKeysFile(keys)
      return true
    }
    return false
  },

  async hasKey(provider: string): Promise<boolean> {
    const keys = await readKeysFile()
    return `${provider}-api-key` in keys
  }
}
