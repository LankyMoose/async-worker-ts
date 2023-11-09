import { deserializeProcMap, getProc, getProcMapScope, } from "./worker-shared.js";
let didInit = false;
let procMap = {};
onmessage = async (e) => {
    if (!e.data)
        return;
    if (!didInit) {
        procMap = deserializeProcMap(e.data);
        didInit = true;
        postMessage("initialized");
        return;
    }
    const { id, path, args } = e.data;
    if ("yield" in e.data)
        return;
    if ("result" in e.data)
        return;
    const scope = path.includes(".") ? getProcMapScope(procMap, path) : procMap;
    try {
        // @ts-expect-error
        globalThis.reportProgress = (progress) => postMessage({ id, progress });
        // @ts-expect-error
        globalThis._____yield = async (value) => {
            postMessage({ id, yield: value });
            return new Promise((resolve) => {
                const handler = async (event) => {
                    if (!("yield" in event.data) && !("result" in event.data))
                        return;
                    const { id: responseId, yield: yieldInputValue, result } = event.data;
                    if (responseId !== id)
                        return;
                    removeEventListener("message", handler);
                    if ("result" in event.data)
                        return resolve(result);
                    resolve(yieldInputValue);
                };
                addEventListener("message", handler);
            });
        };
        const result = await getProc(procMap, path).bind(scope)(...args);
        postMessage({ id, result });
    }
    catch (error) {
        postMessage({ id, error });
    }
};
