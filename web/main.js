var fileStatusMsg = {accepted: "Ready to inspect", rejected: "Parsing error", warning: "Optimizations possible" };

var encodeHTML = s => $("<div/>").text(s).html();
var decodeHTML = s => $("<div/>").html(s).text();

// enum ExpressionType
var ExpressionType = Object.freeze({
	"unset": 0,
	"dictionary": 1,
	"dictionaryEscaped": 2,
	"table": 3,
	"player": 4,
	"angle": 5,
	"vector": 6,
	"boolean": 7,
	"string": 8,
	"number": 9,
	validators: [
		/^.*$/,				// unset
		/^.+$/,				// dictionary
		/^.+$/,				// dictionaryEscaped
		/^.+$/,				// table
		/^\d+$/,			// player
		/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/,		// angle
		/^(-?\d+(?:\.\d+)?(?:e-\d+)?),(-?\d+(?:\.\d+)?(?:e-\d+)?),(-?\d+(?:\.\d+)?(?:e-\d+)?)$/,		// vector
		/^t|f$/,			// boolean
		/^"[^"]*"$/,		// string
		/^-?\d+(\.\d+)?$/	// number
	],
	cssPrefix: "expr-type-",
	charToEnum: function(chr) { switch(chr.toUpperCase()){
		case 'Y': return this.dictionary;
		case 'Z': return this.dictionaryEscaped;
		case 'T': return this.table;
		case 'P': return this.player;
		case 'A': return this.angle;
		case 'V': return this.vector;
		case 'B': return this.boolean;
		case 'S': return this.string;
		case 'N': return this.number;
		default: return this.unset;
	} },
	enumToChar: function(val) { switch(val){
		case this.dictionary: return 'Y';
		case this.dictionaryEscaped: return 'Z';
		case this.table: return 'T';
		case this.player: return 'P';
		case this.angle: return 'A';
		case this.vector: return 'V';
		case this.boolean: return 'B';
		case this.string: return 'S';
		case this.number: return 'N';
		default: return '';
	} },
	enumToCSSClass: function(val) { switch(val){
		case this.dictionary: return this.cssPrefix+"dict";
		case this.dictionaryEscaped: return this.cssPrefix+"dictesc";
		case this.table: return this.cssPrefix+"table";
		case this.player: return this.cssPrefix+"player";
		case this.angle: return this.cssPrefix+"angle";
		case this.vector: return this.cssPrefix+"vector";
		case this.boolean: return this.cssPrefix+"boolean";
		case this.string: return this.cssPrefix+"string";
		case this.number: return this.cssPrefix+"number";
		default: return this.cssPrefix+"unset";
	} }
});

// class EdictExpression
class EdictExpression
{
	constructor(typeLeft, valueLeft, typeRight, valueRight)
	{
		this.typeLeft = typeLeft;
		this.valueLeft = valueLeft;
		this.typeRight = typeRight;
		this.valueRight = valueRight;
	}
	
	getLeftType()
	{
		return this.typeLeft;
	}
	
	getLeftValue()
	{
		return this.valueLeft;
	}
	
	getRightType()
	{
		return this.typeRight;
	}
	
	getRightValue()
	{
		return this.valueRight;
	}
	
	// Checks left and right values for type sanity. Returns true if values match their type's range
	isValid()
	{
		return (ExpressionType.validators[this.typeLeft].test(this.valueLeft) && ExpressionType.validators[this.typeRight].test(this.valueRight));
	}
}

// class Edict
class Edict
{
	constructor(edictID, isEntityFlag)
	{
		this.edictID = edictID;
		this.isEntityFlag = (isEntityFlag?true:false);
		this.expressions = [];
	}
	
	getID()
	{
		return this.edictID;
	}
	
	isEntity()
	{
		return this.isEntityFlag;
	}
	
	getExpressions()
	{
		return this.expressions;
	}
	
	setID(newID)
	{
		this.edictID = newID;
	}
	
	setIsEntity(isEntityFlag)
	{
		this.isEntityFlag = (isEntityFlag?true:false);
	}
	
	addExpression(edictExpr)
	{
		if (edictExpr instanceof EdictExpression) this.expressions.push(edictExpr);
	}
	
