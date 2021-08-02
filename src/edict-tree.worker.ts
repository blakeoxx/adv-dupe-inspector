import EdictTreeWorker from 'worker-loader!../edict-tree.worker';
import { Observable, Subject } from 'rxjs';
import { EdictCollectionComponent } from './app/components/edict-collection.component';
import { Edict } from './app/data-models/edict';
import { ExpressionType } from './app/data-models/expression-type';
import { deserialize, object, serializable, serialize } from 'serializr';

class EdictTreeWorkerProcessor {
    private queue: {edict: Edict | undefined, view: JQuery, ancestors: string[]}[];
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
        this.queue.push({
            edict: this.edictCollection.getHeadEntity(),
            view: this.resultTreeView,
            ancestors: []
        });
        this.queue.push({
            edict: this.edictCollection.getHeadConstraint(),
            view: this.resultTreeView,
            ancestors: []
        });

        this.sendProgressMessage();
        const progressUpdater = setInterval(() => { this.sendProgressMessage(); }, 250);
        while (this.queue.length > 0) {
            type queueItemType = typeof EdictTreeWorkerProcessor.prototype.queue[number];
            const {edict, view, ancestors} = this.queue.shift() as queueItemType;
            this.buildEdictTree(edict, view, ancestors);
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
            progressDone: this.completionCount,
            progressLeft: 0,
            result: this.resultTreeView.html()
        } as EdictTreeWorkerResponse);
    }

    buildEdictTree(currentEdict: Edict | undefined, parentElem: JQuery, ancestorIDs: string[]) {
        if (currentEdict === undefined)
        {
            parentElem.append($('<div>(undefined edict)</div>'));
            return;
        }

        const thisEdictID = currentEdict.getID();

        // Don't rebuild trees for previously seen edicts. These circular references cause infinite loops
        const isOwnAncestor = ancestorIDs.includes(thisEdictID);
        ancestorIDs.push(thisEdictID);

        let label = thisEdictID;
        if (currentEdict === this.edictCollection.getHeadEntity()) label += ' (head entity)';
        else if (currentEdict === this.edictCollection.getHeadConstraint()) label += ' (head constraint)';
        else if (isOwnAncestor) label += ' (circular)';

        // Create the display item without children, in case we need it
        const displayItemWithoutChildren: JQuery = $('<div class="inspectable associative"></div>')
            .text(label)
            .attr('data-edictid', thisEdictID);

        // Create the display item with children, in case we need it
        const displayItemWithChildren: JQuery = $('<details></details>')
            .append(
                $('<summary class="inspectable associative"></summary>')
                    .text(label)
                    .attr('data-edictid', thisEdictID)
            );

        // Skip adding children if this is a circular reference
        if (isOwnAncestor)
        {
            console.log('circular reference detected. Ancestors:', ancestorIDs);
            parentElem.append(displayItemWithoutChildren);
            return;
        }

        let hasChildren = false;
        currentEdict.getExpressions().forEach((expr) => {
            if (expr.getLeftType() === ExpressionType.TABLE)
            {
                this.queue.push({
                    edict: this.edictCollection.getEdict(expr.getLeftValue()),
                    view: displayItemWithChildren,
                    ancestors: [...ancestorIDs]
                });
                hasChildren = true;
            }
            if (expr.getRightType() === ExpressionType.TABLE)
            {
                this.queue.push({
                    edict: this.edictCollection.getEdict(expr.getRightValue()),
                    view: displayItemWithChildren,
                    ancestors: [...ancestorIDs]
                });
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
if (typeof WorkerGlobalScope !== 'undefined' && workerContext instanceof WorkerGlobalScope) {
    // Create a window and JQuery instance since we don't have those in the worker
    const FakeWindow = require('domino-ext').createWindow('<html lang="en"></html>', 'https://www.subnetroot.com') as Window;
    // @ts-ignore
    workerContext.$ = require('jquery')(FakeWindow) as JQueryStatic;

    // Listen for incoming messages
    workerContext.addEventListener('message', (event: MessageEvent<EdictTreeWorkerRequest>) => {
        const hydratedRequest = deserialize(EdictTreeWorkerRequest, event.data);
        const worker = new EdictTreeWorkerProcessor(hydratedRequest.edictCollection, workerContext);
        worker.process();
    });
}


// Interfacing class for keeping type safety of messages, since we can't apply typings to the messaging API directly
export class EdictTreeWorkerSignaler {
    private readonly targetWorker: EdictTreeWorker;
    private resultPump = new Subject<EdictTreeWorkerResponse>();

    constructor(targetWorker: EdictTreeWorker) {
        this.targetWorker = targetWorker;
        // Setup a listener for result messages from the worker
        targetWorker.onmessage = (ev: MessageEvent<EdictTreeWorkerResponse>) => {
            this.resultPump.next(ev.data);
            if (ev.data.finished) {
                this.resultPump.complete();
            }
        };
    }

    sendMessage(v: EdictTreeWorkerRequest) {
        this.targetWorker.postMessage(serialize(v));
    }

    getResults(): Observable<EdictTreeWorkerResponse> {
        return this.resultPump.asObservable();
    }
}

export class EdictTreeWorkerRequest {
    @serializable(object(EdictCollectionComponent))
    edictCollection: EdictCollectionComponent;

    constructor(edictCollection: EdictCollectionComponent) {
        this.edictCollection = edictCollection;
    }
}

export interface EdictTreeWorkerResponse {
    finished: boolean;
    progressDone: number;
    progressLeft: number;
    result: string;
}
