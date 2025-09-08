import LoginView from '@/views/auth/LoginView.vue'
import RegisterView from '@/views/auth/RegisterView.vue'
import DashboardView from '@/views/system/DashboardView.vue'
import ForbiddenView from '@/views/errors/ForbiddenView.vue'
import NotFoundView from '@/views/errors/NotFoundView.vue'
import AccountSettingsView from '@/views/system/AccountSettingsView.vue'
import InterpreterView from '@/views/system/InterpreterView.vue'
// 👉 Routes
export const routesPath = [
    // Auth Pages
    {
        path: '/',
        name: 'home'
    },
    {
        path: '/login',
        name: 'login',
        component: LoginView,
        meta: { requiresAuth: false }
    },
    {
        path: '/register',
        name: 'register',
        component: RegisterView,
        meta: { requiresAuth: false }
    },

    // System Pages

    {
        path: '/dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { requiresAuth: true }
    },
    {
        path: '/interpreter',
        name: 'interpreter',
        component: InterpreterView,
        meta: { requiresAuth: true }
    },
    {
        path: '/account/settings',
        name: 'account-settings',
        component: AccountSettingsView,
        meta: { requiresAuth: true }
    },

    // Errors Pages
    {
        path: '/forbidden',
        name: 'forbidden',
        component: ForbiddenView,
        meta: { isDefault: true }
    },
    {
        path: '/:catchAll(.*)',
        name: 'not-found',
        component: NotFoundView,
        meta: { isDefault: true }
    }
]