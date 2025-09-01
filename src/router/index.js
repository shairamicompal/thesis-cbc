import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/auth/LoginView.vue'
import RegisterView from '@/views/auth/RegisterView.vue'
import DashboardView from '@/views/system/DashboardView.vue'
import NotFoundView from '@/views/errors/NotFoundView.vue'
import ForbiddenView from '@/views/errors/ForbiddenView.vue'
import { isAuthenticated } from '@/utils/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [

    {
      path: '/',
      name: 'home',
    },

    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView
    },

    // Errors Pages
    {
      path: '/forbidden',
      name: 'forbidden',
      component: ForbiddenView,
    },
    {
      path: '/:catchAll(.*)',
      name: 'not-found',
      component: NotFoundView,
    }
  ]
})

router.beforeEach(async (to) => {
  const isLoggedIn = await isAuthenticated()

  if (to.name === 'home') {
    return isLoggedIn ? { name: 'dashboard' } : { name: 'login' }
  }

  if (isLoggedIn && (to.name === 'login' || to.name === 'register')) {
    return { name: 'dashboard' }
  }

  if (!isLoggedIn && to.path.startsWith('/system')) {
    return { name: 'login' }
  }

  if (router.resolve(to).matched.length === 0) {
    return { name: 'not-found' }
  }
})

export default router

