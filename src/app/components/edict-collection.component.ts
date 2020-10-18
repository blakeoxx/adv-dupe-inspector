import { ExpressionType } from '../data-models/expression-type';
import { Edict } from '../data-models/edict';

export class EdictCollectionComponent
{
    private entities: Record<string, Edict>;
    private headEntityID: string | undefined;
    private constraints: Record<string, Edict>;
    private headConstraintID: string | undefined;

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
        if (this.headConstraintID !== undefined && this.constraints[this.headConstraintID] !== undefined)
        {
            return this.constraints[this.headConstraintID];
        }
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

    getEdict(edictID: string)
    {
        if (this.entities[edictID] !== undefined) return this.entities[edictID];
        else if (this.constraints[edictID] !== undefined) return this.constraints[edictID];
        else return undefined;
    }

    // Takes an array of strings representing the dictionary, checks each edict's expressions for type sanity and
    //  dictionary/edict references, and returns an array of warnings
    validateEdicts(dictionary: Record<string, unknown>)
    {
        const warnings: string[] = [];

        const dictCounter: Record<string, number> = {};
        const edictCounter: Record<string, number> = {};
        Object.keys(dictionary).forEach((k) => dictCounter[k] = 0);
        Object.keys(this.entities).concat(Object.keys(this.constraints)).forEach((k) => edictCounter[k] = 0);

        // Go through all the edicts for validation
        this.getEntities().concat(this.getConstraints()).forEach((thisEdict) => {
            const edictID = thisEdict.getID();

            // Go through the edict's expressions
            thisEdict.getExpressions().forEach((expr, idx) => {
                if (!expr.isValid()) warnings.push('Edict '+edictID+' expression '+idx+' value doesn\'t match type');
                else
                {
                    // Check the left value reference and count it if it's valid
                    if (expr.getLeftType() === ExpressionType.TYPES.TABLE)
                    {
                        if (this.getEdict(expr.getLeftValue()) === undefined)
                        {
                            warnings.push('Edict '+edictID+' expression '+idx+' left value references a non-existent edict');
                        }
                        else edictCounter[expr.getLeftValue()]++;
                    }
                    else if (expr.getLeftType() === ExpressionType.TYPES.DICTIONARY)
                    {
                        if (dictionary[expr.getLeftValue()] === undefined)
                        {
                            warnings.push('Edict '+edictID+' expression '+idx+' left value references a non-existent dictionary entry');
                        }
                        else dictCounter[expr.getLeftValue()]++;
                    }
                    else if (expr.getLeftType() === ExpressionType.TYPES.DICTIONARY_ESCAPED)
                    {
                        if (dictionary[expr.getLeftValue()] === undefined)
                        {
                            warnings.push('Edict '+edictID+' expression '+idx+' left value references a non-existent dictionary entry');
                        }
                        else dictCounter[expr.getLeftValue()]++;
                    }

                    // Check the right value reference and count it if it's valid
                    if (expr.getRightType() === ExpressionType.TYPES.TABLE)
                    {
                        if (this.getEdict(expr.getRightValue()) === undefined)
                        {
                            warnings.push('Edict '+edictID+' expression '+idx+' right value references a non-existent edict');
                        }
                        else edictCounter[expr.getRightValue()]++;
                    }
                    else if (expr.getRightType() === ExpressionType.TYPES.DICTIONARY)
                    {
                        if (dictionary[expr.getRightValue()] === undefined)
                        {
                            warnings.push('Edict '+edictID+' expression '+idx+' right value references a non-existent dictionary entry');
                        }
                        else dictCounter[expr.getRightValue()]++;
                    }
                    else if (expr.getRightType() === ExpressionType.TYPES.DICTIONARY_ESCAPED)
                    {
                        if (dictionary[expr.getRightValue()] === undefined)
                        {
                            warnings.push('Edict '+edictID+' expression '+idx+' right value references a non-existent dictionary entry');
                        }
                        else dictCounter[expr.getRightValue()]++;
                    }
                }
            });
        });

        // Warn if a dictionary entry wasn't referenced
        Object.entries(dictCounter).forEach(([k,v]) => {
            if (v < 1) warnings.push('Dictionary entry '+k+' is never referenced');
        });
        // Warn if an edict wasn't referenced
        Object.entries(edictCounter).forEach(([k,v]) => {
            if (v < 1) warnings.push('Edict '+k+' is never referenced');
        });

        return warnings;
    }

    // Takes an array of strings formatted as "identity{type:value=type:value;...}", maps those instances to this
    //  collection's entities, and returns an array of warnings
    addEntitiesFromStringArray(arr: string[])
    {
        const result = this.stringArrayToEdicts(arr, true);
        this.entities = result.edicts;
        this.headEntityID = result.head;
        if (result.head === undefined) result.warnings.push('Head entity not found');
        return result.warnings;
    }

