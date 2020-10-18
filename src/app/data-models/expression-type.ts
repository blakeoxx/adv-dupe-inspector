enum ExpressionTypeType {
    UNSET,
    DICTIONARY,
    DICTIONARY_ESCAPED,
    TABLE,
    PLAYER,
    ANGLE,
    VECTOR,
    BOOLEAN,
    STRING,
    NUMBER
}

export class ExpressionType {
    public static readonly TYPES = ExpressionTypeType;
    public static readonly unset = 0;

    static charToEnum(chr: string): ExpressionTypeType {
        switch (chr.toUpperCase()) {
            case 'Y':
                return ExpressionTypeType.DICTIONARY;
            case 'Z':
                return ExpressionTypeType.DICTIONARY_ESCAPED;
            case 'T':
                return ExpressionTypeType.TABLE;
            case 'P':
                return ExpressionTypeType.PLAYER;
            case 'A':
                return ExpressionTypeType.ANGLE;
            case 'V':
                return ExpressionTypeType.VECTOR;
            case 'B':
                return ExpressionTypeType.BOOLEAN;
            case 'S':
                return ExpressionTypeType.STRING;
            case 'N':
                return ExpressionTypeType.NUMBER;
            default:
                return ExpressionTypeType.UNSET;
        }
    }

    static enumToChar(val: ExpressionTypeType): string {
        switch (val) {
            case ExpressionTypeType.DICTIONARY:
                return 'Y';
            case ExpressionTypeType.DICTIONARY_ESCAPED:
                return 'Z';
            case ExpressionTypeType.TABLE:
                return 'T';
            case ExpressionTypeType.PLAYER:
                return 'P';
            case ExpressionTypeType.ANGLE:
                return 'A';
            case ExpressionTypeType.VECTOR:
                return 'V';
            case ExpressionTypeType.BOOLEAN:
                return 'B';
            case ExpressionTypeType.STRING:
                return 'S';
            case ExpressionTypeType.NUMBER:
                return 'N';
            default:
                return '';
        }
    }

    static enumToCSSClass(val: ExpressionTypeType): string {
        const cssPrefix = 'expr-type-';
        switch (val) {
            case ExpressionTypeType.DICTIONARY:
                return cssPrefix + 'dict';
            case ExpressionTypeType.DICTIONARY_ESCAPED:
                return cssPrefix + 'dictesc';
            case ExpressionTypeType.TABLE:
                return cssPrefix + 'table';
            case ExpressionTypeType.PLAYER:
                return cssPrefix + 'player';
            case ExpressionTypeType.ANGLE:
                return cssPrefix + 'angle';
            case ExpressionTypeType.VECTOR:
                return cssPrefix + 'vector';
            case ExpressionTypeType.BOOLEAN:
                return cssPrefix + 'boolean';
            case ExpressionTypeType.STRING:
                return cssPrefix + 'string';
            case ExpressionTypeType.NUMBER:
                return cssPrefix + 'number';
            default:
                return cssPrefix + 'unset';
        }
    }

    static validatorFor(val: ExpressionTypeType): RegExp {
        switch (val) {
            case ExpressionTypeType.DICTIONARY:
            case ExpressionTypeType.DICTIONARY_ESCAPED:
            case ExpressionTypeType.TABLE:
                return /^.+$/;
            case ExpressionTypeType.PLAYER:
                return /^\d+$/;
            case ExpressionTypeType.ANGLE:
                return /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;
            case ExpressionTypeType.VECTOR:
                return /^(-?\d+(?:\.\d+)?(?:e-\d+)?),(-?\d+(?:\.\d+)?(?:e-\d+)?),(-?\d+(?:\.\d+)?(?:e-\d+)?)$/;
            case ExpressionTypeType.BOOLEAN:
                return /^t|f$/;
            case ExpressionTypeType.STRING:
                return /^"[^"]*"$/;
            case ExpressionTypeType.NUMBER:
                return /^-?\d+(\.\d+)?$/;
            default:
                return /^.*$/;
        }
    }
}
