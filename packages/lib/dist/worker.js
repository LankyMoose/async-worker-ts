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
        // check if the fn is a generator
        if (result &&
            result[Symbol.toStringTag]?.toString().includes("Generator")) {
            const generator = result;
            const handler = async (event) => {
                if (!("next" in event.data) &&
                    !("return" in event.data) &&
                    !("throw" in event.data))
                    return;
                const { id: responseId, next: nextValue, return: returnValue, throw: throwValue, } = event.data;
                if (responseId !== id)
                    return;
                if ("throw" in event.data) {
                    const res = await generator.throw(throwValue);
                    postMessage({ id, throw: res.value, done: res.done });
                    removeEventListener("message", handler);
                    return;
                }
                if ("return" in event.data) {
                    const res = await generator.return(returnValue);
                    postMessage({ id, return: res.value, done: res.done });
                    removeEventListener("message", handler);
                    return;
                }
                const { value, done } = await generator.next(nextValue);
                postMessage({ id, yield: value, done });
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
