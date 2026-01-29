export function showWarning($q, message) {
  $q.notify({
    message: message,
    color: "negative",
    icon: "warning",
    timeout: 0, // 0 = no auto-close
    position: "center",
    //closeBtn: 'Close',  // Show close button
    actions: [
      {
        label: "Dismiss",
        color: "white",
      },
    ],
  });
}
