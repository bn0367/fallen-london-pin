// sort in tab-content__bordered-container

// requests:
/**
 * storylet
 * goback
 * begin
 */

let PINS = [];

let LOCKED = false;

let UPDATED = true;

let MAX_RETRY = 2;

/*const mutationObserver = new MutationObserver((mutations, observer) => {
    sortStorylets();
    addButtons();
});*/

function request_listener(details) {
    console.log("listened");
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();
    filter.ondata = event => {
        let str = decoder.decode(event.data, { stream: true });
        console.log(str);
        filter.write(encoder.encode(str));
        filter.disconnect();
    }

    return {};
}

browser.webRequest.onBeforeRequest.addListener(request_listener, { urls: ["https://api.fallenlondon.com/*"], types: ["main_frame"] });
console.log("did load");
async function sortStorylets() {
    mutationObserver.disconnect();
    let pins = await browser.storage.local.get("fl-pins");
    pins = pins["fl-pins"];
    let containers = document.getElementsByClassName("tab-content__bordered-container");
    if (containers.length < 1) {
        return;
    }
    let allChildren = Array.from(containers[0].childNodes);
    let reordered = [];
    let postamble = [];
    reordered.push(allChildren.shift());
    reordered.push(allChildren.shift());
    for (let child of allChildren) {
        let id = child.attributes["data-branch-id"].nodeValue;
        if (pins.has(id)) {
            reordered.push(child);
        } else {
            postamble.push(child);
        }
    }
    reordered = reordered.concat(postamble);
    document.getElementsByClassName("tab-content__bordered-container")[0].replaceChildren(...reordered);
    mutationObserver.observe(document, { childList: true, subtree: true });
}

async function removePin(id, retry = 0) {
    if (retry === MAX_RETRY) {
        return;
    }
    if (!LOCKED) {
        LOCKED = true;
        UPDATED = true;
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
        UPDATED = true;
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

let cache = new Set();

async function checkPin(id) {
    if (UPDATED) {
        UPDATED = false;
        let pins = await browser.storage.local.get("fl-pins");
        if (!("fl-pins" in pins)) {
            return false;
        }
        cache = pins["fl-pins"];
        return cache.has(id);
    } else {
        return cache.has(id);
    }

}

async function addButtons() {
    let existingButtons = document.getElementsByClassName("fa-thumb-tack");
    if (existingButtons.length > 0) {
        return;
    }
    let buttonSiblings = document.querySelectorAll(".branch__title, .storylet__heading");

    for (let sibling of buttonSiblings) {
        let newButton = document.createElement("div");
        let id = sibling.parentElement.parentElement.parentElement.attributes["data-branch-id"].nodeValue;
        let initialStatus = await checkPin(id);
        newButton.className = "branch__plan-buttonlet";
        newButton.innerHTML = `<button aria-label="Pin this storylet" class="buttonlet-container" type="button"><span class="buttonlet fa-stack fa-lg buttonlet-enabled  buttonlet-plan" title="Pin this storylet"><span class="fa fa-circle fa-stack-2x"></span><span class="fa fa-inverse fa-stack-1x fa-thumb-tack buttonlet--${initialStatus ? "active-" : ""}plan"></span><span class="u-visually-hidden">plan</span></span></button>`;
        newButton.onclick = async () => {
            let icon = newButton.getElementsByClassName("fa-thumb-tack")[0];
            let status = await checkPin(id);
            if (!status) {
                await addPin(id);
                icon.classList.remove("buttonlet--plan");
                icon.classList.add("buttonlet--active-plan");
                sortStorylets();
            } else {
                await removePin(id);
                icon.classList.remove("buttonlet--active-plan");
                icon.classList.add("buttonlet--plan");
                sortStorylets();
            }
        }
        sibling.parentElement.insertBefore(newButton, sibling);
    }
}


browser.storage.local.get("fl-pins").then((r, e) => {
    if (!("fl-pins" in r)) {
        browser.storage.local.set({ "fl-pins": new Set() });
    }
})

mutationObserver.observe(document, { childList: true, subtree: true });