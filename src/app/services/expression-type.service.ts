import { ExpressionType } from '../data-models/expression-type';

export class ExpressionTypeService {
    static charToEnum(chr: string): ExpressionType {
        switch (chr.toUpperCase()) {
            case 'Y':
                return ExpressionType.DICTIONARY;
            case 'Z':
                return ExpressionType.DICTIONARY_ESCAPED;
            case 'T':
                return ExpressionType.TABLE;
            case 'P':
                return ExpressionType.PLAYER;
            case 'A':
                return ExpressionType.ANGLE;
            case 'V':
                return ExpressionType.VECTOR;
            case 'B':
                return ExpressionType.BOOLEAN;
            case 'S':
                return ExpressionType.STRING;
            case 'N':
                return ExpressionType.NUMBER;
            default:
                return ExpressionType.UNSET;
        }
    }

    static enumToChar(val: ExpressionType): string {
        switch (val) {
            case ExpressionType.DICTIONARY:
                return 'Y';
            case ExpressionType.DICTIONARY_ESCAPED:
                return 'Z';
            case ExpressionType.TABLE:
                return 'T';
            case ExpressionType.PLAYER:
                return 'P';
            case ExpressionType.ANGLE:
                return 'A';
            case ExpressionType.VECTOR:
                return 'V';
            case ExpressionType.BOOLEAN:
                return 'B';
            case ExpressionType.STRING:
                return 'S';
            case ExpressionType.NUMBER:
                return 'N';
            default:
                return '';
        }
    }

    static enumToCSSClass(val: ExpressionType): string {
        const cssPrefix = 'expr-type-';
        switch (val) {
            case ExpressionType.DICTIONARY:
                return cssPrefix + 'dict';
            case ExpressionType.DICTIONARY_ESCAPED:
                return cssPrefix + 'dictesc';
            case ExpressionType.TABLE:
                return cssPrefix + 'table';
            case ExpressionType.PLAYER:
                return cssPrefix + 'player';
            case ExpressionType.ANGLE:
                return cssPrefix + 'angle';
            case ExpressionType.VECTOR:
                return cssPrefix + 'vector';
            case ExpressionType.BOOLEAN:
                return cssPrefix + 'boolean';
            case ExpressionType.STRING:
                return cssPrefix + 'string';
            case ExpressionType.NUMBER:
                return cssPrefix + 'number';
            default:
                return cssPrefix + 'unset';
        }
    }

    static validatorFor(val: ExpressionType): RegExp {
        switch (val) {
            case ExpressionType.DICTIONARY:
            case ExpressionType.DICTIONARY_ESCAPED:
            case ExpressionType.TABLE:
                return /^.+$/;
            case ExpressionType.PLAYER:
                return /^\d+$/;
            case ExpressionType.ANGLE:
                return /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;
            case ExpressionType.VECTOR:
                return /^(-?\d+(?:\.\d+)?(?:e-\d+)?),(-?\d+(?:\.\d+)?(?:e-\d+)?),(-?\d+(?:\.\d+)?(?:e-\d+)?)$/;
            case ExpressionType.BOOLEAN:
                return /^t|f$/;
            case ExpressionType.STRING:
                return /^"[^"]*"$/;
            case ExpressionType.NUMBER:
                return /^-?\d+(\.\d+)?$/;
            default:
                return /^.*$/;
        }
    }
}
