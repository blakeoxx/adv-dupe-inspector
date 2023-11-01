import { EdictExpression } from './edict-expression';
import { list, object, serializable, serializeAll } from 'serializr';

@serializeAll
export class Edict
{
    @serializable(list(object(EdictExpression)))
    private expressions: EdictExpression[] = [];
    private edictID: string;
    private isEntityFlag: boolean;

    constructor(edictID: string, isEntityFlag: boolean)
    {
        this.edictID = edictID;
        this.isEntityFlag = isEntityFlag;
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

    setID(newID: string)
    {
        this.edictID = newID;
    }

    setIsEntity(isEntityFlag: boolean)
    {
        this.isEntityFlag = isEntityFlag;
    }

    addExpression(edictExpr: EdictExpression)
    {
        this.expressions.push(edictExpr);
    }
}
