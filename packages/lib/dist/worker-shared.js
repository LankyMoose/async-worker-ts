export const AWT_DEBUG_GENERATED_SRC = false;
const isNode = typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;
export function createTaskScope(postMessage, removeListener, addListener) {
    try {
        return {
            emit: (event, data) => {
                const msgId = crypto.randomUUID();
                return new Promise((resolve) => {
                    const handler = async (event) => {
                        const d = isNode ? event : event.data;
                        if (!("data" in d))
                            return;
                        const { id: responseId, data } = d;
                        if (responseId !== msgId)
                            return;
                        removeListener("message", handler);
                        resolve(data);
                    };
                    addListener("message", handler);
                    postMessage({ id: msgId, event, data });
                });
            },
        };
    }
    catch (error) {
        throw error;
    }
}
export function getProc(procMap, path) {
    const keys = path.split(".");
    let map = procMap;
    while (keys.length) {
        const k = keys.shift();
        if (!map[k])
            throw new Error(`No procedure found: "${path}"`);
        map = map[k];
        if (typeof map === "function")
            return map;
    }
    throw new Error(`No procedure found: "${path}"`);
}
export function deserializeProcMap(procMap) {
    return Object.entries(procMap).reduce((acc, [key, value]) => {
        acc[key] =
            typeof value === "string" ? parseFunc(value) : deserializeProcMap(value);
        return acc;
    }, {});
}
export function parseFunc(str) {
    const transformed = transformFunc(str);
    return eval(`(${transformed})`);
}
function replaceIfStartsWith([str], search, replace) {
    if (str.startsWith(search)) {
        str = str.replace(search, replace);
        return true;
    }
    return false;
}
export function transformFunc(str) {
    str = str.trim();
    const fn_name_internal = "___thunk___";
    let isGenerator = false;
    replaceIfStartsWith([str], "function (", `function ${fn_name_internal}(`);
    replaceIfStartsWith([str], "async function (", `async function ${fn_name_internal}(`);
    isGenerator = replaceIfStartsWith([str], "function* (", `function* ${fn_name_internal}(`);
    isGenerator =
        replaceIfStartsWith([str], "async function* (", `async function* ${fn_name_internal}(`) || isGenerator;
    if (AWT_DEBUG_GENERATED_SRC)
        console.debug(str);
    return str;
}
export function getProcMapScope(procMap, path) {
    const keys = path.split(".");
    keys.pop();
    // @ts-ignore
    return keys.reduce((acc, key) => acc[key], procMap);
}
