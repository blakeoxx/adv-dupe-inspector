import { ExpressionTypeService } from '../services/expression-type.service';
import { ExpressionType } from './expression-type';

export class EdictExpression
{
    typeLeft: ExpressionType;
    valueLeft: string;
    typeRight: ExpressionType;
    valueRight: string;

    constructor(typeLeft: ExpressionType, valueLeft: string, typeRight: ExpressionType, valueRight: string)
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
        return (ExpressionTypeService.validatorFor(this.typeLeft).test(this.valueLeft)
            && ExpressionTypeService.validatorFor(this.typeRight).test(this.valueRight));
    }
}
