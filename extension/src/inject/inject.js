window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type === 'SET_SCS_FIELD' && event.data.setting) {
        const { selector, type, value } = event.data.setting;
        const el = document.querySelector(selector);
        if (!el) return;

        //check if parent el if hidden -> then it is a setting for another gimbal
        let displayIsNone = false;
        let currentEl = el;
        while (currentEl) {
            if (currentEl.style.display == 'none') {
                displayIsNone = true;
                break;
            }
            currentEl = currentEl.parentElement;
        }

        if(displayIsNone){
            // console.info("Setting is not avaiable for this gimbal... (skipping)");
            return;
        }
            
        const scs = window.content;
        if (scs && scs.fields) {
            const field = Array.from(scs.fields.values())
                .find(f => f.elm_query && f.elm_query[0] === el);

            if (!field?.readonly && !field?.disabled && field) {

                //Skip settings
                const fieldName = field.container.id

                const activeBtn = document.querySelector('button.nav-item.active');
                const pageName = activeBtn ? activeBtn.getAttribute("data-resource") : null;
                if(pageName == null){
                    console.warn("Could not get window pageName");
                    return;
                }
                //Lens Map
                //5th card
                if(fieldName.includes("field_5") && pageName.toLowerCase() == "/lens"){
                    // console.info(`Skipping Field ${fieldName}, because its in the Lens Map`)
                    return;
                }
                

                // Get the class name of the field
                const className = field.constructor.name;
                if(field.value == value){
                    // console.log(`Value of El already set: ${field.value}`); 
                    return;
                }

                if (className.toLowerCase() == "scs_select") {
                    //Select
                    if(field.value == null && value.includes("...")){
                        // console.log(`Value of El already set: ${field.value}`); 
                        return;
                    }
                    field.value = value;
                    field.commit();
                    console.log(`Set Select ui component: ${field.value}`);
                } else if(className.toLowerCase() == "scs_number"){
                    // console.log(`Raw: ${parseFloat(field.raw)}`)
                    // console.log(`Get Val: ${parseFloat(field.value)}`)
                    // console.log(`Set Val: ${parseFloat(value)}`)
                    let factor = 1
                    if(parseFloat(field.value) !== 0){
                        factor = parseFloat(field.raw) / parseFloat(field.value);
                    } else {
                        if(field?.on_get){
                            if(field.on_get?.name.includes("percent")){
                                factor = 100;
                            }
                        }
                    }
                    const calValue = parseFloat(value) / factor;
                    if(calValue == parseFloat(field.value)){
                        // console.log(`Value of El already set: ${field.value}`);
                        return;
                    }
                    field.value = parseFloat(value) / factor;
                    field.commit();
                    console.log(`Set Number ui component: ${value}`);
                } 
            } else {
                // console.log(`field is disabled val: ${field?.value}`)
            }
            return;
        }
    }
});

console.log("Inject.js loaded...")
