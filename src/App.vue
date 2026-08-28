<template>
  <div class="app">
    <div v-if="outlineDocumentLoading" class="outline-document-loading" role="status" aria-live="polite">
      <span class="outline-loading-spinner" aria-hidden="true"></span>
      <div>
        <strong>Cargando documento de Outline</strong>
        <small>Comprobando la sesión y preparando el contenido para editarlo…</small>
      </div>
    </div>

    <TabBar
      v-if="tabs.length > 0"
      :tabs="tabs"
      :active-tab-id="activeTabId"
      :new-tab-ids="newTabIds"
      @select-tab="activeTabId = $event"
      @close-tab="handleCloseTab"
      @rename-tab="renameTab"
      @add-tab="handleAddTab"
      @open-privacy="showPrivacy = true"
    />

    <template v-if="activeTabId">
      <Toolbar
        v-if="!isNewTab"
        :page-size="settings.pageSize"
        :font="settings.font"
        :font-size="settings.fontSize"
        :editor-mode="settings.editorMode"
        :print-preset="settings.printPreset"
        :advanced-style="settings.advancedPrintStyle"
        :rtl="settings.rtl"
        :soft-wrap="settings.softWrap"
        :margin="settings.margin"
        :orientation="settings.orientation"
        :content-scale="settings.contentScale"
        :content="activeTab?.content || ''"
        :rendered-html="renderedHtml"
        :is-generating="isGenerating"
        :view-mode="settings.viewMode"
        @update:pageSize="settings.pageSize = $event"
        @update:font="settings.font = $event"
        @update:rtl="settings.rtl = $event"
        @update:softWrap="settings.softWrap = $event"
        @update:margin="settings.margin = $event"
        @update:orientation="settings.orientation = $event"
        @update:contentScale="settings.contentScale = $event"
        @update:fontSize="settings.fontSize = $event"
        @update:editorMode="settings.editorMode = $event"
        @update:printPreset="selectPrintPreset"
        @update:advancedStyle="updateAdvancedStyle"
        @reset:advancedStyle="resetAdvancedStyle"
        @undo="undoActiveEditor"
        @redo="redoActiveEditor"
        @insert-page-break="insertPageBreak"
        @download-pdf="() => downloadPDF(previewRef?.assembledHtml || renderedHtml, settings.pageSize, settings.margin, settings.orientation, settings.font, settings.fontSize, settings.contentScale, settings.rtl, settings.printPreset, settings.advancedPrintStyle)"
      />

      <NewPage
        v-if="isNewTab"
        @create-new="startWriting"
        @open-tab="(tab) => openHistoryTab(tab)"
        @upload-file="(content, name) => activateTabWithContent(content, name)"
      />

      <template v-else>
        <div class="main-content" :class="`view-${settings.viewMode}`">
          <section
            v-show="settings.viewMode !== 'preview'"
            class="workspace-panel editor-section"
            :class="{ 'full-width': settings.viewMode !== 'split' }"
            aria-label="Área de edición"
          >
            <header class="workspace-panel-header">
              <div class="panel-title">
                <span class="panel-icon panel-icon-editor" aria-hidden="true">
                  <PencilLine v-if="settings.editorMode === 'visual'" :size="15" />
                  <FileCode2 v-else :size="15" />
                </span>
                <span>
                  <strong>{{ settings.editorMode === 'visual' ? 'Editor visual' : 'Markdown' }}</strong>
                  <small>{{ settings.editorMode === 'visual' ? 'Edición por bloques' : 'Fuente original' }}</small>
                </span>
              </div>
              <span class="panel-status">
                <span class="status-dot"></span>
                Guardado local
              </span>
            </header>

            <EditorPane
              v-if="settings.editorMode === 'markdown'"
              ref="editorRef"
              v-model="editorContent"
              :soft-wrap="settings.softWrap"
              :tab-id="activeTabId"
              class="workspace-panel-body"
              @editor-ready="onEditorReady"
              @update:selectedText="selectedText = $event"
            />

            <VisualEditorPane
              v-else
              :key="activeTabId || 'visual-editor'"
              ref="visualEditorRef"
              v-model="editorContent"
              :tab-id="activeTabId"
              :font="settings.font"
              :font-size="settings.fontSize * settings.contentScale"
              class="workspace-panel-body"
              @update:selectedText="selectedText = $event"
            />
          </section>

          <div v-if="settings.viewMode === 'split'" class="divider" aria-hidden="true">
            <span></span>
          </div>

          <section
            v-show="settings.viewMode !== 'editor'"
            class="workspace-panel preview-section"
            :class="{ 'full-width': settings.viewMode !== 'split' }"
            aria-label="Vista de impresión"
          >
            <header class="workspace-panel-header">
              <div class="panel-title">
                <span class="panel-icon panel-icon-preview" aria-hidden="true">
                  <ScanText :size="15" />
                </span>
                <span>
                  <strong>Vista de impresión</strong>
                  <small>{{ settings.pageSize }} · {{ settings.orientation === 'portrait' ? 'Vertical' : 'Horizontal' }}</small>
                </span>
              </div>
              <span class="panel-status preview-status">
                {{ Math.round(settings.scale * 100) }}%
              </span>
            </header>

            <PreviewPane
              ref="previewRef"
              :html="renderedHtml"
              :page-size="settings.pageSize"
              :scale="settings.scale"
              :font="settings.font"
              :font-size="settings.fontSize"
              :content-scale="settings.contentScale"
              :rtl="settings.rtl"
              :margin="settings.margin"
              :orientation="settings.orientation"
              :print-preset="settings.printPreset"
              :advanced-style="settings.advancedPrintStyle"
              :container-width="previewContainerWidth"
              class="workspace-panel-body"
              @preview-click="onPreviewClick"
              @update:scale="settings.scale = $event"
            />
          </section>
        </div>

        <FooterBar
          ref="footerRef"
          :content="activeTab?.content || ''"
          :selected-text="selectedText"
          :scale="settings.scale"
          :page-size="settings.pageSize"
          :orientation="settings.orientation"
          :view-mode="settings.viewMode"
          :container-width="previewContainerWidth"
          :llm-enabled="llmEnabled"
          :llm-connected="llmConnected"
          :llm-model="llmModel"
          @update:scale="settings.scale = $event"
          @update:viewMode="settings.viewMode = $event"
          @open-ai-settings="showAiSettings = true"
        />
      </template>
    </template>

    <PrivacyPolicy v-model="showPrivacy" />
    <AiSettings v-model="showAiSettings" :trigger-el="footerRef?.aiButtonRef" @saved="refreshLlmState" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { FileCode2, PencilLine, ScanText } from '@lucide/vue'
