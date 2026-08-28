import { ref, watch } from 'vue'
import type { Tab } from '../utils/types'
import { loadTabs, saveTabs, loadActiveTabId, saveActiveTabId, generateTabId, saveTabToHistory, removeTabFromHistory, clearTabHistory } from '../utils/storage'

type UseTabsOptions = {
  persistHistory?: boolean
}

export function useTabs(options: UseTabsOptions = {}) {
  const persistHistory = options.persistHistory ?? true
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<string | null>(null)
  const savedContents = ref<Record<string, string>>({})
  const historyTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function load() {
    tabs.value = loadTabs()
    activeTabId.value = loadActiveTabId()

    if (tabs.value.length > 0) {
      if (!activeTabId.value || !tabs.value.find(t => t.id === activeTabId.value)) {
        activeTabId.value = tabs.value[0].id
      }
      tabs.value.forEach(t => {
        savedContents.value[t.id] = t.content
      })
    } else {
      createTab()
    }
  }

  function createTab(content = ''): Tab {
    const tab: Tab = {
      id: generateTabId(),
      name: 'New Tab',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    tabs.value.push(tab)
    activeTabId.value = tab.id
    savedContents.value[tab.id] = content
    return tab
  }

  function closeTab(id: string) {
    const index = tabs.value.findIndex(t => t.id === id)
    if (index === -1) return

    tabs.value.splice(index, 1)
    delete savedContents.value[id]

    if (activeTabId.value === id) {
      activeTabId.value = tabs.value.length > 0
        ? tabs.value[Math.min(index, tabs.value.length - 1)].id
        : null
    }

    if (tabs.value.length === 0) {
      createTab()
    }
  }

  function renameTab(id: string, name: string) {
    const tab = tabs.value.find(t => t.id === id)
    if (tab) {
      tab.name = name
      tab.updatedAt = Date.now()
      if (persistHistory && tab.content.trim()) saveTabToHistory(tab)
    }
  }

  function updateTabContent(id: string, content: string) {
    const tab = tabs.value.find(t => t.id === id)
    if (tab) {
      tab.content = content
      tab.updatedAt = Date.now()

      if (content.includes('\n') && tab.name === 'Untitled') {
        const firstLine = content.split('\n')[0]?.replace(/^#+\s*/, '').trim()
        if (firstLine) {
          tab.name = firstLine.slice(0, 30)
        }
      }
      if (persistHistory) {
        debouncedHistorySave(id)
      }
    }
  }

  function debouncedHistorySave(id: string) {
    const existing = historyTimers.get(id)
    if (existing) clearTimeout(existing)
    historyTimers.set(id, setTimeout(() => {
      historyTimers.delete(id)
      const tab = tabs.value.find(t => t.id === id)
      if (tab && tab.content.trim()) {
        saveTabToHistory(tab)
      }
    }, 1000))
  }

  function saveTab(id: string) {
    const tab = tabs.value.find(t => t.id === id)
    if (tab) {
      savedContents.value[id] = tab.content
      if (persistHistory) {
        saveTabToHistory(tab).catch(e => console.error('saveTab failed:', e))
      }
    }
  }

  function isTabDirty(id: string): boolean {
    const tab = tabs.value.find(t => t.id === id)
    if (!tab) return false
    return savedContents.value[id] !== tab.content
  }

  function getActiveTab(): Tab | undefined {
    return tabs.value.find(t => t.id === activeTabId.value)
  }

  function loadTabFromHistory(tab: Tab) {
    if (!tabs.value.find(t => t.id === tab.id)) {
      tabs.value.push(tab)
    }
    savedContents.value[tab.id] = tab.content
    activeTabId.value = tab.id
  }

  function replaceTabWithHistory(currentId: string, historyTab: Tab) {
    const index = tabs.value.findIndex(t => t.id === currentId)
    if (index === -1) return
    delete savedContents.value[currentId]
    tabs.value.splice(index, 1, { ...historyTab })
    savedContents.value[historyTab.id] = historyTab.content
    activeTabId.value = historyTab.id
  }

  async function clearAllHistory() {
    await clearTabHistory()
  }

  async function deleteFromHistory(id: string) {
    await removeTabFromHistory(id)
  }

  watch([tabs, activeTabId], () => {
    saveTabs(tabs.value)
    if (activeTabId.value) {
      saveActiveTabId(activeTabId.value)
    }
  }, { deep: true })

  load()

  return {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    renameTab,
    updateTabContent,
    saveTab,
    isTabDirty,
    getActiveTab,
    loadTabFromHistory,
    replaceTabWithHistory,
    clearAllHistory,
    deleteFromHistory,
  }
}
