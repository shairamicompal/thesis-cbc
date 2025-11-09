<!-- src/views/system/HistoryView.vue -->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { supabase } from '@/utils/supabase'
import { renderMarkdownSafe } from '@/utils/markdown'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)

const loading = ref(false)
const errorMsg = ref('')
const items = ref([])

// 'all' | 'groq' | 'openai'
const activeProvider = ref('all')

// clicked item for detail view (null = list mode)
const selectedItem = ref(null)

// which row is currently updating pin
const pinLoadingId = ref(null)

/* ---- selection mode (bulk delete) ---- */
const selectionMode = ref(false)
const selectedIds = ref([])

/* ---- delete dialog (bulk) ---- */
const bulkDeleteDialog = ref(false)
const bulkDeleteLoading = ref(false)

/* ---- feedback snackbar ---- */
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

/* ---------- helpers ---------- */

function sexLabel(sex) {
  if (!sex) return '—'
  if (sex === 'M') return 'Male'
  if (sex === 'F') return 'Female'
  return sex
}

function providerLabel(provider) {
  if (provider === 'groq') return 'Qwen3-32B'
  if (provider === 'openai') return 'ChatGPT 4o'
  return provider || 'Unknown'
}

function providerPillColor(provider) {
  if (provider === 'groq') return '#E5E9FF'
  if (provider === 'openai') return '#E3F6EF'
  return '#EEEEEE'
}

function providerPillTextColor(provider) {
  if (provider === 'groq') return '#4B5CFF'
  if (provider === 'openai') return '#10A37F'
  return '#555555'
}

function formattedDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function preview(md, length = 90) {
  if (!md) return ''
  const text = md.replace(/[#*_`>-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > length ? text.slice(0, length) + '…' : text
}

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

/* ---------- data ---------- */

async function fetchHistory() {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase.rpc('get_cbc_history')

  if (error) {
    console.error('get_cbc_history error', error)
    errorMsg.value = 'Failed to load history.'
    items.value = []
  } else {
    items.value = data || []
  }

  loading.value = false
}

/**
 * Filtered + sorted items:
 * - filter by provider
 * - pinned first
 * - newest created_at within each group
 */
const filteredItems = computed(() => {
  let base = items.value

  if (activeProvider.value !== 'all') {
    base = base.filter((row) => row.provider === activeProvider.value)
  }

  return [...base].sort((a, b) => {
    if (a.pinned === b.pinned) {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    return a.pinned ? -1 : 1
  })
})

const selectedHtml = computed(() => {
  if (!selectedItem.value?.result_markdown) return ''
  return renderMarkdownSafe(selectedItem.value.result_markdown)
})

/* ---------- navigation ---------- */

function openItem(row) {
  if (selectionMode.value) return
  selectedItem.value = row
}

function closeDetail() {
  selectedItem.value = null
}

/* ---------- pin handling ---------- */

async function togglePinned(row, event) {
  if (event) event.stopPropagation()
  if (pinLoadingId.value === row.id) return

  const newPinned = !row.pinned
  pinLoadingId.value = row.id

  const { error } = await supabase.rpc('set_cbc_history_pinned', {
    p_id: row.id,
    p_pinned: newPinned,
  })

  if (error) {
    console.error('set_cbc_history_pinned error', error)
    showSnackbar('Could not update pin status.', 'error')
  } else {
    row.pinned = newPinned

    if (selectedItem.value && selectedItem.value.id === row.id) {
      selectedItem.value.pinned = newPinned
    }

    showSnackbar(newPinned ? 'Report pinned.' : 'Report unpinned.', 'success')
  }

  pinLoadingId.value = null
}

/* ---------- selection & bulk delete ---------- */

function toggleSelectionMode() {
  if (selectionMode.value) {
    selectionMode.value = false
    selectedIds.value = []
  } else {
    selectionMode.value = true
    selectedIds.value = []
    selectedItem.value = null
  }
}

function clearSelection() {
  selectedIds.value = []
}

function isSelected(row) {
  return selectedIds.value.includes(row.id)
}

const hasSelection = computed(() => selectedIds.value.length > 0)

function toggleSelectRow(row, event) {
  if (event) event.stopPropagation()

  if (row.pinned) {
    showSnackbar('Pinned reports cannot be selected for deletion.', 'warning')
    return
  }

  const idx = selectedIds.value.indexOf(row.id)
  if (idx === -1) {
    selectedIds.value.push(row.id)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

function openBulkDeleteDialog() {
  if (!hasSelection.value) return
  bulkDeleteDialog.value = true
}

function cancelBulkDelete() {
  bulkDeleteDialog.value = false
}

/**
 * Delete all selected (non-pinned) reports.
 */
async function confirmBulkDelete() {
  if (!hasSelection.value) return

  bulkDeleteLoading.value = true

  const idsToDelete = [...selectedIds.value]

  const blocked = items.value.filter(
    (row) => idsToDelete.includes(row.id) && row.pinned,
  )

  if (blocked.length) {
    showSnackbar('Pinned reports cannot be deleted. Unpin them first.', 'warning')
    selectedIds.value = selectedIds.value.filter(
      (id) => !blocked.some((b) => b.id === id),
    )
    bulkDeleteLoading.value = false
    bulkDeleteDialog.value = false
    return
  }

  let hadError = false

  for (const id of idsToDelete) {
    const { error } = await supabase.rpc('delete_cbc_history', { p_id: id })
    if (error) {
      console.error('delete_cbc_history error', id, error)
      hadError = true
    } else {
      items.value = items.value.filter((row) => row.id !== id)
      if (selectedItem.value && selectedItem.value.id === id) {
        selectedItem.value = null
      }
    }
  }

  bulkDeleteLoading.value = false
  bulkDeleteDialog.value = false
  selectionMode.value = false
  selectedIds.value = []

  if (hadError) {
    showSnackbar('Some reports could not be deleted. Please try again.', 'error')
  } else {
    showSnackbar('Selected reports deleted.', 'success')
  }
}

onMounted(fetchHistory)
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="!mobile"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <template #navigation>
      <SideNavi
        v-if="!mobile"
        :is-drawer-visible="isDrawerVisible"
      />
    </template>

    <template #content>
      <v-container class="py-6">
        <!-- ============ LIST MODE ============ -->
        <div v-if="!selectedItem">
          <!-- Header -->
          <div class="history-header mb-2">
            <div class="d-flex align-center ga-2">
              <h2 class="text-h5 font-weight-bold history-title">
                 <v-icon
                      size="20"
                      color="light-blue-lighten-3"
                           >
                         mdi-history
                   </v-icon>
                {{
                  selectionMode
                    ? (hasSelection ? `${selectedIds.length} Selected` : 'Select Reports')
                    : 'History'
                }}
              </h2>
            </div>

            <div class="history-actions">
              <template v-if="selectionMode">
                <v-btn
                  variant="text"
                  size="small"
                  class="cancel-select-btn"
                  @click="toggleSelectionMode"
                >
                  Cancel
                </v-btn>
              </template>
              <template v-else>
                <v-btn
                  variant="text"
                  size="small"
                  prepend-icon="mdi-check-circle-outline"
                  :disabled="!filteredItems.length"
                  @click="toggleSelectionMode"
                >
                  Select
                </v-btn>
              </template>
            </div>
          </div>

          <p
            v-if="!selectionMode"
            class="text-body-2 mb-3 text-grey-darken-1 mb-6"
          >
            Browse your saved CBC interpretations. Tap an entry to open the full report.
          </p>

          <!-- Filter Pills -->
          <div
            v-if="!selectionMode"
            class="filters-wrapper mb-4"
          >
            <v-btn
              variant="flat"
              class="filter-pill"
              :class="{ 'filter-pill-active': activeProvider === 'all' }"
              @click="activeProvider = 'all'; clearSelection()"
            >
              ALL
            </v-btn>
            <v-btn
              variant="flat"
              class="filter-pill"
              :class="{ 'filter-pill-active': activeProvider === 'groq' }"
              @click="activeProvider = 'groq'; clearSelection()"
            >
              QWEN
            </v-btn>
            <v-btn
              variant="flat"
              class="filter-pill"
              :class="{ 'filter-pill-active': activeProvider === 'openai' }"
              @click="activeProvider = 'openai'; clearSelection()"
            >
              CHATGPT 4O
            </v-btn>
          </div>

          <!-- Error -->
          <v-alert
            v-if="errorMsg"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ errorMsg }}
          </v-alert>

          <!-- Loading -->
          <v-skeleton-loader
            v-if="loading"
            type="card, card, card"
            class="mb-4"
          />

          <!-- Empty -->
          <v-alert
            v-else-if="!filteredItems.length"
            type="info"
            variant="tonal"
            class="mb-2"
          >
            No saved interpretations found.
            After generating a CBC explanation, click
            <strong>“Save to History”</strong> to store it here.
          </v-alert>

          <!-- Rows -->
          <transition-group
            v-else
            name="history-list"
            tag="div"
          >
            <v-card
              v-for="row in filteredItems"
              :key="row.id"
              class="history-row"
              :class="{
                'history-row-pinned': row.pinned,
                'history-row-selected': isSelected(row) && selectionMode,
              }"
              variant="flat"
              @click="selectionMode ? toggleSelectRow(row, $event) : openItem(row)"
            >
              <div class="row-inner">
                <transition name="fade">
                  <div
                    v-if="selectionMode"
                    class="select-box-wrap"
                  >
                    <v-checkbox-btn
                      :model-value="isSelected(row)"
                      :disabled="row.pinned"
                      density="compact"
                      @click.stop="toggleSelectRow(row, $event)"
                    />
                  </div>
                </transition>

                <div class="avatar-circle">
                  <v-icon size="22">mdi-water-plus-outline</v-icon>
                </div>

                <div class="row-content">
                  <div class="row-top d-flex align-center justify-space-between">
                    <div class="d-flex align-center ga-1">
                      <v-chip
                        size="x-small"
                        class="status-pill"
                        :style="{
                          backgroundColor: providerPillColor(row.provider),
                          color: providerPillTextColor(row.provider),
                        }"
                      >
                        {{ providerLabel(row.provider) }}
                      </v-chip>

                      <v-chip
                        v-if="row.pinned"
                        size="x-small"
                        class="pinned-pill"
                      >
                        <v-icon size="13" class="me-1">mdi-pin</v-icon>
                        Pinned
                      </v-chip>
                    </div>

                    <v-btn
                      icon
                      variant="text"
                      size="x-small"
                      class="pin-btn"
                      :loading="pinLoadingId === row.id"
                      @click.stop="togglePinned(row, $event)"
                    >
                      <v-icon
                        size="16"
                        class="pin-icon"
                        :class="{ active: row.pinned }"
                      >
                        {{ row.pinned ? 'mdi-pin' : 'mdi-pin-outline' }}
                      </v-icon>
                    </v-btn>
                  </div>

                  <div class="row-title">
                    CBC Interpretation • Age {{ row.test_age ?? '—' }} •
                    {{ sexLabel(row.test_sex) }}
                  </div>

                  <div class="row-meta">
                    <span class="meta-date">
                      <v-icon size="14" class="me-1">mdi-calendar-clock</v-icon>
                      {{ formattedDate(row.created_at) }}
                    </span>
                    <span class="dot hidden-xs-only">•</span>
                    <span class="preview-text">
                      {{ preview(row.result_markdown || '') }}
                    </span>
                  </div>
                </div>
              </div>
            </v-card>
          </transition-group>

          <!-- Floating bulk delete FAB -->
          <v-fab-transition>
            <v-btn
              v-if="selectionMode && hasSelection"
              color="error"
              class="delete-fab"
              size="large"
              elevation="6"
              @click="openBulkDeleteDialog"
            >
              <v-icon>mdi-trash-can</v-icon>
            </v-btn>
          </v-fab-transition>
        </div>

        <!-- ============ DETAIL MODE ============ -->
        <div v-else>
          <div class="d-flex align-center justify-space-between mb-3">
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              @click="closeDetail"
            >
              Back
            </v-btn>

            <div class="d-flex align-center ga-2">
              <v-chip
                size="small"
                class="status-pill"
                :style="{
                  backgroundColor: providerPillColor(selectedItem.provider),
                  color: providerPillTextColor(selectedItem.provider),
                }"
              >
                {{ providerLabel(selectedItem.provider) }} • {{ selectedItem.model }}
              </v-chip>

              <v-btn
                icon
                variant="text"
                size="small"
                class="pin-btn"
                :loading="pinLoadingId === selectedItem.id"
                @click="togglePinned(selectedItem, $event)"
              >
                <v-icon
                  size="18"
                  class="pin-icon"
                  :class="{ active: selectedItem.pinned }"
                >
                  {{ selectedItem.pinned ? 'mdi-pin' : 'mdi-pin-outline' }}
                </v-icon>
              </v-btn>
            </div>
          </div>

          <v-card class="detail-card">
            <v-card-text>
              <div class="detail-header mb-3">
                <div class="detail-title">CBC Interpretation Summary</div>

                <div class="detail-sub">
                  <span>
                    <v-icon size="16" class="me-1">mdi-account</v-icon>
                    Age: <strong>{{ selectedItem.test_age ?? '—' }}</strong>
                  </span>
                  <span>
                    <v-icon size="16" class="ms-3 me-1">mdi-gender-male-female</v-icon>
                    Sex: <strong>{{ sexLabel(selectedItem.test_sex) }}</strong>
                  </span>
                </div>

                <div class="detail-sub">
                  <v-icon size="14" class="me-1">mdi-calendar-clock</v-icon>
                  Saved:
                  <strong>{{ formattedDate(selectedItem.created_at) }}</strong>
                </div>
              </div>

              <div
                v-html="selectedHtml"
                class="detail-markdown"
              ></div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Bulk delete confirmation dialog -->
        <v-dialog
          v-model="bulkDeleteDialog"
          max-width="360"
        >
          <v-card>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              Delete selected reports?
            </v-card-title>
            <v-card-text class="text-body-2">
              This will permanently remove
              <strong>{{ selectedIds.length }}</strong>
              selected CBC interpretation<span v-if="selectedIds.length > 1">s</span>.
              This action cannot be undone.
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn
                variant="text"
                :disabled="bulkDeleteLoading"
                @click="cancelBulkDelete"
              >
                Cancel
              </v-btn>
              <v-btn
                color="error"
                variant="flat"
                :loading="bulkDeleteLoading"
                @click="confirmBulkDelete"
              >
                Yes, delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Snackbar feedback -->
        <v-snackbar
          v-model="snackbar"
          :color="snackbarColor"
          location="bottom"
          timeout="2200"
        >
          {{ snackbarMessage }}
        </v-snackbar>
      </v-container>
    </template>

    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>

