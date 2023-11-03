import { isMainThread, workerData, parentPort, } from "node:worker_threads";
if (!isMainThread && parentPort) {
    const procMap = deserializeProcMap(workerData);
    parentPort.on("message", async ({ id, key, args }) => {
        const pp = parentPort;
        try {
            const result = await procMap[key](...args);
            pp.postMessage({ data: { id, result } });
        }
        catch (error) {
            pp.postMessage({ data: { id, error } });
        }
    });
}
function deserializeProcMap(serializedProcMap) {
    return Object.entries(serializedProcMap).reduce((acc, [key, value]) => {
        acc[key] = eval(`(${value})`);
        return acc;
    }, {});
}
