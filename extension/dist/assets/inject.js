window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "SET_SCS_FIELD" && event.data.setting) {
    const { selector, type, value } = event.data.setting;
    const el = document.querySelector(selector);
    if (!el) return;
    if ((type === "checkbox" || type === "radio") && el.checked === value || type === "contenteditable" && el.innerHTML === value || el.tagName.toLowerCase() === "select" && el.value == value || type !== "checkbox" && type !== "radio" && type !== "contenteditable" && el.value == value) {
      return;
    }
    const scs = window.content;
    if (scs && scs.fields) {
      const field = Array.from(scs.fields.values()).find((f) => f.elm_query && f.elm_query[0] === el);
      if (field) {
        field.value = value;
        field.commit();
        console.log(`Committed ${selector} -> ${value} via SCS_Content`);
        return;
      }
    }
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    console.log(`Committed ${selector} -> ${value} via DOM fallback`);
  }
});
