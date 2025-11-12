<!-- src/components/layout/navigation/BottomNavi.vue -->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { mainNav } from './sideNavigation'

const route = useRoute()

const HOME     = { title: 'Home',    icon: 'mdi-home',    path: '/dashboard' }
const ACCOUNT  = { title: 'Account', icon: 'mdi-account', path: '/account/settings' }
const FAB      = { title: 'Interpreter', icon: 'mdi mdi-robot', path: '/interpreter' }

const toPath = t => `/${t.replace(/\s+/g, '-').toLowerCase()}`

const items = computed(() => {
  const filtered = mainNav
    .filter(([title]) => title.toLowerCase() !== 'interpreter')
    .map(([title, icon]) => ({ title, icon, path: toPath(title) }))
  return [HOME, ...filtered, ACCOUNT]
})

/* 🔹 Is the current route the Interpreter page (or a child route)? */
const isFabActive = computed(() => route.path.startsWith(FAB.path))

/* 🔹 When on Interpreter, don't select any bottom-nav item */
const activeIndex = computed(() => {
  if (isFabActive.value) return null
  const idx = items.value.findIndex(i => route.path.startsWith(i.path))
  return idx === -1 ? 0 : idx
})

const leftFlankIndex  = computed(() => Math.ceil(items.value.length / 2) - 1)
const rightFlankIndex = computed(() => Math.ceil(items.value.length / 2))
</script>

<template>
  <v-bottom-navigation
    app
    height="72"
    elevation="2"
    bg-color="white"
    border="top"
    class="bn"
    :model-value="activeIndex ?? undefined"
    style="--fab-gap: 25px;"
  >
    <v-btn
      v-for="(item, i) in items"
      :key="i"
      :to="item.path"
      :value="i"
      variant="text"
      class="nav-btn"
      :class="{
        active: activeIndex === i,
        'flank-left':  i === leftFlankIndex,
        'flank-right': i === rightFlankIndex
      }"
      :ripple="false"
      :selected-class="null"
    >
      <span class="active-pill" aria-hidden="true"></span>
      <v-icon :icon="item.icon" />
      <span class="text-caption mt-1">{{ item.title }}</span>
    </v-btn>
  </v-bottom-navigation>

  <!-- Floating Interpreter FAB (teleported, never clipped) -->
  <teleport to="body">
    <div class="fab-fixed" :class="{ 'fab-active': isFabActive }">
      <div class="fab-ring" aria-hidden="true"></div>
      <v-btn
        class="fab-btn"
        :class="{ active: isFabActive }"
        :to="FAB.path"
        icon
        elevation="16"
        :ripple="false"
        :aria-current="isFabActive ? 'page' : undefined"
      >
        <v-icon :icon="FAB.icon" size="28" />
      </v-btn>
    </div>
  </teleport>
</template>

<style scoped>
:deep(.bn .v-btn--active){ background: transparent !important; }
.bn { position: relative; border-radius: 0; }

.v-bottom-navigation { padding: 0 8px; }
.nav-btn { min-width: 70px; margin: 0 7px; position: relative; color:#6b7280; }

.nav-btn.flank-left  { margin-right:  var(--fab-gap, 44px); }
.nav-btn.flank-right { margin-left:   var(--fab-gap, 44px); }

.active-pill{
  position: absolute; inset: 5px auto auto 50%; transform: translateX(-50%);
  width: 36px; height: 36px; border-radius: 999px;
  background: rgba(61, 106, 228, 0.18);
  opacity: 0; transition: opacity .18s ease; pointer-events: none;
}
.nav-btn.active .active-pill{ opacity: 1; }
.nav-btn.active .v-icon{ color:#3d91e4; }

/* Fixed, teleported FAB */
.fab-fixed{
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(38px + env(safe-area-inset-bottom));
  z-index: 9999; pointer-events: none;
}
.fab-ring{
  position: absolute; inset: -6px; border-radius: 999px;
  background:#fff; box-shadow: 0 10px 20px rgba(0,0,0,.12); z-index:-1;
}
.fab-btn{
  pointer-events:auto; width:56px; height:56px; border-radius:999px;
  background:#3d91e4; color:#fff;
  box-shadow:0 18px 28px rgba(61, 117, 228, 0.35);
  transition: transform .18s, box-shadow .18s, background-color .18s;
}
.fab-btn:hover{ transform: translateY(-2px); background:#3d91e4; box-shadow:0 22px 34px rgba(61, 111, 228, 0.4);}

/* 🔹 Visual "active" state for the FAB when on /interpreter */
.fab-fixed.fab-active .fab-ring{ box-shadow: 0 14px 28px rgba(61,111,228,.35); }
.fab-btn.active{ background:#2f7ad4; box-shadow:0 22px 34px rgba(61,111,228,.45); transform: translateY(-1px); }

/* spacing tweaks you already had */
.v-bottom-navigation { padding: 0 8px; }
.nav-btn { margin: 0 -3px; min-width: 70px; }
</style>
