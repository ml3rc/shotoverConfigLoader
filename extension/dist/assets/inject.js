window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "SET_SCS_FIELD" && event.data.setting) {
    const { selector, type, value } = event.data.setting;
    const el = document.querySelector(selector);
    if (!el) return;
    const scs = window.content;
    if (scs && scs.fields) {
      const field = Array.from(scs.fields.values()).find((f) => f.elm_query && f.elm_query[0] === el);
      if (!field?.readonly && !field?.disabled && field) {
        const className = field.constructor.name;
        if (field.value === value) {
          console.log("Value of El already set.");
          return;
        }
        if (className.toLowerCase() == "scs_select") {
          field.value = value;
          field.commit();
          console.log("Set Select ui component");
        } else if (className.toLowerCase() == "scs_number") {
          let factor = parseFloat(field.raw) / parseFloat(field.value);
          field.value = value / factor;
          console.log(field.value);
          field.commit();
          console.log("Set Number ui component");
        } else if (className.toLowerCase() == "scs_text") {
          field.value = value;
          field.commit();
          console.log("Set Text ui component");
        } else {
          field.value = value;
          field.commit();
          console.log("Set ui component");
        }
      }
      return;
    }
  }
});
console.log("Inject.js loaded...");
