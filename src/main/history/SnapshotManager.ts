import fs from 'fs/promises'
import path from 'path'
import type { Snapshot } from '@shared/types'

export class SnapshotManager {
  async createSnapshot(
    projectPath: string,
    reason: string,
    changedFiles?: string[]
  ): Promise<Snapshot> {
    const id = new Date().toISOString().replace(/[:.]/g, '-')
    const snapshotDir = path.join(projectPath, '.chapterforge', 'history', id)

    await fs.mkdir(snapshotDir, { recursive: true })

    if (changedFiles && changedFiles.length > 0) {
      for (const file of changedFiles) {
        const src = path.join(projectPath, file)
        const dest = path.join(snapshotDir, file)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        try {
          await fs.copyFile(src, dest)
        } catch {
          // File may not exist
        }
      }
    } else {
      // Full snapshot
      const chaptersDir = path.join(projectPath, 'chapters')
      const snapshotChaptersDir = path.join(snapshotDir, 'chapters')
      try {
        await fs.mkdir(snapshotChaptersDir, { recursive: true })
        const files = await fs.readdir(chaptersDir)
        for (const file of files) {
          await fs.copyFile(
            path.join(chaptersDir, file),
            path.join(snapshotChaptersDir, file)
          )
        }
      } catch {
        // Chapters dir might not exist yet
      }

      try {
        await fs.copyFile(
          path.join(projectPath, 'book.json'),
          path.join(snapshotDir, 'book.json')
        )
      } catch {
        // book.json might not exist
      }
    }

    const metadata: Snapshot = {
      id,
      timestamp: new Date().toISOString(),
      reason,
      changedFiles: changedFiles || ['full-snapshot']
    }

    await fs.writeFile(
      path.join(snapshotDir, 'snapshot.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    )

    await this.pruneSnapshots(projectPath, 50)

    return metadata
  }

  async restoreSnapshot(projectPath: string, snapshotId: string): Promise<void> {
    const snapshotDir = path.join(
      projectPath,
      '.chapterforge',
      'history',
      snapshotId
    )

    // Safety: create snapshot of current state before restoring
    await this.createSnapshot(projectPath, `Before restore to ${snapshotId}`)

    const metaPath = path.join(snapshotDir, 'snapshot.json')
    const metaRaw = await fs.readFile(metaPath, 'utf-8')
    const metadata: Snapshot = JSON.parse(metaRaw)

    for (const file of metadata.changedFiles) {
      if (file === 'full-snapshot') {
        // Full restore
        const snapshotChapters = path.join(snapshotDir, 'chapters')
        const projectChapters = path.join(projectPath, 'chapters')

        try {
          const files = await fs.readdir(snapshotChapters)
          for (const f of files) {
            await fs.copyFile(
              path.join(snapshotChapters, f),
              path.join(projectChapters, f)
            )
          }
        } catch {
          // snapshot chapters dir might not exist
        }

        try {
          await fs.copyFile(
            path.join(snapshotDir, 'book.json'),
            path.join(projectPath, 'book.json')
          )
        } catch {
          // book.json might not exist in snapshot
        }
      } else {
        try {
          await fs.copyFile(
            path.join(snapshotDir, file),
            path.join(projectPath, file)
          )
        } catch {
          // File might not exist in snapshot
        }
      }
    }
  }

  async listSnapshots(projectPath: string): Promise<Snapshot[]> {
    const historyDir = path.join(projectPath, '.chapterforge', 'history')
    const snapshots: Snapshot[] = []

    try {
      const entries = await fs.readdir(historyDir)
      for (const entry of entries) {
        const metaPath = path.join(historyDir, entry, 'snapshot.json')
        try {
          const raw = await fs.readFile(metaPath, 'utf-8')
          snapshots.push(JSON.parse(raw))
        } catch {
          // Skip invalid snapshot dirs
        }
      }
    } catch {
      // History dir might not exist
    }

    // Sort newest first
    snapshots.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return snapshots
  }

  private async pruneSnapshots(
    projectPath: string,
    maxSnapshots: number
  ): Promise<void> {
    const snapshots = await this.listSnapshots(projectPath)

    if (snapshots.length <= maxSnapshots) return

    const toDelete = snapshots.slice(maxSnapshots)
    const historyDir = path.join(projectPath, '.chapterforge', 'history')

    for (const snapshot of toDelete) {
      const dir = path.join(historyDir, snapshot.id)
      try {
        await fs.rm(dir, { recursive: true, force: true })
      } catch {
        // Ignore deletion errors
      }
    }
  }
}
