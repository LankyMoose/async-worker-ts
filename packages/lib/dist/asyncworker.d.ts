export declare class AsyncWorker {
    worker: Worker;
    constructor();
    postMessage(message: string): void;
    onMessage(callback: (message: string) => void): void;
    terminate(): void;
}
