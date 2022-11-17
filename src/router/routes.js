const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("pages/DashboardPage.vue") },
      {
        name: "Settings",
        path: "settings",
        component: () => import("src/pages/SettingsPage.vue"),
      },
      {
        name: "Backup",
        path: "backup",
        component: () => import("src/pages/BackupPage.vue"),
      },
      {
        name: "Addresses",
        path: "addresses",
        component: () => import("src/pages/AddressesPage.vue"),
      },
      {
        name: "Chains",
        path: "chains",
        component: () => import("src/pages/ChainsPage.vue"),
      },
      {
        name: "OpeningPoisitions",
        path: "opening-positions",
        component: () => import("src/pages/OpeningPositionsPage.vue"),
      },
      {
        name: "ExchangeTrades",
        path: "exchange-trades",
        component: () => import("src/pages/ExchangeTradesPage.vue"),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