<style scoped>
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-title::before {
  content: '';
  display: block;
  height: 2px;
  width: 50px;
  background-color: #9ec8da;
  border-radius: 999px;
  margin-top: 2px;
}

@media (max-width: 600px) {
  .history-title::after {
    width: 50px;
  }
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Filter pills */
.filter-pill {
  text-transform: uppercase;
  font-weight: 600;
  font-size: 0.72rem;
  border-radius: 9px;
  padding-inline: 10px;
  background: #f2f3ff;
  color: #4b4f6a;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.12);
}
.filter-pill-active {
  background: #5b93d7;
  color: #ffffff;
}

.filters-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

/* List rows */
.history-row {
  box-shadow: none;
  border-radius: 0;
  border-bottom: 1px solid rgba(148, 163, 253, 0.18);
  padding: 10px 4px;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    transform 0.12s ease,
    border-color 0.16s ease;
}
.history-row:last-of-type {
  border-bottom: none;
}
.history-row:hover {
  background-color: rgba(248, 250, 252, 0.98);
  transform: translateY(-1px);
}

.history-row-selected {
  background-color: rgba(183, 8, 26, 0.12);
  border-left: 3px solid #b70d37;
  transform: translateX(2px);
  transition: all 0.25s ease;
}

@media (prefers-color-scheme: dark) {
  .history-row-selected {
    background-color: rgba(183, 8, 26, 0.22);
    border-left-color: #f2cccc;
  }
}

.row-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.select-box-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 2px;
}

