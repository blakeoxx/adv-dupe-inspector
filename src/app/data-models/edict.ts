import { EdictExpression } from './edict-expression';

export class Edict
{
    private edictID: string;
    private isEntityFlag: boolean;
    private expressions: EdictExpression[] = [];

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

    addExpressionFromArray(arr: any[])
    {
        this.addExpression(new EdictExpression(arr[0], arr[1], arr[2], arr[3]));
    }
}
