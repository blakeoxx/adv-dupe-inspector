import EdictTreeWorker from 'worker-loader!../edict-tree.worker';
import { Observable, Subject } from 'rxjs';
import { EdictCollectionComponent } from './app/components/edict-collection.component';
import { Edict } from './app/data-models/edict';
import { ExpressionType } from './app/data-models/expression-type';
import * as domino from 'domino';

const FakeWindow: Window = domino.createWindow('<html></html>', 'https://www.subnetroot.com');
const FakeDocument: Document = FakeWindow.document;

const $: JQueryStatic = require('jquery')(FakeWindow) as JQueryStatic;

class EdictTreeWorkerProcessor {
    private queue: {edict: Edict | undefined, view: JQuery}[];
    private completionCount: number;
    private readonly resultTreeView: JQuery;
    private readonly edictCollection: EdictCollectionComponent;
    private readonly parentWorker: Worker;

    constructor(edictCollection: EdictCollectionComponent, parentWorker: Worker) {
        this.queue = [];
        this.completionCount = 0;
        this.resultTreeView = $('<div></div>');
        this.edictCollection = edictCollection;
        this.parentWorker = parentWorker;
    }

    process() {
        this.queue.push({edict: this.edictCollection.getHeadEntity(), view: this.resultTreeView});
        this.queue.push({edict: this.edictCollection.getHeadConstraint(), view: this.resultTreeView});
        this.sendProgressMessage();
        const progressUpdater = setInterval(() => { this.sendProgressMessage(); }, 500);
        while (this.queue.length > 0) {
            type queueItemType = typeof EdictTreeWorkerProcessor.prototype.queue[number];
            const {edict, view} = this.queue.shift() as queueItemType;
            this.buildEdictTree(edict, view);
            this.completionCount++;
        }
        clearInterval(progressUpdater);
        this.sendCompletionMessage();
    }

    sendProgressMessage() {
        this.parentWorker.postMessage({
            finished: false,
            progressDone: this.completionCount,
            progressLeft: this.queue.length,
            result: 'working'
        } as EdictTreeWorkerResponse);
    }

    sendCompletionMessage() {
        this.parentWorker.postMessage({
            finished: true,
            progressDone: 0,
            progressLeft: 0,
            result: this.resultTreeView.html()
        } as EdictTreeWorkerResponse);
    }

    buildEdictTree(currentEdict: Edict | undefined, parentElem: JQuery) {
        if (currentEdict === undefined)
        {
            parentElem.append($('<div>(undefined edict)</div>'));
            return;
        }

        let label = currentEdict.getID();
        if (currentEdict === this.edictCollection.getHeadEntity()) label += ' (head entity)';
        else if (currentEdict === this.edictCollection.getHeadConstraint()) label += ' (head constraint)';

        // Create the display item without children, in case we need it
        const displayItemWithoutChildren: JQuery = $('<div class="inspectable associative"></div>')
            .text(label)
            .attr('data-edictid', currentEdict.getID());

        // Create the display item with children, in case we need it
        const displayItemWithChildren: JQuery = $('<details></details>')
            .append(
                $('<summary class="inspectable associative"></summary>')
                    .text(label)
                    .attr('data-edictid', currentEdict.getID())
            );

        let hasChildren = false;
        currentEdict.getExpressions().forEach((expr) => {
            if (expr.getLeftType() === ExpressionType.TABLE)
            {
                this.queue.push({edict: this.edictCollection.getEdict(expr.getLeftValue()), view: displayItemWithChildren});
                hasChildren = true;
            }
            if (expr.getRightType() === ExpressionType.TABLE)
            {
                this.queue.push({edict: this.edictCollection.getEdict(expr.getRightValue()), view: displayItemWithChildren});
                hasChildren = true;
            }
        });

        if (!hasChildren) {
            parentElem.append(displayItemWithoutChildren);
        }
        else {
            parentElem.append(displayItemWithChildren);
        }
    }
}


// Web worker setup
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const workerContext: Worker = self as any;

workerContext.addEventListener('message', (event: MessageEvent<EdictTreeWorkerRequest>) => {
    event.data.edictCollection = Object.assign(new EdictCollectionComponent(), event.data.edictCollection);
    const worker = new EdictTreeWorkerProcessor(event.data.edictCollection, workerContext);
    worker.process();
});


// Interfacing class for keeping type safety of messages, since we can't apply typings to the messaging API directly
export class EdictTreeWorkerSignaler {
    private readonly targetWorker: EdictTreeWorker;
    private resultPump = new Subject<EdictTreeWorkerResponse>();

    constructor(targetWorker: EdictTreeWorker) {
        this.targetWorker = targetWorker;
        targetWorker.onmessage = (ev: MessageEvent<EdictTreeWorkerResponse>) => {
            this.resultPump.next(ev.data);
            if (ev.data.finished) {
                this.resultPump.complete();
            }
        };
    }

    sendMessage(v: EdictTreeWorkerRequest) {
        this.targetWorker.postMessage(v);
    }

    getResults(): Observable<EdictTreeWorkerResponse> {
        return this.resultPump.asObservable();
    }
}

export interface EdictTreeWorkerRequest {
    edictCollection: EdictCollectionComponent;
}

export interface EdictTreeWorkerResponse {
    finished: boolean;
    progressDone: number;
    progressLeft: number;
    result: string;
}
