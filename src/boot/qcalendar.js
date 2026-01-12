import { boot } from "quasar/wrappers";

// IMPORTANT: Use named import { QCalendar } instead of default
import { QCalendar } from "@quasar/quasar-ui-qcalendar";

// Required - without this, the calendar often appears broken or invisible
import "@quasar/quasar-ui-qcalendar/dist/index.css";

export default boot(({ app }) => {
  app.component("QCalendar", QCalendar);
});
