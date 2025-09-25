window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "SET_SCS_FIELD" && event.data.setting) {
    const { selector, type, value } = event.data.setting;
    const el = document.querySelector(selector);
    if (!el) return;
    let displayIsNone = false;
    let currentEl = el;
    while (currentEl) {
      if (currentEl.style.display == "none") {
        displayIsNone = true;
        break;
      }
      currentEl = currentEl.parentElement;
    }
    if (displayIsNone) {
      return;
    }
    const scs = window.content;
    if (scs && scs.fields) {
      const field = Array.from(scs.fields.values()).find((f) => f.elm_query && f.elm_query[0] === el);
      if (!field?.readonly && !field?.disabled && field) {
        const fieldName = field.container.id;
        const activeBtn = document.querySelector("button.nav-item.active");
        const pageName = activeBtn ? activeBtn.getAttribute("data-resource") : null;
        if (pageName == null) {
          console.warn("Could not get window pageName");
          return;
        }
        if (fieldName.includes("field_5") && pageName.toLowerCase() == "/lens") {
          return;
        }
        const className = field.constructor.name;
        if (field.value == value) {
          return;
        }
        if (className.toLowerCase() == "scs_select") {
          if (field.value == null && value.includes("...")) {
            return;
          }
          field.value = value;
          field.commit();
          console.log(`Set Select ui component: ${field.value}`);
        } else if (className.toLowerCase() == "scs_number") {
          let factor = 1;
          if (parseFloat(field.value) !== 0) {
            factor = parseFloat(field.raw) / parseFloat(field.value);
          } else {
            if (field?.on_get) {
              if (field.on_get?.name.includes("percent")) {
                factor = 100;
              }
            }
          }
          const calValue = parseFloat(value) / factor;
          if (calValue == parseFloat(field.value)) {
            return;
          }
          field.value = parseFloat(value) / factor;
          field.commit();
          console.log(`Set Number ui component: ${value}`);
        }
      }
      return;
    }
  }
});
console.log("Inject.js loaded...");
