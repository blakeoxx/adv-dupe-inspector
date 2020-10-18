import { ExpressionType } from './expression-type';

export class EdictExpression
{
    typeLeft: number;
    valueLeft: string;
    typeRight: number;
    valueRight: string;

    constructor(typeLeft: number, valueLeft: string, typeRight: number, valueRight: string)
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
        return (ExpressionType.validatorFor(this.typeLeft).test(this.valueLeft)
            && ExpressionType.validatorFor(this.typeRight).test(this.valueRight));
    }
}
