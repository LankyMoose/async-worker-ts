import { deserializeProcMap, getProc, getProcMapScope, createTaskScope, } from "./worker-shared.js";
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
    if (!("path" in e.data))
        return;
    const { id, path, args, isTask } = e.data;
    const scope = isTask
        ? createTaskScope(postMessage, (event, handler) => removeEventListener(event, handler), (event, handler) => addEventListener(event, handler))
        : path.includes(".")
            ? getProcMapScope(procMap, path)
            : procMap;
    try {
        const fn = getProc(procMap, path);
        const result = await fn.bind(scope)(...args);
        if (result &&
            result[Symbol.toStringTag]?.toString().includes("Generator")) {
            const generator = result;
            const handler = async (event) => {
                if (!("next" in event.data) &&
                    !("return" in event.data) &&
                    !("throw" in event.data))
                    return;
                const { id: responseId } = event.data;
                if (responseId !== id)
                    return;
                const key = "next" in event.data
                    ? "next"
                    : "return" in event.data
                        ? "return"
                        : "throw";
                const res = await generator[key](event.data[key]);
                postMessage({ id, [key]: res.value, done: res.done });
                if (key === "throw" || key === "return")
                    removeEventListener("message", handler);
            };
            addEventListener("message", handler);
            postMessage({ id, generator: true });
            return;
        }
        postMessage({ id, result });
    }
    catch (error) {
        postMessage({ id, error });
    }
};
