<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { mainNav } from './sideNavigation'

const route = useRoute()

const HOME = { title: 'Home', icon: 'mdi-home', path: '/dashboard' }
const ACCOUNT = { title: 'Account', icon: 'mdi-account', path: '/account/settings' }
const FAB = { title: 'Interpreter', icon: 'mdi mdi-robot', path: '/interpreter' }

const toPath = (t) => `/${t.replace(/\s+/g, '-').toLowerCase()}`

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
  const idx = items.value.findIndex((i) => route.path.startsWith(i.path))
  return idx === -1 ? 0 : idx
})

const leftFlankIndex = computed(() => Math.ceil(items.value.length / 2) - 1)
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
    style="--fab-gap: 25px"
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
        'flank-left': i === leftFlankIndex,
        'flank-right': i === rightFlankIndex,
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
:deep(.bn .v-btn--active) {
  background: transparent !important;
}
.bn {
  position: relative;
  border-radius: 0;
}

.v-bottom-navigation {
  padding: 0 8px;
}
.nav-btn {
  min-width: 70px;
  margin: 0 7px;
  position: relative;
  color: #6b7280;
}

.nav-btn.flank-left {
  margin-right: var(--fab-gap, 44px);
}
.nav-btn.flank-right {
  margin-left: var(--fab-gap, 44px);
}

.active-pill {
  position: absolute;
  inset: 5px auto auto 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(61, 106, 228, 0.18);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}
.nav-btn.active .active-pill {
  opacity: 1;
}
.nav-btn.active .v-icon {
  color: #3d91e4;
}

.fab-fixed {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(38px + env(safe-area-inset-bottom));
  z-index: 9999;
  pointer-events: none;
}
.fab-ring {
  position: absolute;
  inset: -6px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  z-index: -1;
}
.fab-btn {
  pointer-events: auto;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #3d91e4;
  color: #fff;
  box-shadow: 0 18px 28px rgba(61, 117, 228, 0.35);
  transition:
    transform 0.18s,
    box-shadow 0.18s,
    background-color 0.18s;
}
.fab-btn:hover {
  transform: translateY(-2px);
  background: #3d91e4;
  box-shadow: 0 22px 34px rgba(61, 111, 228, 0.4);
}

.fab-fixed.fab-active .fab-ring {
  box-shadow: 0 14px 28px rgba(61, 111, 228, 0.35);
}
.fab-btn.active {
  background: #2f7ad4;
  box-shadow: 0 22px 34px rgba(61, 111, 228, 0.45);
  transform: translateY(-1px);
}

/* Media Queries for Tablets and Large Screens */
@media (max-width: 1024px) {
  .nav-btn {
    min-width: 60px;
    margin: 0 5px;
  } /* Reduce button width and spacing */
  .fab-btn {
    width: 50px;
    height: 50px;
  } /* Adjust FAB size */
  .v-bottom-navigation {
    height: 60px;
    padding: 0 12px;
  } /* Reduce nav height */
  .nav-btn .text-caption {
    font-size: 12px;
  } /* Reduce text size */
}

/* Adjusting for smaller tablet screens or iPads in portrait */
@media (max-width: 768px) {
  .nav-btn {
    min-width: 55px;
    margin: 0 4px;
  }
  .fab-btn {
    width: 48px;
    height: 48px;
  }
  .v-bottom-navigation {
    height: 55px;
    padding: 0 10px;
  }
  .nav-btn .text-caption {
    font-size: 10px;
  }
}

/* Adjustments for larger tablets and landscape orientation */
@media (min-width: 1025px) and (max-width: 1280px) {
  .nav-btn {
    min-width: 65px;
    margin: 0 6px;
  }
  .fab-btn {
    width: 52px;
    height: 52px;
  }
  .v-bottom-navigation {
    height: 65px;
    padding: 0 14px;
  }
}
</style>
