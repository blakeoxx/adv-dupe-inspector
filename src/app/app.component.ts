import { ExpressionType } from './data-models/expression-type'
import { EdictCollectionComponent } from './components/edict-collection.component';
import { DataSectionCollection } from './data-models/data-section-collection';
import { ExpressionTypeService } from './services/expression-type.service';
import EdictTreeWorker from 'worker-loader!../edict-tree.worker';
import { EdictTreeWorkerRequest, EdictTreeWorkerSignaler } from '../edict-tree.worker';
import ClickEvent = JQuery.ClickEvent;
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export class AppComponent {
    private fileStatusMsg = {accepted: 'Ready to inspect', rejected: 'Parsing error', warning: 'Optimizations possible', loading: ''};
    private readonly edictTreeWorker: EdictTreeWorker;

    constructor() {
        this.edictTreeWorker = new EdictTreeWorker();

        // Run our setup routines when the document finishes loading
        $(() => { this.onDocumentLoaded(); })
    }

    onDocumentLoaded() {
        $('#fileupload input[type="file"]').on('change', (event) => { this.handleFileSelect(event); });
        $('body').on('drop', (event) => { this.handleFileDrop(event); })
            .on('dragover', (event) => { this.handleFileDragOver(event); });
        $('#filestatus').on('click', () => { this.toggleFileDetails(); });
    }

    loadFile(fileList: FileList)
    {
        // User selected no file
        if (fileList.length === 0) return;

        const file: File = fileList[0];
        if (file.type !== 'text/plain'){ this.updateFileStatus('rejected', [file.name+' is not a plaintext file (*.txt)']); return; }

        const reader = new FileReader();

        reader.onload = (res) => {
            if (!(res.target instanceof FileReader) || typeof res.target.result !== 'string')
            {
                this.updateFileStatus('rejected', ['The file could not be loaded as a file reader. Please check the file and try again.']);
            }
            else this.parseData(file.name, res.target.result);
        };
        reader.onerror = (res) => {
            if (!(res.target instanceof FileReader) || !(res.target.error instanceof DOMException))
            {
                this.updateFileStatus('rejected', ['The file reader returned an unknown error. Please check the file and try again.']);
            }
            else this.updateFileStatus('rejected', ['The file reader returned error code ' + res.target.error.name + '. '
                + 'Please check the file and try again.']);
        };

        this.updateFileStatus('loading');
        reader.readAsText(file);
    }

    parseData(filename: string, data: string)
    {
        // Standardize newlines and remove empty lines in case the user manually edited the file
        data = data.replace(/\r+\n/g, '\n').replace(/\n\s*\n/g, '\n');

        let parseWarnings: string[] = [];
        const dataSections = new DataSectionCollection();

        // Split the data by sections and populate the dataSections object
        const splits = data.split(/\n?^\[(.*)]$\n?/gm);
        if (splits[0].length > 0) parseWarnings.push('Data found before first section');
        for (let i = 1; i < splits.length; i+=2)
        {
            // Each section becomes a property of the dataSections object, whose value is an array of strings delimited by newlines
            const sectionName = splits[i];
            const sectionContents = splits[i+1];

            if (dataSections.isSectionSet(sectionName)) parseWarnings.push('Section "'+sectionName+'" was defined multiple times');
            else if (!dataSections.isSectionExpected(sectionName)) parseWarnings.push('Unrecognized section "'+sectionName+'"');

            const sectionSaveResult = dataSections.setSection(sectionName, sectionContents);
            sectionSaveResult.warnings.forEach((v) => parseWarnings.push('Section "'+sectionName+'" '+v));
        }

        // Check for expected data sections
        for (const expectedSection of dataSections.getExpectedSections())
        {
            if (dataSections.isSectionSet(expectedSection) === undefined)
            {
                this.updateFileStatus('rejected', ['Section "'+expectedSection+'" missing']);
                return;
            }
        }

        console.log('parsed data sections: ', dataSections);

        if (dataSections.Save.Entities === undefined)
        {
            this.updateFileStatus('rejected', ['Section "Save" missing entities']);
            return;
        }
        if (dataSections.Save.Constraints === undefined)
        {
            this.updateFileStatus('rejected', ['Section "Save" missing constraints']);
            return;
        }

        // Parse edicts
        const edictCollection = new EdictCollectionComponent();
        const entityWarnings = edictCollection.addEntitiesFromStringArray(dataSections.Save.Entities);
        const constraintWarnings = edictCollection.addConstraintsFromStringArray(dataSections.Save.Constraints);
        parseWarnings = parseWarnings.concat(entityWarnings, constraintWarnings);

        console.log('edict collection: ', edictCollection);

        // TODO: Dictionary validation

        // Edict value validation
        edictCollection.validateEdicts(dataSections.Dict);

        this.renderTreeView(filename, edictCollection);
        this.setupDetailsView(filename, dataSections, edictCollection);
        $('#treeview > details summary.fileitem').trigger('click');

        if (parseWarnings.length > 0)
        {
            this.updateFileStatus('warning', parseWarnings);
        }
        else this.updateFileStatus('accepted');
    }

    renderTreeView(filename: string, edictCollection: EdictCollectionComponent)
    {
        const treeview = $('#treeview > details');
        treeview.empty();
        treeview.prop('open', true);

        const fileitem = $('<summary class="fileitem inspectable"></summary>').text(filename);
        treeview.append(fileitem);

        // Build the entity list
        const entList = $('<details class="topnode listview"><summary>Entity List</summary></details>');
        edictCollection.getEntities().forEach((thisEntity) => {
            const thisItem = $('<div class="inspectable"></div>').text(thisEntity.getID()).attr('data-edictid', thisEntity.getID());
            entList.append(thisItem);
        });

        // Build the constraint list
        const constList = $('<details class="topnode listview"><summary>Constraint List</summary></details>');
        edictCollection.getConstraints().forEach((thisConstraint) => {
            const thisItem = $('<div class="inspectable"></div>').text(thisConstraint.getID()).attr('data-edictid', thisConstraint.getID());
            constList.append(thisItem);
        });

        const inspectableOnClick = (event: ClickEvent) => {
            event.stopPropagation();
            event.preventDefault();
            this.updateInspectionTarget($(event.target), true);
        };

        // Bind to inspectable element click events in the view and lists
        treeview.find('.inspectable').on('click', inspectableOnClick);
        entList.add(constList).find('.inspectable').on('click', inspectableOnClick);

        // Build the associative tree
        const assocTree = $('<details class="topnode assocview"><summary>Associative View</summary></details>');
        this.buildEdictTree(edictCollection)
            .subscribe(res => {
                // Add the built tree to the associative view container and bind to inspectable element click events
                assocTree.append(res);
                res.find('.inspectable').on('click', inspectableOnClick);
            });

        // Add the trees and lists to the view
        treeview.append(entList);
        treeview.append(constList);
        treeview.append(assocTree);
    }

    // Recursively builds an associative tree view from the given edict. The tree view is added to the given
    //  parent element. Returns an observable containing observables of child tree views.
    buildEdictTree(edictCollection: EdictCollectionComponent): Observable<JQuery>
    {
        const workerSignaler = new EdictTreeWorkerSignaler(this.edictTreeWorker);
        const returnable = workerSignaler.getResults().pipe(
            map(res => {
                console.log('tree worker progress: ' +
                    res.progressDone + '/' + (res.progressDone + res.progressLeft) +
                    (res.finished ? ' (complete)' : '')
                );
                return res;
            }),
            filter(res => res.finished),
            map(res => $(res.result))
        );

        workerSignaler.sendMessage(new EdictTreeWorkerRequest(edictCollection));

        return returnable;
    }

    // Set the details view data contexts for access when we try to render
    setupDetailsView(filename: string, dataSections: DataSectionCollection, edictCollection: EdictCollectionComponent)
    {
        $('#inspector')
            .data('filename', filename)
            .data('datasections', dataSections)
            .data('edictcollection', edictCollection);
    }

    showFileDetails()
    {
        const detailsview = $('#inspector');
        const detailsFilename: string = detailsview.data('filename') as string;
        const detailsDataSections: DataSectionCollection = detailsview.data('datasections') as DataSectionCollection;

        detailsview.empty();
        detailsview.append($('<h2></h2>').text(detailsFilename));

        let infosection: JQuery;
        let infolist: JQuery;
        infosection = $('<div><b>Info:</b><ul></ul></div>');
        infolist = infosection.find('ul');
        Object.entries(detailsDataSections.Info).forEach(([key, val]) => {
            infolist.append($('<li></li>').text(key+': '+val));
        });
        detailsview.append(infosection);

        infosection = $('<div><b>More Information:</b><ul></ul></div>');
        infolist = infosection.find('ul');
        Object.entries(detailsDataSections['More Information']).forEach(([key, val]) => {
            infolist.append($('<li></li>').text(key+': '+val));
        });
        detailsview.append(infosection);

        infosection = $('<div><b>Dictionary:</b><ul></ul></div>');
        infolist = infosection.find('ul');
        Object.entries(detailsDataSections.Dict).forEach(([key, val]) => {
            infolist.append($('<li></li>').text(key+': '+val));
        });
        detailsview.append(infosection);
    }

    // Shows the details view for the given edict. The isAssociative parameter is a boolean value to control the
    //  resulting view's handling of child edicts -- true will create links to the edict in the associative tree,
    //  false will create links to the edict in the list view
    showEdictDetails(edictID: string, isAssociative: boolean)
    {
        const detailsview = $('#inspector');
        const dictionary: Record<string, string> = detailsview.data('datasections').Dict as Record<string, string>;
        const edictCollection: EdictCollectionComponent = detailsview.data('edictcollection') as EdictCollectionComponent;
        const thisEdict = edictCollection.getEdict(edictID);

        detailsview.empty();
        const header = $('<h2></h2>').text('Edict '+edictID);
        detailsview.append(header);
        if (thisEdict === undefined){ header.text(header.text()+' (Undefined Edict)'); return; }
        else header.text(header.text()+' ('+(thisEdict.isEntity()?'Entity':'Constraint')+')');

        // Shortcut function for formatting the expression values in the loop
        const addFormattedExpr = (exprType: ExpressionType, origValue: string, targetElem: JQuery) => {
            const isValid = ExpressionTypeService.validatorFor(exprType).test(origValue);

            if (!isValid)
            {
                targetElem.addClass('expr-value-invalid');
                targetElem.text(origValue);
            }
            else if (exprType === ExpressionType.DICTIONARY || exprType === ExpressionType.DICTIONARY_ESCAPED)
            {
                if (dictionary[origValue] === undefined)
                {
                    targetElem.addClass('expr-value-notfound');
                    targetElem.text(origValue);
                }
                else targetElem.text(dictionary[origValue]);
            }
            else if (exprType === ExpressionType.TABLE)
            {
                if (edictCollection.getEdict(origValue) === undefined)
                {
                    targetElem.addClass('expr-value-notfound');
                    targetElem.text(origValue);
                }
                else
                {
                    const edictParam = origValue.replace(/['\\]/g, '\\$&');
                    const edictLink = $('<a href="#"></a>')
                        .text(origValue)
                        .on('click', () => { this.updateInspectionEdict(edictParam, isAssociative); });
                    targetElem.append(edictLink);
                }
            }
            else if (exprType === ExpressionType.ANGLE || exprType === ExpressionType.VECTOR)
            {
                const parts = origValue.match(ExpressionTypeService.validatorFor(exprType)) ?? [];
                targetElem.text('(' + parts[1] + ', ' + parts[2] + ', ' + parts[3] + ')');
            }
            else if (exprType === ExpressionType.BOOLEAN)
            {
                targetElem.text((origValue === 't' ? 'TRUE' : 'FALSE'));
            }
            else	// Everything else including string, player, and number values
            {
                targetElem.text(origValue);
            }
        };

        const infosection: JQuery = $('<div><b>Expressions:</b><table class="expr-list"></table></div>');
        const infolist: JQuery = infosection.find('table');
        const exprelem: JQuery = $('<tr><td><i class="bullet"></i><span class="lval"></span></td>' +
            '<td>=</td><td><span class="rval"></span></td></tr>');
        thisEdict.getExpressions().forEach((expr) => {
            const thisElem = exprelem.clone();
            const leftContainer = thisElem.find('.lval')
                .addClass(ExpressionTypeService.enumToCSSClass(expr.getLeftType()));
            const rightContainer = thisElem.find('.rval')
                .addClass(ExpressionTypeService.enumToCSSClass(expr.getRightType()));
            addFormattedExpr(expr.getLeftType(), expr.getLeftValue(), leftContainer);
            addFormattedExpr(expr.getRightType(), expr.getRightValue(), rightContainer);

            infolist.append(thisElem);
        });
        detailsview.append(infosection);
    }

    updateInspectionTarget(target: JQuery<any>, isClickEvent = false)
    {
        const collapseTarget: boolean = (isClickEvent && target.is('summary.inspecting') && !!target.closest('details').prop('open'));

        $('#treeview > details .inspecting').removeClass('inspecting');
        target.addClass('inspecting');
        if (target.hasClass('fileitem')) this.showFileDetails();
        else this.showEdictDetails((target.data('edictid') as string), target.hasClass('associative'));

        // Open any parent trees to the target
        target.parentsUntil('#treeview', 'details').prop('open', true);

        // Collapse the target if it was clicked while already opened and focused, and it's not a child div
        if (collapseTarget) target.closest('details').prop('open', false);

        // Scroll the tree view to show the target
        const treeView: JQuery = $('#treeview');
        const viewCeiling = treeView.scrollTop() as number;
        const viewFloor = viewCeiling + (treeView.height() as number);
        const targetCeiling = target.position().top;
        const targetFloor = target.position().top + (target.height() as number);
        if (targetCeiling < viewCeiling) treeView.scrollTop(targetCeiling);
        else if (targetFloor > viewFloor) treeView.scrollTop(targetFloor - (treeView.height() as number));
    }

    updateInspectionEdict(edictID: string, isAssociative: boolean)
    {
        let targetElem = null;
        if (isAssociative)
        {
            const inspected = $('#treeview > details .inspecting');
            let foundelem = inspected.closest('details').find('.inspectable[data-edictid="'+edictID+'"]');
            if (foundelem.length === 0)
            {
                const ancestors = inspected.parentsUntil('#treeview', 'details');
                let parentIndex = 0;
                while (foundelem.length === 0 && parentIndex < ancestors.length)
                {
                    foundelem = ancestors.eq(parentIndex++).find('.inspectable[data-edictid="'+edictID+'"]');
                }
            }

            if (foundelem.length > 0) targetElem = foundelem.first();
        }
        else
        {
            const foundelem = $('#treeview > details .listview .inspectable[data-edictid="'+edictID+'"]');
            if (foundelem.length > 0) targetElem = foundelem.first();
        }

        if (targetElem == null) return false;
        else
        {
            this.updateInspectionTarget(targetElem);
            return true;
        }
    }

    updateFileStatus(status: 'accepted'|'rejected'|'warning'|'loading', details: string[] = [])
    {
        $('#filestatus').removeClass().addClass(status);
        $('#filestatus .label').text(this.fileStatusMsg[status]);

        // Show details in UI
        const detailsElem = $('#filedetails');
        detailsElem.html('');
        details.forEach(v => {
            detailsElem.append($('<p class="detail-message"></p>').text(v));
        });
        if (details.length === 0) detailsElem.append('<p>(No details available)</p>');
    }

    handleFileSelect(event: JQuery.ChangeEvent)
    {
        // The change event for file input elements includes a `files` property not part of the EventTarget interface.
        //  So we create a new intersection type to make TypeScript happy
        type FileSelectedEventTarget = EventTarget & {files?: FileList};
        const target: FileSelectedEventTarget = event.originalEvent?.target as FileSelectedEventTarget;
        this.loadFile(target?.files ?? new FileList());
    }

    handleFileDrop(event: JQuery.DropEvent)
    {
        event.stopPropagation();
        event.preventDefault();
        this.loadFile(event.originalEvent?.dataTransfer?.files ?? new FileList());
    }

    handleFileDragOver(event: JQuery.DragOverEvent)
    {
        event.stopPropagation();
        event.preventDefault();
        if (event.originalEvent?.dataTransfer?.dropEffect) event.originalEvent.dataTransfer.dropEffect = 'copy';
    }

    toggleFileDetails(show?: boolean)
    {
        const elem = $('#filedetails');
        if (show === undefined) show = elem.hasClass('hidden');

        if (show) elem.removeClass('hidden');
        else elem.addClass('hidden');
    }
}
