import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../stores/projectStore'
import { useUIStore } from '../stores/uiStore'

/** Switch the writing model app-wide (takes effect on the next request). */
export async function selectWritingModel(modelId: string): Promise<void> {
  await window.api.invoke(IPC.SETTINGS_SET, { openrouterModel: modelId })

  // Keep the open project's recorded model in sync.
  const projectState = useProjectStore.getState()
  if (projectState.isOpen && projectState.manifest) {
    await window.api.invoke(IPC.PROJECT_UPDATE_SETTINGS, {
      aiProvider: 'openrouter',
      aiModel: modelId
    })
    projectState.updateManifest({
      ai: { provider: 'openrouter', model: modelId, keyRef: 'kitapmi-openrouter-key' }
    })
  }

  useUIStore.getState().refreshModelName('openrouter', modelId)
}

export async function selectUtilityModel(modelId: string): Promise<void> {
  await window.api.invoke(IPC.SETTINGS_SET, { openrouterUtilityModel: modelId })
}