import TabBar from './components/TabBar.vue'
import NewPage from './components/NewPage.vue'
import Toolbar from './components/Toolbar.vue'
import EditorPane from './components/EditorPane.vue'
import VisualEditorPane from './components/VisualEditorPane.vue'
import PreviewPane from './components/PreviewPane.vue'
import FooterBar from './components/FooterBar.vue'
import AiSettings from './components/AiSettings.vue'
import PrivacyPolicy from './components/PrivacyPolicy.vue'
import { useTabs } from './composables/useTabs'
import { useMarkdown } from './composables/useMarkdown'
import { useScrollSync } from './composables/useScrollSync'
import { usePDF } from './composables/usePDF'
import { useImages } from './composables/useImages'
import { loadSettings, saveSettings, loadLlmConfig, isLlmEnabled } from './utils/storage'
import { DEFAULT_ADVANCED_PRINT_STYLE, PAGE_SIZES, STORAGE_KEYS, getDefaultAdvancedPrintStyle, getScaleRange, getContentScaleFactor } from './utils/constants'
import { loadOutlineDocument, parseOutlineDocumentId } from './utils/outlineDocument'
import type { AdvancedPrintStyle, EditorSettings, PrintPreset, Tab } from './utils/types'

const footerRef = ref<InstanceType<typeof FooterBar>>()

