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
    const { id, path, args, isTask } = e.data;
    if (!("path" in e.data))
        return;
    const scope = isTask
        ? createTaskScope(postMessage, (event, handler) => removeEventListener(event, handler), (event, handler) => addEventListener(event, handler))
        : path.includes(".")
            ? getProcMapScope(procMap, path)
            : procMap;
    try {
        const result = await getProc(procMap, path).bind(scope)(...args);
        postMessage({ id, result });
    }
    catch (error) {
        postMessage({ id, error });
    }
};
