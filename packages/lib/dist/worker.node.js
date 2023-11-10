import { isMainThread, workerData, parentPort } from "node:worker_threads";
import { deserializeProcMap, getProc, getProcMapScope, createTaskScope, } from "./worker-shared.js";
if (!isMainThread && parentPort) {
    const procMap = deserializeProcMap(workerData);
    const postMessage = (data) => parentPort?.postMessage({ data });
    parentPort.on("message", async (e) => {
        const { id, path, args, isTask } = e;
        if (!("path" in e))
            return;
        const scope = isTask
            ? createTaskScope(postMessage, (event, handler) => parentPort.removeListener(event, handler), (event, handler) => parentPort.addListener(event, handler))
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
    });
}