// Tab management
const outlineDocumentId = parseOutlineDocumentId(window.location.pathname)
const isOutlineDocumentMode = !!outlineDocumentId
const outlineDocumentLoading = ref(isOutlineDocumentMode)

// A document opened from Outline must not reuse the tabs copied from another
// Print Studio window. The source document remains in Outline; this tab is an
// isolated working copy for formatting and printing.
if (isOutlineDocumentMode) {
  sessionStorage.removeItem(STORAGE_KEYS.TABS)
  sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB)
}

const {
  tabs, activeTabId, createTab, closeTab, renameTab,
  updateTabContent, getActiveTab,
  replaceTabWithHistory,
} = useTabs({ persistHistory: !isOutlineDocumentMode })
const { loadImages } = useImages()

// Active tab content
const activeTab = computed(() => getActiveTab())
const editorContent = ref(activeTab.value?.content || '')
const newTabIds = ref(new Set<string>())
const showPrivacy = ref(false)
const showAiSettings = ref(false)
const llmEnabled = ref(false)
const llmConnected = ref(false)
const llmModel = ref('')

const isNewTab = computed(() => {
  if (!activeTabId.value) return false
  return newTabIds.value.has(activeTabId.value)
})

// Settings
const defaultScaleRange = getScaleRange(PAGE_SIZES.find(p => p.name === 'A4')!, 'portrait', window.innerWidth / 2)

const previewContainerWidth = computed(() =>
  settings.value.viewMode === 'preview' ? window.innerWidth : window.innerWidth / 2
)

const settings = ref<EditorSettings>({
  pageSize: 'A4',
  scale: defaultScaleRange.default,
  font: 'Open Sans',
  fontSize: 14,
  rtl: false,
  lineNumbers: true,
  margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
  orientation: 'portrait',
  contentScale: 1.0,
  contentScaleMap: {} as Record<string, number>,
  softWrap: true,
  viewMode: window.innerWidth < 768 ? 'editor' : 'split',
  editorMode: 'visual',
  printPreset: 'outline',
  advancedStylePreset: 'outline',
  advancedPrintStyle: { ...DEFAULT_ADVANCED_PRINT_STYLE },
})

// Load saved settings
onMounted(async () => {
  await loadImages()

  if (activeTabId.value && !getActiveTab()?.content) {
    newTabIds.value.add(activeTabId.value)
  }

  const saved = loadSettings()
  const savedPreset = saved.printPreset ?? settings.value.printPreset
  const presetDefaults = getDefaultAdvancedPrintStyle(savedPreset)
  const advancedMatchesPreset = saved.advancedStylePreset === savedPreset
  const savedAdvancedStyle = advancedMatchesPreset
    ? saved.advancedPrintStyle
    : { enabled: saved.advancedPrintStyle?.enabled ?? false }

  settings.value = {
    ...settings.value,
    ...saved,
    printPreset: savedPreset,
    advancedStylePreset: savedPreset,
    advancedPrintStyle: { ...presetDefaults, ...savedAdvancedStyle },
  }
  if (!settings.value.contentScaleMap) {
    settings.value.contentScaleMap = {}
  }
  PAGE_SIZES.forEach(p => {
    settings.value.contentScaleMap![p.name] = getContentScaleFactor(p)
  })
  const current = PAGE_SIZES.find(p => p.name === settings.value.pageSize)
  if (current) {
    settings.value.contentScale = settings.value.contentScaleMap![current.name]
  }

  await refreshLlmState()
  await loadRequestedOutlineDocument()
})

async function loadRequestedOutlineDocument() {
  if (!outlineDocumentId) return

  outlineDocumentLoading.value = true

  try {
    const document = await loadOutlineDocument(outlineDocumentId)

    activateTabWithContent(document.markdown, document.name)
  } catch (error) {
    console.error('Failed to load Outline document:', error)

    const message = error instanceof Error
      ? error.message
      : 'Error desconocido'

    window.alert(
      `No se ha podido cargar el documento de Outline.\n\n${message}`,
    )
  } finally {
    outlineDocumentLoading.value = false
  }
}