	addExpressionFromArray(arr)
	{
		this.addExpression(new EdictExpression(arr[0], arr[1], arr[2], arr[3]));
	}
}

// class EdictCollection
class EdictCollection
{
	constructor()
	{
		this.entities = {};
		this.headEntityID = undefined;
		this.constraints = {};
		this.headConstraintID = undefined;
	}
	
	getHeadEntity()
	{
		if (this.headEntityID !== undefined && this.entities[this.headEntityID] !== undefined) return this.entities[this.headEntityID];
		else return undefined;
	}
	
	getHeadConstraint()
	{
		if (this.headConstraintID !== undefined && this.constraints[this.headConstraintID] !== undefined) return this.constraints[this.headConstraintID];
		else return undefined;
	}
	
	getEntities()
	{
		// Object.values sorts the properties by creation order
		return Object.values(this.entities);
	}
	
	getConstraints()
	{
		// Object.values sorts the properties by creation order
		return Object.values(this.constraints);
	}
	
	getEdict(edictID)
	{
		if (this.entities[edictID] !== undefined) return this.entities[edictID];
		else if (this.constraints[edictID] !== undefined) return this.constraints[edictID];
		else return undefined;
	}
	
	// Takes an array of strings representing the dictionary, checks each edict's expressions for type sanity and dictionary/edict references, and returns an array of warnings
	validateEdicts(dictionary)
	{
		var warnings = [];
		
		var dictCounter = {};
		var edictCounter = {};
		Object.keys(dictionary).forEach((k) => dictCounter[k] = 0);
		Object.keys(this.entities).concat(Object.keys(this.constraints)).forEach((k) => edictCounter[k] = 0);
		
		// Go through all the edicts for validation
		this.getEntities().concat(this.getConstraints()).forEach((thisEdict) => {
			var edictID = thisEdict.getID();
			
			// Go through the edict's expressions
			thisEdict.getExpressions().forEach((expr, idx) => {
				if (!expr.isValid()) warnings.push("Edict "+edictID+" expression "+idx+" value doesn't match type");
				else
				{
					// Check the left value reference and count it if it's valid
					if (expr.getLeftType() == ExpressionType.table)
					{
						if (this.getEdict(expr.getLeftValue()) === undefined) warnings.push("Edict "+edictID+" expression "+idx+" left value references a non-existent edict");
						else edictCounter[expr.getLeftValue()]++;
					}
					else if (expr.getLeftType() == ExpressionType.dictionary)
					{
						if (dictionary[expr.getLeftValue()] === undefined) warnings.push("Edict "+edictID+" expression "+idx+" left value references a non-existent dictionary entry");
						else dictCounter[expr.getLeftValue()]++;
					}
					else if (expr.getLeftType() == ExpressionType.dictionaryEscaped)
					{
						if (dictionary[expr.getLeftValue()] === undefined) warnings.push("Edict "+edictID+" expression "+idx+" left value references a non-existent dictionary entry");
						else dictCounter[expr.getLeftValue()]++;
					}
					
					// Check the right value reference and count it if it's valid
					if (expr.getRightType() == ExpressionType.table)
					{
						if (this.getEdict(expr.getRightValue()) === undefined) warnings.push("Edict "+edictID+" expression "+idx+" right value references a non-existent edict");
						else edictCounter[expr.getRightValue()]++;
					}
					else if (expr.getRightType() == ExpressionType.dictionary)
					{
						if (dictionary[expr.getRightValue()] === undefined) warnings.push("Edict "+edictID+" expression "+idx+" right value references a non-existent dictionary entry");
						else dictCounter[expr.getRightValue()]++;
					}
					else if (expr.getRightType() == ExpressionType.dictionaryEscaped)
					{
						if (dictionary[expr.getRightValue()] === undefined) warnings.push("Edict "+edictID+" expression "+idx+" right value references a non-existent dictionary entry");
						else dictCounter[expr.getRightValue()]++;
					}
				}
			});
		});
		
		// Warn if a dictionary entry wasn't referenced
		Object.entries(dictCounter).forEach(([k,v]) => {
			if (v < 1) warnings.push("Dictionary entry "+k+" is never referenced");
		});
		// Warn if an edict wasn't referenced
		Object.entries(edictCounter).forEach(([k,v]) => {
			if (v < 1) warnings.push("Edict "+k+" is never referenced");
		});
		
		return warnings;
	}
	
