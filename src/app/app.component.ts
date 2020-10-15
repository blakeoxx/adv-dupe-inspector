import { ExpressionType } from './data-models/expression-type'
import { StringEncoderService } from './services/string-encoder.service';
import { EdictCollectionComponent } from './components/edict-collection.component';

export class AppComponent {
    private fileStatusMsg = {accepted: 'Ready to inspect', rejected: 'Parsing error', warning: 'Optimizations possible'};

    constructor() {
        // Run our setup routines when the document finishes loading
        $(() => { this.onDocumentLoaded(); })
    }

    onDocumentLoaded() {
        $('#fileupload input[type="file"]').on('change', (event) => { this.handleFileSelect(event); });
        $('body').on('drop', (event) => { this.handleFileDrop(event); })
            .on('dragover', (event) => { this.handleFileDragOver(event); });
    }

    loadFile(fileList)
    {
        // User selected no file
        if (fileList.length == 0) return;

        const file = fileList[0];
        if (file.type != 'text/plain'){ updateFileStatus('rejected', file.name+' is not a plaintext file (*.txt)'); return; }

        const reader = new FileReader();

        reader.onload = (res) => { parseData(file.name, res.target.result); };
        reader.onerror = (res) => { updateFileStatus('rejected', 'The file reader returned error code '+res.target.error.code+'. Please check the file and try again.'); };

        updateFileStatus('loading', '');
        reader.readAsText(file);
    }

    parseData(filename, data)
    {
        // Standardize newlines and remove empty lines in case the user manually edited the file
        data = data.replace(/\r+\n/g, '\n').replace(/\n\s*\n/g, '\n');

        let parseWarnings = [];
        const dataSections = {};
        const expectedDataSections = ['Info', 'More Information', 'Save', 'Dict'];

        // Split the data by sections and populate the dataSections object
        const splits = data.split(/\n?^\[(.*)\]$\n?/gm);
        if (splits[0].length > 0) parseWarnings.push('Data found before first section');
        for (var i = 1; i < splits.length; i+=2)
        {
            // Each section becomes a property of the dataSections object, whose value is an array of strings delimited by newlines
            if (dataSections[splits[i]] !== undefined) parseWarnings.push('Section "'+splits[i]+'" was defined multiple times');
            else if (expectedDataSections.indexOf(splits[i]) < 0) parseWarnings.push('Unrecognized section "'+splits[i]+'"');
            dataSections[splits[i]] = splits[i+1].split('\n');
        }

        // Check for expected data sections
        for (var i = 0; i < expectedDataSections.length; i++)
        {
            if (dataSections[expectedDataSections[i]] === undefined)
            {
                updateFileStatus('rejected', 'Section "'+expectedDataSections[i]+'" missing');
                return;
            }
        }

        // Convert data section values from arrays of strings into key-value pairs
        expectedDataSections.forEach((section) => {
            const kvs = stringArrayToKV(dataSections[section]);
            dataSections[section] = kvs.result;
            kvs.warnings.forEach((v) => parseWarnings.push('Section "'+section+'" '+v));
        });

        console.log('parsed data sections: ', dataSections);

        if (dataSections.Save.Entities === undefined){ updateFileStatus('rejected', 'Section "Save" missing entities'); return; }
        if (dataSections.Save.Constraints === undefined){ updateFileStatus('rejected', 'Section "Save" missing constraints'); return; }

        // Break edicts into string arrays for parsing
        let edictResult = edictStringToStringArray(dataSections.Save.Entities);
        dataSections.Save.Entities = edictResult.result;
        edictResult.warnings.forEach((v) => parseWarnings.push('Entities '+v));
        edictResult = edictStringToStringArray(dataSections.Save.Constraints);
        dataSections.Save.Constraints = edictResult.result;
        edictResult.warnings.forEach((v) => parseWarnings.push('Constraints '+v));

        // Parse edicts
        const edictCollection = new EdictCollectionComponent();
        const entityWarnings = edictCollection.addEntitiesFromStringArray(dataSections.Save.Entities);
        const constraintWarnings = edictCollection.addConstraintsFromStringArray(dataSections.Save.Constraints);
        parseWarnings = parseWarnings.concat(entityWarnings, constraintWarnings);

        console.log('edict collection: ', edictCollection);

        // TODO: Dictionary validation

        // Edict value validation
        edictCollection.validateEdicts(dataSections.Dict);

        renderTreeView(filename, edictCollection);
        setupDetailsView(filename, dataSections, edictCollection);
        $('#treeview > details summary.fileitem').click();

        if (parseWarnings.length > 0) updateFileStatus('warning', parseWarnings.map(x => StringEncoderService.encodeHTML(x)).join('<br>'));
        else updateFileStatus('accepted', '');
    }

