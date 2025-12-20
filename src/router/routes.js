const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "Dashboard",
        component: () => import("pages/DashboardPage.vue"),
      },
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
        name: "Help",
        path: "help",
        component: () => import("src/pages/HelpPage.vue"),
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
        name: "Opening Poisitions",
        path: "opening-positions",
        component: () => import("src/pages/OpeningPositionsPage.vue"),
      },
      {
        name: "Exchange Trades",
        path: "exchange-trades",
        component: () => import("src/pages/ExchangeTradesPage.vue"),
      },
      {
        name: "Offchain Transfers",
        path: "offchain-transfers",
        component: () => import("src/pages/OffchainTransfersPage.vue"),
      },
      {
        name: "Prices",
        path: "prices",
        component: () => import("src/pages/PricesPage.vue"),
      },
      {
        name: "Chain Transactions",
        path: "chain-transactions",
        component: () => import("src/pages/ChainTxsPage.vue"),
      },
      {
        name: "Running Balances",
        path: "running-balances",
        component: () => import("src/pages/RunningBalancesPage.vue"),
      },
      {
        name: "Capital Gains",
        path: "capital-gains",
        component: () => import("src/pages/CapitalGainsPage.vue"),
      },
      {
        name: "Tax Export",
        path: "tax-export",
        component: () => import("src/pages/TaxExportPage.vue"),
      },
      {
        name: "Income",
        path: "income",
        component: () => import("src/pages/IncomePage.vue"),
      },
      {
        name: "Spending",
        path: "spending",
        component: () => import("src/pages/SpendingPage.vue"),
      },
      {
        name: "Unrealized",
        path: "unrealized",
        component: () => import("src/pages/UnrealizedPage.vue"),
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
