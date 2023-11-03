declare function useWorker<T>(fn: {
    (...args: any[]): Promise<T>;
}): Promise<T>;
export default useWorker;