	// Takes an array of strings formatted as "identity{type:value=type:value;...}", maps those instances to this collection's entities, and returns an array of warnings
	addEntitiesFromStringArray(arr)
	{
		var result = this.stringArrayToEdicts(arr, true);
		this.entities = result.edicts;
		this.headEntityID = result.head;
		if (result.head === undefined) result.warnings.push("Head entity not found");
		return result.warnings;
	}
	
	// Takes an array of strings formatted as "identity{type:value=type:value;...}", maps those instances to this collection's constraints, and returns an array of warnings
	addConstraintsFromStringArray(arr)
	{
		var result = this.stringArrayToEdicts(arr, false);
		this.constraints = result.edicts;
		this.headConstraintID = result.head;
		if (result.head === undefined) result.warnings.push("Head constraint not found");
		return result.warnings;
	}
	
	// Takes an array of strings formatted as "identity{type:value=type:value;...}", and returns an object{head, edicts{}, warnings[]}. Object.head is the edict ID of the head edict, if found.
	//  Object.edicts is a collection of Edict objects represented by the given array of strings
	stringArrayToEdicts(arr, isEntity)
	{
		var result = {head:undefined, edicts:{}, warnings:[]};
		
		arr.forEach((edictstr, idx) => {
			var splits = edictstr.split(/^(.+)(?:\{)(.+)(?:\})$/g);
			if (splits.length < 2){ result.warnings.push("Edict string at index "+idx+" malformed"); return; }
			var edictID = splits[1];
			var edictBody = (splits[2]?splits[2]:"");
			if (edictBody.length < 1) result.warnings.push("Edict "+edictID+" body missing or empty");
			if (splits[0].length > 0) result.warnings.push("Data found before edict "+edictID+" identifier");
			if (splits[3].length > 0) result.warnings.push("Data found after edict "+edictID+" body");
			
			var thisEdict = new Edict(edictID, isEntity);
			
			// Break the body into individual expressions
			// Returns 1 unmatched/remainder string, plus 5 entries per expression (type1, value1, type2, value2, and unmatched/remainder)
			var bodyParts = edictBody.split(/(?:(.):(.+?))(?:=(.):(.+?))?(?:;)/g);
			var defaultExprParts = [ExpressionType.unset, "", ExpressionType.unset, ""];
			if (edictBody == ";"){ result.warnings.push("Edict "+edictID+" has no expressions. Is the edict necessary?"); thisEdict.addExpressionFromArray(defaultExprParts); }
			else if (bodyParts.length == 1){ result.warnings.push("Edict "+edictID+" body missing at least 1 separator"); thisEdict.addExpressionFromArray(defaultExprParts); }
			else
			{
				if (bodyParts[0].length > 0) result.warnings.push("Data found before edict "+edictID+" first expression");
				for (var exprNum = 1, i = 1; i < bodyParts.length; exprNum++, i+=5)
				{
					// Add each expression to the edict
					var exprParts = [
						(bodyParts[i]===undefined?ExpressionType.unset:ExpressionType.charToEnum(bodyParts[i])),		// type 1
						(bodyParts[i+1]===undefined?"":bodyParts[i+1]),													// value 1
						(bodyParts[i+2]===undefined?ExpressionType.unset:ExpressionType.charToEnum(bodyParts[i+2])),	// type 2
						(bodyParts[i+3]===undefined?"":bodyParts[i+3])													// value 2
					];
					if (bodyParts[i+4].length > 0) 							result.warnings.push("Data found after edict "+edictID+" expression "+exprNum);
					if (exprParts[0] == ExpressionType.unset) 				result.warnings.push("Edict "+edictID+" expression "+exprNum+" left type unsupported");
					if (exprParts[0] == ExpressionType.dictionaryEscaped) 	result.warnings.push("Edict "+edictID+" expression "+exprNum+" left type deprecated");
					if (exprParts[2] == ExpressionType.unset) 				result.warnings.push("Edict "+edictID+" expression "+exprNum+" right type unsupported");
					if (exprParts[2] == ExpressionType.dictionaryEscaped) 	result.warnings.push("Edict "+edictID+" expression "+exprNum+" right type deprecated");
					thisEdict.addExpressionFromArray(exprParts);
				}
			}
			
			// Add the edict to the result
			if (result.edicts[edictID] !== undefined) result.warnings.push("Edict "+edictID+" was defined multiple times");
			result.edicts[edictID] = thisEdict;
			if (edictID.startsWith("H"))
			{
				if (result.head !== undefined) result.warnings.push("Edict "+edictID+" looks like the head, but the head was already found");
				result.head = edictID;
			}
		});
		
		return result;
	}
}

