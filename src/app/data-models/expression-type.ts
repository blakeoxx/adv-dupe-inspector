export class ExpressionType {
    public static readonly unset = 0;
    public static readonly dictionary = 1;
    public static readonly dictionaryEscaped = 2;
    public static readonly table = 3;
    public static readonly player = 4;
    public static readonly angle = 5;
    public static readonly vector = 6;
    public static readonly tBoolean = 7;
    public static readonly tString = 8;
    public static readonly tNumber = 9;

    public static readonly validators: RegExp[] = [
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
    ];

    public static readonly cssPrefix = 'expr-type-';

    static charToEnum(chr: string): number {
        switch (chr.toUpperCase()) {
            case 'Y':
                return this.dictionary;
            case 'Z':
                return this.dictionaryEscaped;
            case 'T':
                return this.table;
            case 'P':
                return this.player;
            case 'A':
                return this.angle;
            case 'V':
                return this.vector;
            case 'B':
                return this.tBoolean;
            case 'S':
                return this.tString;
            case 'N':
                return this.tNumber;
            default:
                return this.unset;
        }
    }

    static enumToChar(val: number): string {
        switch (val) {
            case this.dictionary:
                return 'Y';
            case this.dictionaryEscaped:
                return 'Z';
            case this.table:
                return 'T';
            case this.player:
                return 'P';
            case this.angle:
                return 'A';
            case this.vector:
                return 'V';
            case this.tBoolean:
                return 'B';
            case this.tString:
                return 'S';
            case this.tNumber:
                return 'N';
            default:
                return '';
        }
    }

    static enumToCSSClass(val: number): string {
        switch (val) {
            case this.dictionary:
                return this.cssPrefix + 'dict';
            case this.dictionaryEscaped:
                return this.cssPrefix + 'dictesc';
            case this.table:
                return this.cssPrefix + 'table';
            case this.player:
                return this.cssPrefix + 'player';
            case this.angle:
                return this.cssPrefix + 'angle';
            case this.vector:
                return this.cssPrefix + 'vector';
            case this.tBoolean:
                return this.cssPrefix + 'boolean';
            case this.tString:
                return this.cssPrefix + 'string';
            case this.tNumber:
                return this.cssPrefix + 'number';
            default:
                return this.cssPrefix + 'unset';
        }
    }
}
