import { createRouter, createWebHistory } from 'vue-router';

const defaultPageName = 'TwinkleTaps';
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'TwinkleTaps',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/HomeView.vue'),
    },
  ],
});

router.beforeEach((to, from, next) => {
  if (typeof to.name === 'string') {
    document.title = to.name;
  } else {
    document.title = defaultPageName;
  }
  next();
});

export default router;
