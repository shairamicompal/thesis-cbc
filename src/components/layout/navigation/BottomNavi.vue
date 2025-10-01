<!-- src/components/layout/navigation/BottomNavi.vue -->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { mainNav } from './sideNavigation'

const route = useRoute()

const HOME     = { title: 'Home',    icon: 'mdi-home',    path: '/dashboard' }
const ACCOUNT  = { title: 'Account', icon: 'mdi-account', path: '/account/settings' }
const FAB      = { title: 'Interpreter', icon: 'mdi-robot', path: '/interpreter' }

const toPath = t => `/${t.replace(/\s+/g, '-').toLowerCase()}`

const items = computed(() => {
  const filtered = mainNav
    .filter(([title]) => title.toLowerCase() !== 'interpreter')
    .map(([title, icon]) => ({ title, icon, path: toPath(title) }))
  return [HOME, ...filtered, ACCOUNT]
})

const activeIndex = computed(() => {
  const idx = items.value.findIndex(i => i.path === route.path)
  return idx === -1 ? 0 : idx
})

/* 👉 find the two items that flank the center so we can give them extra spacing */
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
    :model-value="activeIndex"
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
      exact
      :selected-class="null"
      :ripple="false"
    >
      <span class="active-pill" aria-hidden="true"></span>
      <v-icon :icon="item.icon" />
      <span class="text-caption mt-1">{{ item.title }}</span>
    </v-btn>
  </v-bottom-navigation>

  <!-- Floating Interpreter FAB (teleported, never clipped) -->
  <teleport to="body">
    <div class="fab-fixed">
      <div class="fab-ring" aria-hidden="true"></div>
      <v-btn class="fab-btn" :to="FAB.path" icon elevation="16" :ripple="false">
        <v-icon :icon="FAB.icon" size="28" />
      </v-btn>
    </div>
  </teleport>
</template>

<style scoped>
/* Clean nav */
:deep(.bn .v-btn--active){ background: transparent !important; }
.bn { position: relative; border-radius: 0; }

/* Equal-ish spacing + touch area */
.v-bottom-navigation { padding: 0 8px; }
.nav-btn { min-width: 70px; margin: 0 7px; position: relative; color:#6b7280; }

/* 👉 Extra breathing room beside the FAB */
.nav-btn.flank-left  { margin-right:  var(--fab-gap, 44px); }
.nav-btn.flank-right { margin-left:   var(--fab-gap, 44px); }
/* If you want even more space on tiny screens, bump --fab-gap with a media query */

/* Active halo */
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

.v-bottom-navigation {
  padding: 0 8px;          /* spacing on the sides */
}

.nav-btn {
  margin: 0 -3px;           /* spacing between icons */
  min-width: 70px;         /* wider click/touch area */
}

</style>
