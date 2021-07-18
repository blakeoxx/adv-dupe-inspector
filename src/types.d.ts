// Needed for Typescript to recognize our web worker
declare module 'worker-loader!*' {
    class WebpackWorker extends Worker {
        constructor();
    }

    export default WebpackWorker;
}