// Save settings on change
watch(settings, (newSettings) => {
  saveSettings(newSettings)
}, { deep: true })

async function refreshLlmState() {
  llmEnabled.value = isLlmEnabled()
  const config = await loadLlmConfig()
  llmConnected.value = !!(config?.endpoint && config?.apiKey)
  llmModel.value = config?.model || ''
}

function recalcScaleToFit() {
  const size = PAGE_SIZES.find(p => p.name === settings.value.pageSize)
  if (size) {
    const range = getScaleRange(size, settings.value.orientation, previewContainerWidth.value)
    settings.value.scale = range.default
    if (!settings.value.contentScaleMap) {
      settings.value.contentScaleMap = {}
    }
    if (!(size.name in settings.value.contentScaleMap)) {
      settings.value.contentScaleMap[size.name] = getContentScaleFactor(size)
    }
    settings.value.contentScale = settings.value.contentScaleMap[size.name]
  }
}

// Auto-adjust scale when page size or orientation changes
watch(
  () => [settings.value.pageSize, settings.value.orientation],
  recalcScaleToFit,
)

// Auto-adjust scale when switching between split and preview-only
watch(
  () => settings.value.viewMode,
  (mode) => {
    if (mode === 'preview' || mode === 'split') {
      recalcScaleToFit()
    }
  },
)

// Markdown rendering
const { renderedHtml } = useMarkdown(editorContent)

// Editor and preview refs
const editorRef = ref<InstanceType<typeof EditorPane> | null>(null)
const visualEditorRef = ref<InstanceType<typeof VisualEditorPane> | null>(null)
const previewRef = ref<InstanceType<typeof PreviewPane> | null>(null)
const selectedText = ref('')

// Scroll sync
const { onPreviewClick } = useScrollSync(
  computed(() => editorRef.value?.editorView || null),
  computed(() => previewRef.value?.container || null),
)

// PDF download
const { download: downloadPDF, isGenerating } = usePDF()

// Update active tab content
watch(editorContent, (content) => {
  if (activeTabId.value) {
    updateTabContent(activeTabId.value, content)
  }
})

// Sync editor content when tab changes
watch(activeTabId, () => {
  const tab = getActiveTab()
  if (tab) {
    editorContent.value = tab.content
  }
})

// Insert page break
function insertPageBreak() {
  const pageBreak = '\n<div style="page-break-after: always;"></div>\n'
  if (settings.value.editorMode === 'visual') {
    visualEditorRef.value?.insertText(pageBreak)
  } else {
    editorRef.value?.insertText(pageBreak)
  }
}

function resetAdvancedStyle() {
  settings.value.advancedPrintStyle = getDefaultAdvancedPrintStyle(settings.value.printPreset)
  settings.value.advancedStylePreset = settings.value.printPreset
}

function updateAdvancedStyle(style: AdvancedPrintStyle) {
  settings.value.advancedPrintStyle = style
  settings.value.advancedStylePreset = settings.value.printPreset
}

function selectPrintPreset(preset: PrintPreset) {
  const keepAdvancedEnabled = settings.value.advancedPrintStyle.enabled
  settings.value.printPreset = preset
  settings.value.advancedStylePreset = preset
  settings.value.advancedPrintStyle = {
    ...getDefaultAdvancedPrintStyle(preset),
    enabled: keepAdvancedEnabled,
  }
}

function undoActiveEditor() {
  settings.value.editorMode === 'visual' ? visualEditorRef.value?.undo() : editorRef.value?.undo()
}

function redoActiveEditor() {
  settings.value.editorMode === 'visual' ? visualEditorRef.value?.redo() : editorRef.value?.redo()
}

function handleAddTab() {
  const tab = createTab()
  newTabIds.value.add(tab.id)
}

// Start writing in current new tab
function startWriting() {
  if (activeTabId.value) {
    newTabIds.value.delete(activeTabId.value)
    renameTab(activeTabId.value, 'Untitled')
    editorContent.value = ''
  }
}

