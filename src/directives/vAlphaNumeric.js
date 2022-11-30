import { watch } from "vue";

export const vAlphaNumeric = {
  mounted: (el, binding) => {
    el.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^\w\s]/gi, "");
    });
  },
};
