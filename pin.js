// sort in tab-content__bordered-container

let PINS = [];

let LOCKED = false;

let UPDATED = true;

let MAX_RETRY = 2;

async function removePin(id, retry = 0) {
    if (retry === MAX_RETRY) {
        return;
    }
    if (!LOCKED) {
        LOCKED = true;
        let pins = await browser.storage.local.get("fl-pins")
        let arr = pins["fl-pins"];
        arr.delete(id);
        await browser.storage.local.set({ "fl-pins": arr });
        LOCKED = false;
    } else {
        setTimeout(() => {
            addPin(id, retry + 1)
        })
    }
}

async function addPin(id, retry = 0) {
    if (retry === MAX_RETRY) {
        return;
    }
    if (!LOCKED) {
        LOCKED = true;
        let pins = await browser.storage.local.get("fl-pins");
        let arr = pins["fl-pins"];
        arr.add(id);
        await browser.storage.local.set({ "fl-pins": arr });
        LOCKED = false;
    } else {
        setTimeout(() => {
            removePin(id, retry + 1)
        })
    }
}

async function checkPin(id) {
    let pins = await browser.storage.local.get("fl-pins");
    if (!("fl-pins" in pins)) {
        return false;
    }
    return pins["fl-pins"].has(id);
}

async function addButtons() {
    let existingButtons = document.querySelectorAll(".fa-thumb-tack");
    if (existingButtons.length > 0) {
        return;
    }
    let buttonSiblings = document.querySelectorAll(".branch__title, .storylet__heading");

    for (let sibling of buttonSiblings) {
        let newButton = document.createElement("div");
        let id = sibling.parentElement.parentElement.parentElement.attributes["data-branch-id"].nodeValue;
        newButton.className = "branch__plan-buttonlet";
        newButton.innerHTML = `<button aria-label="Pin this storylet" class="buttonlet-container" type="button"><span class="buttonlet fa-stack fa-lg buttonlet-enabled  buttonlet-plan" title="Pin this storylet"><span class="fa fa-circle fa-stack-2x"></span><span class="fa fa-inverse fa-stack-1x fa-thumb-tack buttonlet--plan"></span><span class="u-visually-hidden">plan</span></span></button>`;
        newButton.onclick = async () => {
            let icon = newButton.getElementsByClassName("fa-thumb-tack")[0];
            let status = await checkPin(id);
            if (!status) {
                await addPin(id);
                icon.classList.remove("buttonlet--plan");
                icon.classList.add("buttonlet--active-plan");
            } else {
                await removePin(id);
                icon.classList.remove("buttonlet--active-plan");
                icon.classList.add("buttonlet--plan");
            }
        }
        sibling.parentElement.insertBefore(newButton, sibling);
    }
}

const mutationObserver = new MutationObserver((mutation, observer) => {
    addButtons();
});

browser.storage.local.set({"fl-pins": new Set()}).then((r, e) => {
    mutationObserver.observe(document, { attributes: true, childList: true, subtree: true });
});