// Activate tab with uploaded content
function activateTabWithContent(content: string, name: string) {
  if (activeTabId.value) {
    newTabIds.value.delete(activeTabId.value)
    renameTab(activeTabId.value, name)
    updateTabContent(activeTabId.value, content)
    editorContent.value = content
  }
}

// Open history tab: switch if already open, otherwise load into current new tab
function openHistoryTab(historyTab: Tab) {
  const existing = tabs.value.find(t => t.id === historyTab.id)
  if (existing) {
    activeTabId.value = existing.id
  } else if (activeTabId.value) {
    newTabIds.value.delete(activeTabId.value)
    replaceTabWithHistory(activeTabId.value, historyTab)
    editorContent.value = historyTab.content
  }
}

// Editor ready callback
function onEditorReady() {}

function handleCloseTab(id: string) {
  newTabIds.value.delete(id)
  const wasLastTab = tabs.value.length === 1
  closeTab(id)
  if (wasLastTab && activeTabId.value) {
    newTabIds.value.add(activeTabId.value)
  }
}
</script>

<style scoped>
.app {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-secondary);
}

.main-content {
  flex: 1;
  display: flex;
  min-height: 0;
  gap: 0;
  padding: 10px 10px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% -10%, color-mix(in srgb, var(--accent-color) 7%, transparent), transparent 32rem),
    var(--bg-secondary);
}

.workspace-panel {
  flex: 1;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.workspace-panel-header {
  min-height: 47px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary));
}

.panel-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.panel-title > span:last-child {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.panel-title strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-title small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-icon {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 9px;
}

.panel-icon-editor {
  color: var(--accent-color);
  background: var(--accent-soft);
}

.panel-icon-preview {
  color: #0b8f72;
  background: color-mix(in srgb, #28b78d 13%, var(--bg-primary));
}

.panel-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  font-size: 10px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--success-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success-color) 13%, transparent);
}

.preview-status {
  min-width: 46px;
  justify-content: center;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.workspace-panel-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.divider {
  position: relative;
  width: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: col-resize;
  background: transparent;
}

.divider span {
  width: 2px;
  height: 38px;
  border-radius: 999px;
  background: var(--border-strong);
  transition: height .16s ease, background-color .16s ease;
}

.divider:hover span {
  height: 54px;
  background: var(--accent-color);
}

.outline-document-loading {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 28px;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--accent-color) 13%, transparent), transparent 28rem),
    color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  color: var(--text-primary);
  backdrop-filter: blur(16px);
}

.outline-document-loading::before {
  position: absolute;
  z-index: -1;
  width: min(430px, calc(100vw - 40px));
  height: 118px;
  content: "";
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
}

.outline-document-loading div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.outline-document-loading strong {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.015em;
}

.outline-document-loading small {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.outline-loading-spinner {
  width: 29px;
  height: 29px;
  flex-shrink: 0;
  border: 3px solid color-mix(in srgb, var(--accent-color) 18%, transparent);
  border-top-color: var(--accent-color);
  border-radius: 999px;
  animation: outline-loading-spin .75s linear infinite;
}

@keyframes outline-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.full-width {
  flex: 1;
}

@media (max-width: 820px) {
  .main-content {
    flex-direction: column;
    padding: 7px 7px 0;
  }

  .workspace-panel {
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .main-content.view-split .workspace-panel {
    min-height: 0;
  }

  .divider {
    width: 100%;
    height: 8px;
    cursor: row-resize;
  }

  .divider span {
    width: 38px;
    height: 2px;
  }

  .divider:hover span {
    width: 54px;
    height: 2px;
  }

  .panel-title small,
  .panel-status:not(.preview-status) {
    display: none;
  }
}

@media (max-width: 520px) {
  .main-content {
    padding-inline: 0;
  }

  .workspace-panel {
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .workspace-panel-header {
    min-height: 42px;
  }

  .outline-document-loading {
    align-items: center;
    flex-direction: column;
    text-align: center;
  }

  .outline-document-loading::before {
    height: 168px;
  }
}
</style>