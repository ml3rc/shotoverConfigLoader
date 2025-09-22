window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type === 'SET_SCS_FIELD' && event.data.setting) {
        const { selector, type, value } = event.data.setting;
        const el = document.querySelector(selector);
        if (!el) return;

        //check if parent el if hidden -> then it is a setting for another gimbal
        let check = false;
        let currentEl = el;
        while (currentEl) {
            if (getComputedStyle(currentEl).display === 'none') {
                check = true;
                break;
            }
            currentEl = currentEl.parentElement;
        }
        if(!check){
            console.info("Setting is not avaiable for this gimbal... (skipping)");
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
                    console.info(`Skipping Field ${fieldName}, because its in the Lens Map`)
                }
                



                // Get the class name of the field
                const className = field.constructor.name;
                if(field.value === value){
                    console.log("Value of El already set.");
                    return;
                }

                if (className.toLowerCase() == "scs_select") {
                    //Select
                    field.value = value;
                    field.commit();
                    console.log("Set Select ui component");
                } else if(className.toLowerCase() == "scs_number"){
                    //Number
                    let factor =  parseFloat(field.raw) /  parseFloat(field.value);
                    field.value = value/factor;
                    console.log(field.value)
                    field.commit();
                    console.log("Set Number ui component");
                } else if(className.toLowerCase() == "scs_text"){
                    //Text
                    field.value = value;
                    field.commit();
                    console.log("Set Text ui component");
                } else {
                    //Else
                    field.value = value;
                    field.commit();
                    console.log("Set ui component");
                }
            }
            return;
        }
    }
});

console.log("Inject.js loaded...")
