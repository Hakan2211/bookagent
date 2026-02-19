import path from 'path'
import { watch, type FSWatcher } from 'chokidar'
import type { FileChange } from '@shared/types'

export class FileWatcher {
  private watcher: FSWatcher | null = null

  watch(projectPath: string, onChange: (event: FileChange) => void): void {
    this.stop()

    this.watcher = watch(
      [
        path.join(projectPath, 'chapters', '*.md'),
        path.join(projectPath, 'chapters', '**', '*.md'),
        path.join(projectPath, 'notes', '*.md'),
        path.join(projectPath, 'book.json'),
        path.join(projectPath, 'outline.md')
      ],
      {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 500 }
      }
    )

    this.watcher
      .on('change', (filePath: string) =>
        onChange({ type: 'modified', filePath: path.relative(projectPath, filePath) })
      )
      .on('add', (filePath: string) =>
        onChange({ type: 'added', filePath: path.relative(projectPath, filePath) })
      )
      .on('unlink', (filePath: string) =>
        onChange({ type: 'deleted', filePath: path.relative(projectPath, filePath) })
      )
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}