    // Takes an array of strings formatted as "identity{type:value=type:value;...}", maps those instances to this
    //  collection's constraints, and returns an array of warnings
    addConstraintsFromStringArray(arr: string[])
    {
        const result = this.stringArrayToEdicts(arr, false);
        this.constraints = result.edicts;
        this.headConstraintID = result.head;
        if (result.head === undefined) result.warnings.push('Head constraint not found');
        return result.warnings;
    }

    // Takes an array of strings formatted as "identity{type:value=type:value;...}", and returns
    //  an object{head, edicts{}, warnings[]}. Object.head is the edict ID of the head edict, if found.
    //  Object.edicts is a collection of Edict objects represented by the given array of strings
    stringArrayToEdicts(arr: string[], isEntity: boolean)
    {
        const result = {head: undefined as (string | undefined), edicts: {} as Record<string, Edict>, warnings: [] as string[]};

        arr.forEach((edictstr, idx) => {
            const splits = edictstr.split(/^(.+)(?:\{)(.+)(?:\})$/g);
            if (splits.length < 2){ result.warnings.push('Edict string at index '+idx+' malformed'); return; }
            const edictID = splits[1];
            const edictBody = (splits[2]?splits[2]:'');
            if (edictBody.length < 1) result.warnings.push('Edict '+edictID+' body missing or empty');
            if (splits[0].length > 0) result.warnings.push('Data found before edict '+edictID+' identifier');
            if (splits[3].length > 0) result.warnings.push('Data found after edict '+edictID+' body');

            const thisEdict = new Edict(edictID, isEntity);

            // Break the body into individual expressions
            // Returns 1 unmatched/remainder string, plus 5 entries per expression (type1, value1, type2, value2, and unmatched/remainder)
            const bodyParts = edictBody.split(/(?:(.):(.+?))(?:=(.):(.+?))?(?:;)/g);
            const defaultExprParts = [ExpressionType.TYPES.UNSET, '', ExpressionType.TYPES.UNSET, ''];
            if (edictBody === ';')
            {
                result.warnings.push('Edict '+edictID+' has no expressions. Is the edict necessary?');
                thisEdict.addExpressionFromArray(defaultExprParts);
            }
            else if (bodyParts.length === 1)
            {
                result.warnings.push('Edict '+edictID+' body missing at least 1 separator');
                thisEdict.addExpressionFromArray(defaultExprParts);
            }
            else
            {
                if (bodyParts[0].length > 0) result.warnings.push('Data found before edict '+edictID+' first expression');
                for (let exprNum = 1, i = 1; i < bodyParts.length; exprNum++, i+=5)
                {
                    // Add each expression to the edict
                    const exprParts = [
                        (bodyParts[i]===undefined?ExpressionType.TYPES.UNSET:ExpressionType.charToEnum(bodyParts[i])),		// type 1
                        (bodyParts[i+1]===undefined?'':bodyParts[i+1]),													    // value 1
                        (bodyParts[i+2]===undefined?ExpressionType.TYPES.UNSET:ExpressionType.charToEnum(bodyParts[i+2])),	// type 2
                        (bodyParts[i+3]===undefined?'':bodyParts[i+3])													    // value 2
                    ];
                    if (bodyParts[i+4].length > 0)
                    {
                        result.warnings.push('Data found after edict '+edictID+' expression '+exprNum);
                    }
                    if (exprParts[0] === ExpressionType.TYPES.UNSET)
                    {
                        result.warnings.push('Edict '+edictID+' expression '+exprNum+' left type unsupported');
                    }
                    if (exprParts[0] === ExpressionType.TYPES.DICTIONARY_ESCAPED)
                    {
                        result.warnings.push('Edict '+edictID+' expression '+exprNum+' left type deprecated');
                    }
                    if (exprParts[2] === ExpressionType.TYPES.UNSET)
                    {
                        result.warnings.push('Edict '+edictID+' expression '+exprNum+' right type unsupported');
                    }
                    if (exprParts[2] === ExpressionType.TYPES.DICTIONARY_ESCAPED)
                    {
                        result.warnings.push('Edict '+edictID+' expression '+exprNum+' right type deprecated');
                    }
                    thisEdict.addExpressionFromArray(exprParts);
                }
            }

            // Add the edict to the result
            if (result.edicts[edictID] !== undefined) result.warnings.push('Edict '+edictID+' was defined multiple times');
            result.edicts[edictID] = thisEdict;
            if (edictID.startsWith('H'))
            {
                if (result.head !== undefined)
                {
                    result.warnings.push('Edict '+edictID+' looks like the head, but the head was already found');
                }
                result.head = edictID;
            }
        });

        return result;
    }
}
