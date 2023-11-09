export const AWT_DEBUG_GENERATED_SRC = false;
export function customGenerator(sourceCode) {
    const yieldRegex = /yield\s+([^;\n]+)(?=[;\n])/g; // Regex to find 'yield' statements
    let newSrc = transformFunc(sourceCode);
    if (newSrc.substring(0, "async ".length) !== "async ") {
        newSrc = `async ${newSrc}`;
    }
    if (newSrc.startsWith("async function*")) {
        newSrc = newSrc.replace("async function*", "async function");
    }
    let match;
    while ((match = yieldRegex.exec(newSrc)) !== null) {
        // Extract values from the 'yield' statements
        const offset = match.index;
        const len = match[0].length;
        const value = match[1];
        newSrc =
            newSrc.slice(0, offset) +
                `await _____yield(${value})` +
                newSrc.slice(offset + len, newSrc.length);
    }
    return newSrc;
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
export function transformFunc(str) {
    str = str.trim();
    const fn_name_internal = "___thunk___";
    let isGenerator = false;
    if (str.startsWith("function (")) {
        str = str.replace("function (", `function ${fn_name_internal}(`);
    }
    else if (str.startsWith("async function (")) {
        str = str.replace("async function (", `async function ${fn_name_internal}(`);
    }
    else if (str.startsWith("function* (")) {
        str = str.replace("function* (", `function* ${fn_name_internal}(`);
        isGenerator = true;
    }
    else if (str.startsWith("async function* (")) {
        str = str.replace("async function* (", `async function* ${fn_name_internal}(`);
        isGenerator = true;
    }
    if (isGenerator)
        str = customGenerator(str);
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