    // Takes an array of strings formatted as "key:value", and returns an object{result, warnings[]}. Object.result has properties named after keys holding values without surrounding quotes
    stringArrayToKV(arr)
    {
        const result = {result:{}, warnings:[]};
        arr.forEach((str) => {
            let splitIdx = str.indexOf(':');
            if (splitIdx < 0 || splitIdx == str.length-1){ result.warnings.push('Key "'+str+'" has no value'); splitIdx = (splitIdx<0?str.length:splitIdx); }
            else if (splitIdx == 0) result.warnings.push('Value "'+str+'" has no key');

            const key = str.slice(0, splitIdx);
            const val = str.slice(splitIdx+1);
            if (result.result[key] !== undefined) result.warnings.push('Key "'+key+'" was defined multiple times');
            result.result[key] = val.replace(/(^\")|(\"$)/g, '');
        });
        return result;
    }

    // Takes a string formatted as "A{type:value;...;}B{type:value;...;}", and returns an object{result[], warnings[]}. Object.result is an array of strings formatted as ["A{type:value;...;}", "B{type:value;...;}"]
    edictStringToStringArray(str)
    {
        const result = {result:[], warnings:[]};
        result.result = str.match(/.+?{.*?}/g);
        if (result.result == null){ result.result = [str]; result.warnings.push('Edict string contained no edicts'); }

        // Include a parse warning if we didn't match the entire string
        let totalLength = 0;
        result.result.forEach((v) => totalLength+=v.length);
        if (totalLength < str.length) result.warnings.push('Edict string contained some junk data, which we removed');

        return result;
    }

    renderTreeView(filename, edictCollection)
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

        // Build the associative tree
        const assocTree = $('<details class="topnode assocview"><summary>Associative View</summary></details>');
        assocTree.append(buildEdictTree(edictCollection, edictCollection.getHeadEntity()));
        assocTree.append(buildEdictTree(edictCollection, edictCollection.getHeadConstraint()));

        // Add the trees and lists to the view
        treeview.append(entList);
        treeview.append(constList);
        treeview.append(assocTree);

        // Bind to inspectable element click events
        treeview.find('.inspectable').click(function(event){ event.stopPropagation(); event.preventDefault(); updateInspectionTarget($(this), true); });
    }

    // Recursively builds an associative tree view from the given edict
    buildEdictTree(edictCollection, currentEdict)
    {
        if (currentEdict === undefined) return $('<div>(undefined edict)</div>');

        let label = currentEdict.getID();
        if (currentEdict == edictCollection.getHeadEntity()) label += ' (head entity)';
        else if (currentEdict == edictCollection.getHeadConstraint()) label += ' (head constraint)';

        const children = [];
        currentEdict.getExpressions().forEach((expr) => {
            if (expr.getLeftType() == ExpressionType.table) children.push(buildEdictTree(edictCollection, edictCollection.getEdict(expr.getLeftValue())));
            if (expr.getRightType() == ExpressionType.table) children.push(buildEdictTree(edictCollection, edictCollection.getEdict(expr.getRightValue())));
        });

        let displayItem;
        if (children.length == 0) displayItem = $('<div class="inspectable associative"></div>').text(label).attr('data-edictid', currentEdict.getID());
        else
        {
            displayItem = $('<details></details>');
            displayItem.append($('<summary class="inspectable associative"></summary>').text(label).attr('data-edictid', currentEdict.getID()));
            children.forEach((child) => displayItem.append(child));
        }

        return displayItem;
    }

    // Set the details view data contexts for access when we try to render
    setupDetailsView(filename, dataSections, edictCollection)
    {
        $('#inspector')
            .data('filename', filename)
            .data('datasections', dataSections)
            .data('edictcollection', edictCollection);
    }

    showFileDetails()
    {
        const detailsview = $('#inspector');
        detailsview.empty();
        detailsview.append($('<h2></h2>').text(detailsview.data('filename')));

        let infosection;
        let infolist;
        infosection = $('<div><b>Info:</b><ul></ul></div>');
        infolist = infosection.find('ul');
        Object.entries(detailsview.data('datasections').Info).forEach(([key, val]) => {
            infolist.append($('<li></li>').text(key+': '+val));
        });
        detailsview.append(infosection);

        infosection = $('<div><b>More Information:</b><ul></ul></div>');
        infolist = infosection.find('ul');
        Object.entries(detailsview.data('datasections')['More Information']).forEach(([key, val]) => {
            infolist.append($('<li></li>').text(key+': '+val));
        });
        detailsview.append(infosection);

        infosection = $('<div><b>Dictionary:</b><ul></ul></div>');
        infolist = infosection.find('ul');
        Object.entries(detailsview.data('datasections').Dict).forEach(([key, val]) => {
            infolist.append($('<li></li>').text(key+': '+val));
        });
        detailsview.append(infosection);
    }

    // Shows the details view for the given edict. The isAssociative parameter is a boolean value to control the resulting view's
    //  handling of child edicts -- true will create links to the edict in the associative tree, false will create links to the edict in the list view
    showEdictDetails(edictID, isAssociative)
    {
        const detailsview = $('#inspector');
        const dictionary = detailsview.data('datasections').Dict;
        const edictCollection = detailsview.data('edictcollection');
        const thisEdict = edictCollection.getEdict(edictID);

        detailsview.empty();
        const header = $('<h2></h2>').text('Edict '+edictID);
        detailsview.append(header);
        if (thisEdict === undefined){ header.text(header.text()+' (Undefined Edict)'); return; }
        else header.text(header.text()+' ('+(thisEdict.isEntity()?'Entity':'Constraint')+')');

        // Shortcut function for formatting the expression values in the loop. Returns an object{classes[], formattedValue}
        const formatExprVal = (exprType, origValue) => {
            const result = {classes:[], formattedValue:''};

            const isValid = ExpressionType.validators[exprType].test(origValue);

            if (!isValid)
            {
                result.classes.push('expr-value-invalid');
                result.formattedValue = StringEncoderService.encodeHTML(origValue);
            }
            else if (exprType == ExpressionType.dictionary || exprType == ExpressionType.dictionaryEscaped)
            {
                if (dictionary[origValue] === undefined)
                {
                    result.classes.push('expr-value-notfound');
                    result.formattedValue = StringEncoderService.encodeHTML(origValue);
                }
                else result.formattedValue = StringEncoderService.encodeHTML(dictionary[origValue]);
            }
            else if (exprType == ExpressionType.table)
            {
                if (edictCollection.getEdict(origValue) === undefined)
                {
                    result.classes.push('expr-value-notfound');
                    result.formattedValue = StringEncoderService.encodeHTML(origValue);
                }
                else
                {
                    const edictParam = origValue.replace(/'|\\/g, '\\$&');
                    result.formattedValue = '<a href="#" onclick="updateInspectionEdict(\''+edictParam+'\', '+isAssociative+')">'+StringEncoderService.encodeHTML(origValue)+'</a>';
                }
            }
            else if (exprType == ExpressionType.angle || exprType == ExpressionType.vector)
            {
                const parts = origValue.match(ExpressionType.validators[exprType]);
                result.formattedValue = '(' + parts[1] + ', ' + parts[2] + ', ' + parts[3] + ')';
            }
            else if (exprType == ExpressionType.tBoolean)
            {
                result.formattedValue = (origValue=='t'?'TRUE':'FALSE');
            }
            else	// Everything else including string, player, and number values
            {
                result.formattedValue = StringEncoderService.encodeHTML(origValue);
            }

            return result;
        };

        let infosection = $('<div><b>Expressions:</b><table class="expr-list"></table></div>');
        let infolist = infosection.find('table');
        let exprelem = $('<tr><td><i class="bullet"></i><span class="lval"></span></td><td>=</td><td><span class="rval"></span></td></tr>');
        thisEdict.getExpressions().forEach((expr) => {
            const thisElem = exprelem.clone();
            const leftFormatted = formatExprVal(expr.getLeftType(), expr.getLeftValue());
            const rightFormatted = formatExprVal(expr.getRightType(), expr.getRightValue());

            thisElem.find('.lval')
                .addClass(ExpressionType.enumToCSSClass(expr.getLeftType()))
                .addClass(leftFormatted.classes.join(' '))
                .html(leftFormatted.formattedValue);

            thisElem.find('.rval')
                .addClass(ExpressionType.enumToCSSClass(expr.getRightType()))
                .addClass(rightFormatted.classes.join(' '))
                .html(rightFormatted.formattedValue);

            infolist.append(thisElem);
        });
        detailsview.append(infosection);
    }

    updateInspectionTarget(target, isClickEvent)
    {
        const collapseTarget = (isClickEvent && target.is('summary.inspecting') && target.closest('details').prop('open'));

        $('#treeview > details .inspecting').removeClass('inspecting');
        target.addClass('inspecting');
        if (target.hasClass('fileitem')) showFileDetails();
        else showEdictDetails(target.data('edictid'), target.hasClass('associative'));

        // Open any parent trees to the target
        target.parentsUntil('#treeview', 'details').prop('open', true);

        // Collapse the target if it was clicked while already opened and focused, and it's not a child div
        if (collapseTarget) target.closest('details').prop('open', false);

        // Scroll the tree view to show the target
        const viewCeiling = $('#treeview').scrollTop();
        const viewFloor = viewCeiling + $('#treeview').height();
        const targetCeiling = target.position().top;
        const targetFloor = target.position().top + target.height();
        if (targetCeiling < viewCeiling) $('#treeview').scrollTop(targetCeiling);
        else if (targetFloor > viewFloor) $('#treeview').scrollTop(targetFloor-$('#treeview').height());
    }

    updateInspectionEdict(edictID, isAssociative)
    {
        let targetElem = null;
        if (isAssociative)
        {
            const inspected = $('#treeview > details .inspecting');
            var foundelem = inspected.closest('details').find('.inspectable[data-edictid="'+edictID+'"]');
            if (foundelem.length == 0)
            {
                const ancestors = inspected.parentsUntil('#treeview', 'details');
                let parentIndex = 0;
                while (foundelem.length == 0 && parentIndex < ancestors.length) foundelem = ancestors.eq(parentIndex++).find('.inspectable[data-edictid="'+edictID+'"]');
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
            updateInspectionTarget(targetElem);
            return true;
        }
    }

    updateFileStatus(status, details)
    {
        $('#filestatus').removeClass().addClass(status);
        $('#filestatus .label').text(fileStatusMsg[status]!==undefined?fileStatusMsg[status]:'');
        // TODO: Show details in UI
        console.log('file status updated to '+status+':', details);
    }

    handleFileSelect(event)
    {
        loadFile(event.originalEvent.target.files);
    }

    handleFileDrop(event)
    {
        event.stopPropagation();
        event.preventDefault();
        loadFile(event.originalEvent.dataTransfer.files);
    }

    handleFileDragOver(event)
    {
        event.stopPropagation();
        event.preventDefault();
        event.originalEvent.dataTransfer.dropEffect = 'copy';
    }
}
