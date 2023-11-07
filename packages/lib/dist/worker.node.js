import { isMainThread, workerData, parentPort, } from "node:worker_threads";
const customThis = "________this________";
if (!isMainThread && parentPort) {
    const procMap = deserializeProcMap(workerData);
    parentPort.on("message", async ({ id, path, args }) => {
        // @ts-ignore
        globalThis[customThis] = procMap;
        if (path.includes(".")) {
            // set our custom this to the parent object based on path
            const keys = path.split(".");
            keys.pop();
            // @ts-ignore
            globalThis[customThis] = keys.reduce((acc, key) => acc[key], procMap);
        }
        const pp = parentPort;
        try {
            // @ts-expect-error
            globalThis.reportProgress = (progress) => pp.postMessage({ data: { id, progress } });
            const result = await getProc(path)(...args);
            pp.postMessage({ data: { id, result } });
        }
        catch (error) {
            pp.postMessage({ data: { id, error } });
        }
    });
    function getProc(path) {
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
}
function deserializeProcMap(procMap) {
    return Object.entries(procMap).reduce((acc, [key, value]) => {
        acc[key] =
            typeof value === "string" ? parseFunc(value) : deserializeProcMap(value);
        return acc;
    }, {});
}
function parseFunc(str) {
    str = str
        .replaceAll(" this.", " " + customThis + ".")
        .replaceAll("(this.", "(" + customThis + ".")
        .replaceAll("[this.", "[" + customThis + ".");
    const unnamedFunc = "function (";
    const asyncUnnamedFunc = "async function (";
    if (str.substring(0, unnamedFunc.length) === unnamedFunc) {
        return eval(`(${str.replace(unnamedFunc, "function thunk(")})`);
    }
    if (str.substring(0, asyncUnnamedFunc.length) === asyncUnnamedFunc) {
        return eval(`(${str.replace(asyncUnnamedFunc, "async function thunk(")})`);
    }
    return eval(`(${str})`);
}