.avatar-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f2cccc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b9081a;
  flex-shrink: 0;
}

.row-content {
  flex: 1;
  min-width: 0;
}

.status-pill {
  border-radius: 999px;
  padding-inline: 10px;
  font-weight: 600;
}

.pinned-pill {
  border-radius: 999px;
  padding-inline: 8px;
  font-size: 0.65rem;
  background-color: #fff5f5;
  color: #b70d37;
  display: inline-flex;
  align-items: center;
}

.pin-btn {
  min-width: 0;
  padding: 0;
}
.pin-icon {
  color: #9ca3af;
  border-radius: 50%;
  padding: 12px;
  transition: all 0.2s ease;
}
.pin-icon.active {
  color: #b9081a !important;
  background-color: #f2cccc !important;
}
.pin-icon:hover {
  background-color: #f3f4f6;
  transform: scale(1.05);
}
.pin-icon.active:hover {
  background-color: #f7d9d9 !important;
}

.row-title {
  font-size: 0.88rem;
  font-weight: 600;
  margin-top: 2px;
}
.row-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.74rem;
  color: #6b7280;
  margin-top: 2px;
}
.row-meta .dot {
  margin: 0 3px;
}
.preview-text {
  color: #9ca3af;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-card {
  border-radius: 24px;
  border: 2px solid #b70d37;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  padding: 2px;
}
.detail-card :deep(.v-card-text) {
  padding: 18px 18px 20px;
}