function loadFile(fileList)
{
	// User selected no file
	if (fileList.length == 0) return;
	
	var file = fileList[0];
	if (file.type != "text/plain"){ updateFileStatus("rejected", file.name+" is not a plaintext file (*.txt)"); return; }
	
	var reader = new FileReader();
	
	reader.onload = (res) => { parseData(file.name, res.target.result); };
	reader.onerror = (res) => { updateFileStatus("rejected", "The file reader returned error code "+res.target.error.code+". Please check the file and try again."); };
	
	updateFileStatus("loading", "");
	reader.readAsText(file);
}

function parseData(filename, data)
{
	// Standardize newlines and remove empty lines in case the user manually edited the file
	data = data.replace(/\r+\n/g, "\n").replace(/\n\s*\n/g, "\n");
	
	var parseWarnings = [];
	var dataSections = {};
	var expectedDataSections = ["Info", "More Information", "Save", "Dict"];
	
	// Split the data by sections and populate the dataSections object
	var splits = data.split(/\n?^\[(.*)\]$\n?/gm);
	if (splits[0].length > 0) parseWarnings.push("Data found before first section");
	for (var i = 1; i < splits.length; i+=2)
	{
		// Each section becomes a property of the dataSections object, whose value is an array of strings delimited by newlines
		if (dataSections[splits[i]] !== undefined) parseWarnings.push("Section '"+splits[i]+"' was defined multiple times");
		else if (expectedDataSections.indexOf(splits[i]) < 0) parseWarnings.push("Unrecognized section '"+splits[i]+"'");
		dataSections[splits[i]] = splits[i+1].split("\n");
	}
	
	// Check for expected data sections
	for (var i = 0; i < expectedDataSections.length; i++)
	{
		if (dataSections[expectedDataSections[i]] === undefined)
		{
			updateFileStatus("rejected", "Section '"+expectedDataSections[i]+"' missing");
			return;
		}
	}
	
	// Convert data section values from arrays of strings into key-value pairs
	expectedDataSections.forEach((section) => {
		var kvs = stringArrayToKV(dataSections[section]);
		dataSections[section] = kvs.result;
		kvs.warnings.forEach((v) => parseWarnings.push("Section '"+section+"' "+v));
	});
	
	console.log("parsed data sections: ", dataSections);
	
	if (dataSections['Save']['Entities'] === undefined){ updateFileStatus("rejected", "Section 'Save' missing entities"); return; }
	if (dataSections['Save']['Constraints'] === undefined){ updateFileStatus("rejected", "Section 'Save' missing constraints"); return; }
	
	// Break edicts into string arrays for parsing
	var edictResult = edictStringToStringArray(dataSections['Save']['Entities']);
	dataSections['Save']['Entities'] = edictResult.result;
	edictResult.warnings.forEach((v) => parseWarnings.push("Entities "+v));
	edictResult = edictStringToStringArray(dataSections['Save']['Constraints']);
	dataSections['Save']['Constraints'] = edictResult.result;
	edictResult.warnings.forEach((v) => parseWarnings.push("Constraints "+v));
	
	// Parse edicts
	var edictCollection = new EdictCollection();
	var entityWarnings = edictCollection.addEntitiesFromStringArray(dataSections['Save']['Entities']);
	var constraintWarnings = edictCollection.addConstraintsFromStringArray(dataSections['Save']['Constraints']);
	parseWarnings = parseWarnings.concat(entityWarnings, constraintWarnings);
	
	console.log("edict collection: ", edictCollection);
	
	// TODO: Dictionary validation
	
	// Edict value validation
	edictCollection.validateEdicts(dataSections['Dict']);
	
	renderTreeView(filename, edictCollection);
	setupDetailsView(filename, dataSections, edictCollection);
	$("#treeview > details summary.fileitem").click();
	
	if (parseWarnings.length > 0) updateFileStatus("warning", parseWarnings.map(x => encodeHTML(x)).join("<br>"));
	else updateFileStatus("accepted", "");
}

