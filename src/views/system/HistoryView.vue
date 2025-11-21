<!-- src/views/system/HistoryView.vue -->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'
import { ref, onMounted, computed, nextTick } from 'vue'
import { useDisplay } from 'vuetify'
import { supabase } from '@/utils/supabase'
import { renderMarkdownSafe } from '@/utils/markdown'
import { useAuthUserStore } from '@/stores/authUser'

/* ====== Export libs ====== */
import * as htmlToImage from 'html-to-image'
import jsPDF from 'jspdf'

const authUser = useAuthUserStore()
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

/* ====== Export refs/state ====== */
const detailCardRef = ref(null)   // capture root
const exporting = ref(false)

/* ---------- tiny helpers ---------- */

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
  return '#10A37F'
}

function formattedDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

function preview(md, length = 90) {
  if (!md) return ''
  const text = md.replace(/[#*_`>-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > length ? text.slice(0, length) + '…' : text
}

/* ---------- RANGES & SUMMARY ---------- */
const ranges = {
  wbc:   { low: 5.0, high: 10.0, unit: '×10⁹/L', label: 'WBC' },
  rbcM:  { low: 4.5, high: 5.2, unit: '×10¹²/L', label: 'RBC' },
  rbcF:  { low: 3.4, high: 5.6, unit: '×10¹²/L', label: 'RBC' },
  hbM:   { low: 135, high: 175, unit: 'g/L',     label: 'Hemoglobin' },
  hbF:   { low: 125, high: 155, unit: 'g/L',     label: 'Hemoglobin' },
  hctM:  { low: 0.40, high: 0.52, unit: 'L/L',   label: 'Hematocrit' },
  hctF:  { low: 0.36, high: 0.48, unit: 'L/L',   label: 'Hematocrit' },
  mcv:   { low: 82,  high: 92,   unit: 'fL',     label: 'MCV' },
  mch:   { low: 27,  high: 32,   unit: 'pg',     label: 'MCH' },
  mchc:  { low: 320, high: 380,  unit: 'g/L',    label: 'MCHC' },
  plt:   { low: 150, high: 400,  unit: '×10⁹/L', label: 'Platelets' },
  neut:  { low: 0.50, high: 0.70, unit: '',      label: 'Neutrophils' },
  lymph: { low: 0.20, high: 0.40, unit: '',      label: 'Lymphocytes' },
  mono:  { low: 0.02, high: 0.06, unit: '',      label: 'Monocytes' },
  eos:   { low: 0.02, high: 0.05, unit: '',      label: 'Eosinophils' },
  baso:  { low: 0.00, high: 0.01, unit: '',      label: 'Basophils' },
}

const isDiffKey = (k) => ['neut', 'lymph', 'mono', 'eos', 'baso'].includes(k)
const parseNum = (v) => (v === '' || v == null ? NaN : Number(v))
const getStatus = (val, low, high) => {
  if (!isFinite(val)) return '—'
  if (val < low) return 'Low'
  if (val > high) return 'High'
  return 'Normal'
}
const chipColor = (status) =>
  status === 'Low' ? 'error'
  : status === 'High' ? 'warning'
  : status === 'Normal' ? 'success'
  : undefined

const fmtVal = (item) => {
  if (!isFinite(item.value)) return '—'
  if (isDiffKey(item.key)) return `${(item.value * 100).toFixed(0)} %`
  return `${item.value} ${item.unit || ''}`.trim()
}

function formatRef(item) {
  if (isDiffKey(item.key)) {
    const low = item.low ?? ''
    const high = item.high ?? ''
    if (!isFinite(low) || !isFinite(high)) return ''
    return `${(low * 100).toFixed(0)}–${(high * 100).toFixed(0)} %`
  }
  const low = item.low ?? ''
  const high = item.high ?? ''
  const unit = item.unit || ''
  if (low === '' && high === '') return unit ? unit : ''
  return `${low}–${high} ${unit}`.trim()
}

/* Build CBC summary items from a history row */
const selectedSummaryItems = computed(() => {
  const row = selectedItem.value
  if (!row) return []
  const s = row.test_sex === 'M' ? 'M' : 'F'

  const pack = [
    {
      key: 'wbc',
      ...ranges.wbc,
      value: parseNum(row.wbc),
      status: getStatus(parseNum(row.wbc), ranges.wbc.low, ranges.wbc.high),
    },
    {
      key: 'rbc',
      ...(s === 'M' ? ranges.rbcM : ranges.rbcF),
      value: parseNum(row.rbc),
      status: getStatus(
        parseNum(row.rbc),
        s === 'M' ? ranges.rbcM.low : ranges.rbcF.low,
        s === 'M' ? ranges.rbcM.high : ranges.rbcF.high
      ),
    },
    {
      key: 'hb',
      ...(s === 'M' ? ranges.hbM : ranges.hbF),
      value: parseNum(row.hb),
      status: getStatus(
        parseNum(row.hb),
        s === 'M' ? ranges.hbM.low : ranges.hbF.low,
        s === 'M' ? ranges.hbM.high : ranges.hbF.high
      ),
    },
    {
      key: 'hct',
      ...(s === 'M' ? ranges.hctM : ranges.hctF),
      value: parseNum(row.hct),
      status: getStatus(
        parseNum(row.hct),
        s === 'M' ? ranges.hctM.low : ranges.hctF.low,
        s === 'M' ? ranges.hctM.high : ranges.hctF.high
      ),
    },
    {
      key: 'mcv',
      ...ranges.mcv,
      value: parseNum(row.mcv),
      status: getStatus(parseNum(row.mcv), ranges.mcv.low, ranges.mcv.high),
    },
    {
      key: 'mch',
      ...ranges.mch,
      value: parseNum(row.mch),
      status: getStatus(parseNum(row.mch), ranges.mch.low, ranges.mch.high),
    },
    {
      key: 'mchc',
      ...ranges.mchc,
      value: parseNum(row.mchc),
      status: getStatus(parseNum(row.mchc), ranges.mchc.low, ranges.mchc.high),
    },
    {
      key: 'plt',
      ...ranges.plt,
      value: parseNum(row.plt),
      status: getStatus(parseNum(row.plt), ranges.plt.low, ranges.plt.high),
    },
    {
      key: 'neut',
      ...ranges.neut,
      value: parseNum(row.neutrophils),
      status: getStatus(parseNum(row.neutrophils), ranges.neut.low, ranges.neut.high),
    },
    {
      key: 'lymph',
      ...ranges.lymph,
      value: parseNum(row.lymphocytes),
      status: getStatus(parseNum(row.lymphocytes), ranges.lymph.low, ranges.lymph.high),
    },
    {
      key: 'mono',
      ...ranges.mono,
      value: parseNum(row.monocytes),
      status: getStatus(parseNum(row.monocytes), ranges.mono.low, ranges.mono.high),
    },
    {
      key: 'eos',
      ...ranges.eos,
      value: parseNum(row.eosinophils),
      status: getStatus(parseNum(row.eosinophils), ranges.eos.low, ranges.eos.high),
    },
    {
      key: 'baso',
      ...ranges.baso,
      value: parseNum(row.basophils),
      status: getStatus(parseNum(row.basophils), ranges.baso.low, ranges.baso.high),
    },
  ]

  return pack
})

/* ---------- meta computed for detail ---------- */
const selectedHtml = computed(() => {
  if (!selectedItem.value?.result_markdown) return ''
  return renderMarkdownSafe(selectedItem.value.result_markdown)
})

const patientName = computed(() => {
  const meta = authUser?.userData || {}
  const first =
    meta.firstname ||
    meta.first_name ||
    meta.firstName ||
    meta.given_name ||
    ''
  const last =
    meta.lastname ||
    meta.last_name ||
    meta.lastName ||
    meta.family_name ||
    ''
  const full = `${first} ${last}`.trim()
  return full || meta.full_name || meta.name || ''
})

const labLocation = computed(() => {
  const row = selectedItem.value || {}
  const parts = [row.test_lab_city, row.test_lab_country].filter(Boolean)
  return parts.join(', ')
})

const displayTestDate = computed(() => {
  const row = selectedItem.value || {}
  if (!row.test_date) return ''
  return String(row.test_date).includes('T') ? String(row.test_date).split('T')[0] : row.test_date
})

const hasCBCSummary = computed(() => (selectedSummaryItems.value || []).length > 0)

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
 * Filtered + sorted items
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

/* ====== Export helpers & actions ====== */
function exportFilename(ext = 'png') {
  const row = selectedItem.value || {}
  const date = new Date(row?.created_at || Date.now())
    .toISOString()
    .slice(0, 19)
    .replaceAll(':', '-')
  const who = `${sexLabel(row.test_sex)}_${row.test_age ?? 'NA'}`
  const prov = providerLabel(row.provider || '').replace(/\s+/g, '')
  return `CBC_${prov}_${who}_${date}.${ext}`.replace(/_+/g, '_')
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function getCaptureEl() {
  await nextTick()
  const el = detailCardRef.value
  return el || null
}

/**
 * Capture an OFFSCREEN CLONE with "export layout"
 */
async function captureWithExportLayout(cb) {
  const sourceNode = await getCaptureEl()
  if (!sourceNode) {
    showSnackbar('Nothing to export.', 'warning')
    return null
  }

  const body = document.body
  const originalOverflow = body.style.overflow

  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-99999px'
  wrapper.style.top = '0'
  wrapper.style.padding = '0'
  wrapper.style.margin = '0'
  wrapper.style.zIndex = '-1'

  const clone = sourceNode.cloneNode(true)
  clone.classList.add('export-layout', 'export-clone')

  // === FORCE Status Overview grid into 2 columns on the clone ===
  const summaryRow =
    clone.querySelector('.cbc-summary-sheet .v-row') ||
    clone.querySelector('.cbc-summary-sheet [class*="v-row"]')
  if (summaryRow) {
    summaryRow.style.marginLeft = '0'
    summaryRow.style.marginRight = '0'

    Array.from(summaryRow.children).forEach((col) => {
      if (!(col instanceof HTMLElement)) return
      col.style.flex = '0 0 50%'
      col.style.maxWidth = '50%'
      col.style.boxSizing = 'border-box'
    })
  }
  // =============================================================

  wrapper.appendChild(clone)
  body.appendChild(wrapper)

  body.style.overflow = 'hidden'

  await nextTick()

  try {
    const result = await cb(clone)
    return result
  } finally {
    body.style.overflow = originalOverflow
    body.removeChild(wrapper)
  }
}

/**
 * Export as PNG image
 */
async function exportAsImage() {
  exporting.value = true
  try {
    const result = await captureWithExportLayout(async (node) => {
      const pixelRatio = 2
      const opts = {
        pixelRatio,
        backgroundColor: '#ffffff',
        quality: 0.95,
        style: { background: '#ffffff' },
        useCORS: true,
        cacheBust: true,
        filter: (el) => !el?.classList?.contains('export-actions'),
      }

      const dataUrl = await htmlToImage.toPng(node, opts)
      downloadDataUrl(dataUrl, exportFilename('png'))
      showSnackbar('Exported image successfully.')
      return true
    })

    if (!result) return
  } catch (err) {
    console.error('exportAsImage error', err)
    showSnackbar('Export failed. Please try again.', 'error')
  } finally {
    exporting.value = false
  }
}

/**
 * Export as multi-page A4 PDF
 */
async function exportAsPdf() {
  exporting.value = true
  try {
    const result = await captureWithExportLayout(async (node) => {
      const pixelRatio = 2

      let alertBand = null
      const alertEl = node.querySelector('.educational-alert')
      if (alertEl) {
        const rootRect = node.getBoundingClientRect()
        const alertRect = alertEl.getBoundingClientRect()
        const topInRoot = alertRect.top - rootRect.top
        const bottomInRoot = alertRect.bottom - rootRect.top
        alertBand = {
          topPx: topInRoot * pixelRatio,
          bottomPx: bottomInRoot * pixelRatio,
        }
      }

      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio,
        backgroundColor: '#ffffff',
        style: { background: '#ffffff' },
        useCORS: true,
        cacheBust: true,
        filter: (el) => !el?.classList?.contains('export-actions'),
      })

      const img = new Image()
      img.src = dataUrl
      await img.decode()

      const imgW = img.width
      const imgH = img.height

      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 24
      const maxW = pageW - margin * 2
      const maxH = pageH - margin * 2

      const scale = maxW / imgW
      const maxSliceHeightPx = Math.floor(maxH / scale)

      let yOffset = 0
      let pageIndex = 0

      while (yOffset < imgH) {
        let sliceHeightPx = Math.min(maxSliceHeightPx, imgH - yOffset)

        if (alertBand) {
          const alertTop = alertBand.topPx
          const alertBottom = alertBand.bottomPx
          const sliceTop = yOffset
          const sliceBottom = yOffset + sliceHeightPx

          if (
            sliceTop < alertTop &&
            sliceBottom > alertTop &&
            sliceBottom < alertBottom
          ) {
            const safeHeight = Math.max(Math.floor(alertTop - sliceTop - 6), 80)
            sliceHeightPx = safeHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = imgW
        canvas.height = sliceHeightPx

        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true

        ctx.drawImage(
          img,
          0,
          yOffset,
          imgW,
          sliceHeightPx,
          0,
          0,
          imgW,
          sliceHeightPx
        )

        const sliceDataUrl = canvas.toDataURL('image/png')

        if (pageIndex > 0) {
          pdf.addPage()
        }

        const renderH = sliceHeightPx * scale

        pdf.addImage(
          sliceDataUrl,
          'PNG',
          margin,
          margin,
          maxW,
          renderH
        )

        yOffset += sliceHeightPx
        pageIndex += 1
      }

      pdf.save(exportFilename('pdf'))
      showSnackbar('Exported PDF successfully.')
      return true
    })

    if (!result) return
  } catch (err) {
    console.error('PDF export failed', err)
    showSnackbar('PDF export failed. Please try again.', 'error')
  } finally {
    exporting.value = false
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
      <SideNavi v-if="!mobile" :is-drawer-visible="isDrawerVisible" />
    </template>

    <template #content>
      <v-container class="py-6">
        <!-- ============ LIST MODE ============ -->
        <div v-if="!selectedItem">
          <!-- Header -->
          <div class="history-header mb-2">
            <div class="d-flex align-center ga-2">
              <h2 class="text-h5 font-weight-bold history-title">
                <v-icon size="20" color="blue-darken-1">mdi-history</v-icon>
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

          <p v-if="!selectionMode" class="text-body-2 mb-3 text-grey-darken-1 mb-6">
            Browse your saved CBC interpretations. Tap an entry to open the full report.
          </p>

          <!-- Filter Pills -->
          <div v-if="!selectionMode" class="filters-wrapper mb-4">
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
          <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-4">
            {{ errorMsg }}
          </v-alert>

          <!-- Loading -->
          <v-skeleton-loader v-if="loading" type="card, card, card" class="mb-4" />

          <!-- Empty -->
          <v-alert v-else-if="!filteredItems.length" type="info" variant="tonal" class="mb-2">
            No saved interpretations found. After generating a CBC explanation, click
            <strong>“Save to History”</strong> to store it here.
          </v-alert>

          <!-- Rows -->
          <transition-group v-else name="history-list" tag="div">
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
                  <div v-if="selectionMode" class="select-box-wrap">
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

                      <v-chip v-if="row.pinned" size="x-small" class="pinned-pill">
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
                      <v-icon size="16" class="pin-icon" :class="{ active: row.pinned }">
                        {{ row.pinned ? 'mdi-pin' : 'mdi-pin-outline' }}
                      </v-icon>
                    </v-btn>
                  </div>

                  <div class="row-title">
                    CBC Interpretation • Age {{ row.test_age ?? '—' }} • {{ sexLabel(row.test_sex) }}
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

        <!-- ============ DETAIL MODE (shows full Result-like view) ============ -->
        <div v-else>
          <div class="d-flex align-center justify-space-between mb-3">
            <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="closeDetail">
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
                <v-icon size="18" class="pin-icon" :class="{ active: selectedItem.pinned }">
                  {{ selectedItem.pinned ? 'mdi-pin' : 'mdi-pin-outline' }}
                </v-icon>
              </v-btn>
            </div>
          </div>

          <!-- Card with inner plain DIV as capture target -->
          <v-card class="detail-card">
            <!-- Only this area is captured -->
            <div ref="detailCardRef" class="capture-root">
              <v-card-text>
                <div class="mb-3 d-flex align-center">
                  <span class="section-emoji">🏥</span>
                  <h3 class="text-subtitle-1 font-weight-bold">
                    Overview of Your CBC Findings
                  </h3>
                </div>

                <!-- TOP SECTION: Personal details + Status Overview -->
                <div class="top-section">
                  <!-- Personal & Lab Details -->
                  <v-sheet class="meta-sheet" rounded="xl" variant="outlined">
                    <v-row dense>
                      <v-col cols="12" md="4">
                        <div class="meta-label">Patient Name</div>
                        <div class="meta-value">{{ patientName || 'Not set in profile' }}</div>
                      </v-col>

                      <v-col cols="6" md="2">
                        <div class="meta-label">Age</div>
                        <div class="meta-value">{{ selectedItem.test_age ?? '—' }}</div>
                      </v-col>

                      <v-col cols="6" md="2">
                        <div class="meta-label">Sex</div>
                        <div class="meta-value">{{ sexLabel(selectedItem.test_sex) }}</div>
                      </v-col>

                      <v-col cols="12" md="4">
                        <div class="meta-label">Laboratory Name</div>
                        <div class="meta-value">{{ selectedItem.test_lab_name || '—' }}</div>
                      </v-col>

                      <v-col cols="12" md="4">
                        <div class="meta-label">Laboratory Location</div>
                        <div class="meta-value">{{ labLocation || '—' }}</div>
                      </v-col>

                      <v-col cols="6" md="2">
                        <div class="meta-label">Test Date</div>
                        <div class="meta-value">{{ displayTestDate || '—' }}</div>
                      </v-col>

                      <v-col cols="6" md="2">
                        <div class="meta-label">Country</div>
                        <div class="meta-value">{{ selectedItem.test_lab_country || '—' }}</div>
                      </v-col>

                      <v-col cols="12" md="4">
                        <div class="meta-label">Saved</div>
                        <div class="meta-value">{{ formattedDate(selectedItem.created_at) }}</div>
                      </v-col>
                    </v-row>
                  </v-sheet>

                  <!-- Status Overview -->
                  <v-sheet
                    v-if="hasCBCSummary"
                    class="cbc-summary-sheet"
                    rounded="xl"
                    variant="outlined"
                  >
                    <div class="cbc-summary-header d-flex align-center gap-2 mb-2">
                      <span class="section-emoji small">📋</span>
                      <h3>Status Overview</h3>
                    </div>

                    <v-row dense>
                      <v-col
                        v-for="item in selectedSummaryItems"
                        :key="item.key"
                        cols="12"
                        sm="6"
                        md="6"
                        lg="6"
                        class="mb-1"
                      >
                        <div class="cbc-item">
                          <div class="cbc-label">{{ item.label }}</div>
                          <div class="cbc-value-line">
                            <span class="cbc-value">{{ fmtVal(item) }}</span>
                            <v-chip
                              v-if="item.status && item.status !== '—'"
                              :color="chipColor(item.status)"
                              size="x-small"
                              variant="elevated"
                              class="status-chip text-uppercase font-weight-bold"
                            >
                              {{ item.status }}
                            </v-chip>
                          </div>
                          <div class="cbc-ref">Ref: {{ formatRef(item) }}</div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-sheet>
                </div>

                <!-- Interpretation -->
                <div class="mt-6 ai-section">
                  <div class="ai-header d-flex align-center gap-2 mb-2">
                    <span class="section-emoji">🤖</span>
                    <span class="ai-title">AI-Assisted Explanation</span>
                  </div>

                  <div class="ai-model-line mb-2">
                    <span class="ai-model-label me-2">Model used</span>
                    <span class="ai-model-value">
                      {{ providerLabel(selectedItem.provider) }}
                      <span v-if="selectedItem.model"> ({{ selectedItem.model }})</span>
                    </span>
                  </div>

                  <v-alert
                    type="warning"
                    variant="tonal"
                    density="comfortable"
                    class="mb-4 educational-alert"
                    border="start"
                  >
                    <template #prepend>
                      <span class="educational-alert-emoji">⚠️</span>
                    </template>

                    <span class="educational-alert-text">
                      This explanation is for educational support only and must not replace assessment
                      by a licensed physician. If you feel unwell or your results are significantly
                      abnormal, please consult your doctor.
                    </span>
                  </v-alert>

                  <div v-if="selectedHtml" class="detail-markdown" v-html="selectedHtml"></div>
                  <div v-else class="text-grey-darken-1 text-body-2">
                    No interpretation found for this entry.
                  </div>
                </div>

                <!-- HemaSense footer INSIDE capture area (shows on image/PDF) -->
                <div class="export-footer">
                  <img
                    src="/images/logo-favicon.png"
                    alt="HemaSense logo"
                    class="export-footer-logo"
                  />
                  <span class="export-footer-text">
                    © 2025 HemaSense · All rights reserved
                  </span>
                </div>
              </v-card-text>
            </div>

            <!-- Export dropdown (excluded from capture) -->
            <div class="export-actions d-flex align-center justify-end px-4 pb-4 ga-2">
              <v-menu location="bottom end" transition="fade-transition">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    size="small"
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-tray-arrow-down"
                    :loading="exporting"
                    :disabled="exporting"
                  >
                    Export
                    <v-icon end class="ms-1">mdi-chevron-down</v-icon>
                  </v-btn>
                </template>

                <v-list density="compact" min-width="180">
                  <v-list-item @click="exportAsImage">
                    <template #prepend>
                      <v-icon>mdi-image-outline</v-icon>
                    </template>
                    <v-list-item-title>Image</v-list-item-title>
                    <v-list-item-subtitle>PNG export</v-list-item-subtitle>
                  </v-list-item>

                  <v-divider class="my-1" />

                  <v-list-item @click="exportAsPdf">
                    <template #prepend>
                      <v-icon>mdi-file-pdf-box</v-icon>
                    </template>
                    <v-list-item-title>PDF</v-list-item-title>
                    <v-list-item-subtitle>For printing & sharing</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </v-card>
        </div>

        <!-- Bulk delete confirmation dialog -->
        <v-dialog v-model="bulkDeleteDialog" max-width="360">
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
              <v-btn variant="text" :disabled="bulkDeleteLoading" @click="cancelBulkDelete">
                Cancel
              </v-btn>
              <v-btn color="error" variant="flat" :loading="bulkDeleteLoading" @click="confirmBulkDelete">
                Yes, delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Snackbar feedback -->
        <v-snackbar v-model="snackbar" :color="snackbarColor" location="bottom" timeout="2200">
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
  background-color: #1E88E5;
  border-radius: 999px;
  margin-top: 2px;
}
@media (max-width: 600px) {
  .history-title::after { width: 50px; }
}
.history-actions { display: flex; align-items: center; gap: 6px; }

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
.filter-pill-active { background: #5b93d7; color: #ffffff; }
.filters-wrapper {
  display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px;
}

/* List rows */
.history-row {
  box-shadow: none; border-radius: 0; border-bottom: 1px solid rgba(148, 163, 253, 0.18);
  padding: 9px 10px; cursor: pointer;
  transition: background-color 0.16s ease, transform 0.12s ease, border-color 0.16s ease;
}
.history-row:last-of-type { border-bottom: none; }
.history-row:hover { transform: translateY(-1px); }
.history-row-selected {
  background-color: rgba(183, 8, 26, 0.12); border-left: 3px solid #b69da4; transform: translateX(2px);
  transition: all 0.25s ease;
}
@media (prefers-color-scheme: dark) {
  .history-row-selected { background-color: rgba(183, 8, 26, 0.22); border-left-color: #f2cccc; }
}
.row-inner { display: flex; align-items: center; gap: 10px; }
.select-box-wrap { display: flex; align-items: center; justify-content: center; padding-left: 2px; }
.avatar-circle {
  width: 34px; height: 34px; border-radius: 50%; background: #f2cccc; color: #b9081a;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.row-content { flex: 1; min-width: 0; }
.status-pill { border-radius: 999px; padding-inline: 10px; font-weight: 600; }
.pinned-pill {
  border-radius: 999px; padding-inline: 8px; font-size: 0.65rem; background-color: #fff5f5;
  color: #b70d37; display: inline-flex; align-items: center;
}
.pin-btn { min-width: 0; padding: 0; }
.pin-icon { color: #9ca3af; border-radius: 50%; padding: 12px; transition: all 0.2s ease; }
.pin-icon.active { color: #b9081a !important; background-color: #f2cccc !important; }
.pin-icon:hover { background-color: #f3f4f6; transform: scale(1.05); }
.pin-icon.active:hover { background-color: #f7d9d9 !important; }

.row-title { font-size: 0.88rem; font-weight: 600; margin-top: 2px; }
.row-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
  font-size: 0.74rem; color: #6b7280; margin-top: 2px;
}
.row-meta .dot { margin: 0 3px; }
.preview-text { color: #9ca3af; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Detail card */
.detail-card { border-radius: 24px; border: 2px solid #0D47A1; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08); padding: 2px; }
.detail-card :deep(.v-card-text) { padding: 18px 18px 20px; }

/* Capture root export layout */
.capture-root.export-layout {
  width: 780px;
  max-width: 780px;
  margin: 0 auto;
}

/* During export, remove transitions/animations on the clone for stable rendering */
.capture-root.export-layout,
.capture-root.export-layout * {
  transition: none !important;
  animation: none !important;
}

/* Extra clean look for offscreen export clone */
.export-clone {
  box-shadow: none !important;
}

/* Emoji section icons */
.section-emoji {
  margin-right: 6px;
  font-size: 1.1rem;
}
.section-emoji.small {
  font-size: 0.9rem;
}

/* TOP SECTION layout */
.top-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* For export: keep them stacked (Personal Info full width, then Status Overview) */
.capture-root.export-layout .top-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Meta section */
.meta-sheet { padding: 10px 20px; border: 2px solid #b3bbc9; }
.meta-label {
  font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;
}
.meta-value { font-size: 0.9rem; font-weight: 600; margin-top: 2px; }

/* CBC Summary */
.cbc-summary-sheet { padding: 10px 14px; }
.cbc-summary-header { font-size: 0.8rem; }
.cbc-item { padding: 4px 0; }
.cbc-label { font-size: 0.75rem; }
.cbc-value-line { display: flex; align-items: center; gap: 6px; }
.cbc-value { font-size: 0.9rem; font-weight: 600; }
.cbc-ref { font-size: 0.68rem; }
.status-chip { font-size: 0.6rem; }

/* Force 2 columns for Status Overview items ONLY on export clone */
.capture-root.export-layout .cbc-summary-sheet :deep(.v-row) {
  margin-left: 0;
  margin-right: 0;
}
.capture-root.export-layout .cbc-summary-sheet :deep(.v-col) {
  flex: 0 0 50% !important;
  max-width: 50% !important;
}

/* AI Section */
.ai-section { margin-top: 18px; }
.ai-header .ai-title { font-weight: 600; font-size: 0.98rem; }
.detail-markdown {
  margin-top: 10px; padding: 10px 14px 8px; border-radius: 18px;
  font-size: 0.9rem; line-height: 1.6;
}
.detail-markdown h2, .detail-markdown h3 {
  margin-top: 0.65rem; margin-bottom: 0.2rem; font-size: 0.96rem; font-weight: 600;
}
.detail-markdown ul, .detail-markdown ol {
  padding-left: 1.4rem;
  margin: 0.3rem 0 0.55rem;
}
.detail-markdown li { margin: 0.14rem 0; }
.detail-markdown strong { font-weight: 600; }

/* Tighter bullets + text only on export clone to avoid big blank spaces */
.capture-root.export-layout .detail-markdown {
  line-height: 1.45;
}
.capture-root.export-layout .detail-markdown ul,
.capture-root.export-layout .detail-markdown ol {
  margin: 0.08rem 0 0.18rem;
}
.capture-root.export-layout .detail-markdown li {
  margin: 0.03rem 0;
}
.capture-root.export-layout .detail-markdown li p {
  margin-top: 0.02rem;
  margin-bottom: 0.02rem;
}
.capture-root.export-layout .detail-markdown p {
  margin-top: 0.12rem;
  margin-bottom: 0.12rem;
}

/* Warning banner text */
.educational-alert-emoji {
  margin-right: 6px;
}
.educational-alert-text {
  font-size: 0.86rem;
  line-height: 1.5;
}

/* HemaSense footer inside capture area */
.export-footer {
  margin-top: 24px;
  padding-top: 10px;
  border-top: 1px dashed #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  opacity: 0.85;
}
.export-footer-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.export-footer-text {
  font-size: 0.7rem;
  color: #6b7280;
}

/* transitions + misc */
.history-list-move { transition: transform 0.2s ease, opacity 0.2s ease; }
.history-list-enter-active, .history-list-leave-active { transition: all 0.2s ease; }
.history-list-enter-from, .history-list-leave-to { opacity: 0; transform: translateY(4px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Bulk-delete FAB */
.delete-fab {
  position: fixed !important; right: 18px !important; bottom: 110px !important;
  width: 52px; height: 52px; border-radius: 999px; min-width: 0; padding: 0;
  background-color: #b70d37 !important; color: #ffffff !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.26); display: flex; align-items: center; justify-content: center;
  z-index: 1400; transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.delete-fab:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); }

@media (max-width: 600px) {
  .history-header { flex-direction: row; align-items: center; }
  .row-title { font-size: 0.84rem; }
  .row-meta { font-size: 0.7rem; }
  .delete-fab { bottom: 72px; right: 16px; }
}

.cancel-select-btn { color: #b70d37 !important; font-weight: 600; }

/* Export bar styles */
.export-actions :deep(.v-btn) {
  text-transform: none;
  font-weight: 600;
}
</style>