.detail-header .detail-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.detail-sub {
  font-size: 0.78rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.detail-markdown {
  margin-top: 10px;
  padding: 10px 14px 8px;
  border-radius: 18px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.detail-markdown h2,
.detail-markdown h3 {
  margin-top: 0.65rem;
  margin-bottom: 0.2rem;
  font-size: 0.96rem;
  font-weight: 600;
}
.detail-markdown ul,
.detail-markdown ol {
  padding-left: 1.4rem;
  margin: 0.3rem 0 0.55rem;
}
.detail-markdown li {
  margin: 0.14rem 0;
}
.detail-markdown strong {
  font-weight: 600;
}

.history-list-move {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.history-list-enter-active,
.history-list-leave-active {
  transition: all 0.2s ease;
}
.history-list-enter-from,
.history-list-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.delete-fab {
  position: fixed !important;
  right: 18px !important;
  bottom: 110px !important;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  min-width: 0;
  padding: 0;
  background-color: #b70d37 !important;
  color: #ffffff !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.26);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.delete-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 600px) {
  .history-header {
    flex-direction: row;
    align-items: center;
  }
  .row-title {
    font-size: 0.84rem;
  }
  .row-meta {
    font-size: 0.7rem;
  }
  .delete-fab {
    bottom: 72px;
    right: 16px;
  }
}

.cancel-select-btn {
  color: #b70d37 !important;
  font-weight: 600;
}
</style>