// Takes an array of strings formatted as "key:value", and returns an object{result, warnings[]}. Object.result has properties named after keys holding values without surrounding quotes
function stringArrayToKV(arr)
{
	var result = {result:{}, warnings:[]};
	arr.forEach((str) => {
		var splitIdx = str.indexOf(":");
		if (splitIdx < 0 || splitIdx == str.length-1){ result.warnings.push("Key '"+str+"' has no value"); splitIdx = (splitIdx<0?str.length:splitIdx); }
		else if (splitIdx == 0) result.warnings.push("Value '"+str+"' has no key");
		
		var key = str.slice(0, splitIdx);
		var val = str.slice(splitIdx+1);
		if (result.result[key] !== undefined) result.warnings.push("Key '"+key+"' was defined multiple times");
		result.result[key] = val.replace(/(^\")|(\"$)/g, "");
	});
	return result;
}

// Takes a string formatted as "A{type:value;...;}B{type:value;...;}", and returns an object{result[], warnings[]}. Object.result is an array of strings formatted as ["A{type:value;...;}", "B{type:value;...;}"]
function edictStringToStringArray(str)
{
	var result = {result:[], warnings:[]};
	result.result = str.match(/.+?{.*?}/g);
	if (result.result == null){ result.result = [str]; result.warnings.push("Edict string contained no edicts"); }
	
	// Include a parse warning if we didn't match the entire string
	var totalLength = 0;
	result.result.forEach((v) => totalLength+=v.length);
	if (totalLength < str.length) result.warnings.push("Edict string contained some junk data, which we removed");
	
	return result;
}

function renderTreeView(filename, edictCollection)
{
	var treeview = $("#treeview > details");
	treeview.empty();
	treeview.prop("open", true);
	
	var fileitem = $("<summary class='fileitem inspectable'></summary>").text(filename);
	treeview.append(fileitem);
	
	// Build the entity list
	var entList = $("<details class='topnode listview'><summary>Entity List</summary></details>");
	edictCollection.getEntities().forEach((thisEntity) => {
		var thisItem = $("<div class='inspectable'></div>").text(thisEntity.getID()).attr("data-edictid", thisEntity.getID());
		entList.append(thisItem);
	});
	
	// Build the constraint list
	var constList = $("<details class='topnode listview'><summary>Constraint List</summary></details>");
	edictCollection.getConstraints().forEach((thisConstraint) => {
		var thisItem = $("<div class='inspectable'></div>").text(thisConstraint.getID()).attr("data-edictid", thisConstraint.getID());
		constList.append(thisItem);
	});
	
	// Build the associative tree
	var assocTree = $("<details class='topnode assocview'><summary>Associative View</summary></details>");
	assocTree.append(buildEdictTree(edictCollection, edictCollection.getHeadEntity()));
	assocTree.append(buildEdictTree(edictCollection, edictCollection.getHeadConstraint()));
	
	// Add the trees and lists to the view
	treeview.append(entList);
	treeview.append(constList);
	treeview.append(assocTree);
	
	// Bind to inspectable element click events
	treeview.find(".inspectable").click(function(event){ event.stopPropagation(); event.preventDefault(); updateInspectionTarget($(this), true); });
}

// Recursively builds an associative tree view from the given edict
function buildEdictTree(edictCollection, currentEdict)
{
	if (currentEdict === undefined) return $("<div>(undefined edict)</div>");
	
	var label = currentEdict.getID();
	if (currentEdict == edictCollection.getHeadEntity()) label += " (head entity)";
	else if (currentEdict == edictCollection.getHeadConstraint()) label += " (head constraint)";
	
	var children = [];
	currentEdict.getExpressions().forEach((expr) => {
		if (expr.getLeftType() == ExpressionType.table) children.push(buildEdictTree(edictCollection, edictCollection.getEdict(expr.getLeftValue())));
		if (expr.getRightType() == ExpressionType.table) children.push(buildEdictTree(edictCollection, edictCollection.getEdict(expr.getRightValue())));
	});
	
	var displayItem;
	if (children.length == 0) displayItem = $("<div class='inspectable associative'></div>").text(label).attr("data-edictid", currentEdict.getID());
	else
	{
		displayItem = $("<details></details>");
		displayItem.append($("<summary class='inspectable associative'></summary>").text(label).attr("data-edictid", currentEdict.getID()));
		children.forEach((child) => displayItem.append(child));
	}
	
	return displayItem;
}

// Set the details view data contexts for access when we try to render
function setupDetailsView(filename, dataSections, edictCollection)
{
	$("#inspector")
	  .data("filename", filename)
	  .data("datasections", dataSections)
	  .data("edictcollection", edictCollection);
}

function showFileDetails()
{
	var detailsview = $("#inspector");
	detailsview.empty();
	detailsview.append($("<h2></h2>").text(detailsview.data("filename")));
	
	var infosection, infolist;
	infosection = $("<div><b>Info:</b><ul></ul></div>");
	infolist = infosection.find("ul");
	Object.entries(detailsview.data("datasections")['Info']).forEach(([key, val]) => {
		infolist.append($("<li></li>").text(key+": "+val));
	});
	detailsview.append(infosection);
	
	infosection = $("<div><b>More Information:</b><ul></ul></div>");
	infolist = infosection.find("ul");
	Object.entries(detailsview.data("datasections")['More Information']).forEach(([key, val]) => {
		infolist.append($("<li></li>").text(key+": "+val));
	});
	detailsview.append(infosection);
	
	infosection = $("<div><b>Dictionary:</b><ul></ul></div>");
	infolist = infosection.find("ul");
	Object.entries(detailsview.data("datasections")['Dict']).forEach(([key, val]) => {
		infolist.append($("<li></li>").text(key+": "+val));
	});
	detailsview.append(infosection);
}

// Shows the details view for the given edict. The isAssociative parameter is a boolean value to control the resulting view's
//  handling of child edicts -- true will create links to the edict in the associative tree, false will create links to the edict in the list view
function showEdictDetails(edictID, isAssociative)
{
	var detailsview = $("#inspector");
	var dictionary = detailsview.data("datasections")['Dict'];
	var edictCollection = detailsview.data("edictcollection");
	var thisEdict = edictCollection.getEdict(edictID);
	
	detailsview.empty();
	var header = $("<h2></h2>").text("Edict "+edictID);
	detailsview.append(header);
	if (thisEdict === undefined){ header.text(header.text()+" (Undefined Edict)"); return; }
	else header.text(header.text()+" ("+(thisEdict.isEntity()?"Entity":"Constraint")+")");
	
	// Shortcut function for formatting the expression values in the loop. Returns an object{classes[], formattedValue}
	var formatExprVal = (exprType, origValue) => {
		var result = {classes:[], formattedValue:""};
		
		var isValid = ExpressionType.validators[exprType].test(origValue);
		
		if (!isValid)
		{
			result.classes.push("expr-value-invalid");
			result.formattedValue = encodeHTML(origValue);
		}
		else if (exprType == ExpressionType.dictionary || exprType == ExpressionType.dictionaryEscaped)
		{
			if (dictionary[origValue] === undefined)
			{
				result.classes.push("expr-value-notfound");
				result.formattedValue = encodeHTML(origValue);
			}
			else result.formattedValue = encodeHTML(dictionary[origValue]);
		}
		else if (exprType == ExpressionType.table)
		{
			if (edictCollection.getEdict(origValue) === undefined)
			{
				result.classes.push("expr-value-notfound");
				result.formattedValue = encodeHTML(origValue);
			}
			else
			{
				var edictParam = origValue.replace(/'|\\/g, "\\$&");
				result.formattedValue = "<a href='#' onclick='updateInspectionEdict(\""+edictParam+"\", "+isAssociative+")'>"+encodeHTML(origValue)+"</a>";
			}
		}
		else if (exprType == ExpressionType.angle || exprType == ExpressionType.vector)
		{
			var parts = origValue.match(ExpressionType.validators[exprType]);
			result.formattedValue = "(" + parts[1] + ", " + parts[2] + ", " + parts[3] + ")";
		}
		else if (exprType == ExpressionType.boolean)
		{
			result.formattedValue = (origValue=="t"?"TRUE":"FALSE");
		}
		else	// Everything else including string, player, and number values
		{
			result.formattedValue = encodeHTML(origValue);
		}
		
		return result;
	};
	
	var infosection, infolist, exprelem;
	infosection = $("<div><b>Expressions:</b><table class='expr-list'></table></div>");
	infolist = infosection.find("table");
	exprelem = $("<tr><td><i class='bullet'></i><span class='lval'></span></td><td>=</td><td><span class='rval'></span></td></tr>");
	thisEdict.getExpressions().forEach((expr) => {
		var thisElem = exprelem.clone();
		var leftFormatted = formatExprVal(expr.getLeftType(), expr.getLeftValue());
		var rightFormatted = formatExprVal(expr.getRightType(), expr.getRightValue());
		
		thisElem.find(".lval")
		  .addClass(ExpressionType.enumToCSSClass(expr.getLeftType()))
		  .addClass(leftFormatted.classes.join(" "))
		  .html(leftFormatted.formattedValue);
		
		thisElem.find(".rval")
		  .addClass(ExpressionType.enumToCSSClass(expr.getRightType()))
		  .addClass(rightFormatted.classes.join(" "))
		  .html(rightFormatted.formattedValue);
		
		infolist.append(thisElem);
	});
	detailsview.append(infosection);
}

function updateInspectionTarget(target, isClickEvent)
{
	var collapseTarget = (isClickEvent && target.is("summary.inspecting") && target.closest("details").prop("open"));
	
	$("#treeview > details .inspecting").removeClass("inspecting");
	target.addClass("inspecting");
	if (target.hasClass("fileitem")) showFileDetails();
	else showEdictDetails(target.data("edictid"), target.hasClass("associative"));
	
	// Open any parent trees to the target
	target.parentsUntil("#treeview", "details").prop("open", true);
	
	// Collapse the target if it was clicked while already opened and focused, and it's not a child div
	if (collapseTarget) target.closest("details").prop("open", false);
	
	// Scroll the tree view to show the target
	var viewCeiling = $("#treeview").scrollTop();
	var viewFloor = viewCeiling + $("#treeview").height();
	var targetCeiling = target.position().top;
	var targetFloor = target.position().top + target.height();
	if (targetCeiling < viewCeiling) $("#treeview").scrollTop(targetCeiling);
	else if (targetFloor > viewFloor) $("#treeview").scrollTop(targetFloor-$("#treeview").height());
}

function updateInspectionEdict(edictID, isAssociative)
{
	var targetElem = null;
	if (isAssociative)
	{
		var inspected = $("#treeview > details .inspecting");
		var foundelem = inspected.closest("details").find(".inspectable[data-edictid='"+edictID+"']");
		if (foundelem.length == 0)
		{
			var ancestors = inspected.parentsUntil("#treeview", "details");
			var parentIndex = 0;
			while (foundelem.length == 0 && parentIndex < ancestors.length) foundelem = ancestors.eq(parentIndex++).find(".inspectable[data-edictid='"+edictID+"']");
		}
		
		if (foundelem.length > 0) targetElem = foundelem.first();
	}
	else
	{
		var foundelem = $("#treeview > details .listview .inspectable[data-edictid='"+edictID+"']");
		if (foundelem.length > 0) targetElem = foundelem.first();
	}
	
	if (targetElem == null) return false;
	else
	{
		updateInspectionTarget(targetElem);
		return true;
	}
}

function updateFileStatus(status, details)
{
	$("#filestatus").removeClass().addClass(status);
	$("#filestatus .label").text(fileStatusMsg[status]!==undefined?fileStatusMsg[status]:"");
	// TODO: Show details in UI
	console.log("file status updated to "+status+":", details);
}

function handleFileSelect(event)
{
	loadFile(event.originalEvent.target.files);
}
$(document).ready(() => { $("#fileupload input[type='file']").on("change", handleFileSelect); });

function handleFileDrop(event)
{
	event.stopPropagation();
	event.preventDefault();
	loadFile(event.originalEvent.dataTransfer.files);
}
$(document).ready(() => { $('body').on('drop', handleFileDrop); });

function handleFileDragOver(event)
{
	event.stopPropagation();
	event.preventDefault();
	event.originalEvent.dataTransfer.dropEffect = "copy";
}
$(document).ready(() => { $('body').on('dragover', handleFileDragOver); });