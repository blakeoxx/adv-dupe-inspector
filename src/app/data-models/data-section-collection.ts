import * as _ from 'lodash';

export class DataSectionCollection
{
    public Info: Record<string, string>;
    public 'More Information': Record<string, string>;
    public Save: {Entities: string[], Constraints: string[]};
    public Dict: Record<string, string>;
    public OtherSections: Record<string, string>;

    constructor()
    {
        this.Info = {};
        this['More Information'] = {};
        this.Save = {Entities:[], Constraints:[]};
        this.Dict = {};
        this.OtherSections = {};
    }

    isSectionExpected(sectionName: string)
    {
        return (sectionName !== 'OtherSections' && this.hasOwnProperty(sectionName));
    }

    getExpectedSections()
    {
        return Object.getOwnPropertyNames(this).filter(v => v !== 'OtherSections');
    }

    isSectionSet(sectionName: string)
    {
        if (sectionName !== 'OtherSections' && this.hasOwnProperty(sectionName))
        {
            // @ts-ignore: We know this[sectionName] exists because we checked for it
            return _.isEmpty(this[sectionName]);
        }
        else if (this.OtherSections.hasOwnProperty(sectionName))
        {
            return _.isEmpty(this.OtherSections[sectionName]);
        }
        return false;
    }

    setSection(sectionName: string, sectionBody: string)
    {
        const result = {warnings:[] as string[]};

        if (this.isSectionExpected(sectionName))
        {
            // Convert data section values from arrays of strings into key-value pairs
            const kvsResult = this.stringArrayToKV(sectionBody.split('\n'));
            result.warnings.push(...kvsResult.warnings);

            if (sectionName === 'Save')
            {
                if (kvsResult.result.Entities !== undefined)
                {
                    const strArrResult = this.edictStringToStringArray(kvsResult.result.Entities);
                    this.Save.Entities = strArrResult.result;
                    result.warnings.push(...strArrResult.warnings.map(v => 'Entities '+v));
                }

                if (kvsResult.result.Constraints !== undefined)
                {
                    const strArrResult = this.edictStringToStringArray(kvsResult.result.Constraints);
                    this.Save.Constraints = strArrResult.result;
                    result.warnings.push(...strArrResult.warnings.map(v => 'Constraints '+v));
                }
            }
            else
            {
                // @ts-ignore: We know this[sectionName] exists and takes this type
                this[sectionName] = kvsResult.result;
            }
        }
        else
        {
            this.OtherSections[sectionName] = sectionBody;
        }

        return result;
    }

    // Takes an array of strings formatted as "key:value", and returns an object{result, warnings[]}.
    //  Object.result has properties named after keys holding values without surrounding quotes
    private stringArrayToKV(arr: string[])
    {
        const result = {result:{} as Record<string, string>, warnings:[] as string[]};
        arr.forEach((str) => {
            let splitIdx = str.indexOf(':');
            if (splitIdx < 0 || splitIdx === str.length-1)
            {
                result.warnings.push('Key "'+str+'" has no value'); splitIdx = (splitIdx<0?str.length:splitIdx);
            }
            else if (splitIdx === 0) result.warnings.push('Value "'+str+'" has no key');

            const key = str.slice(0, splitIdx);
            const val = str.slice(splitIdx+1);
            if (result.result[key] !== undefined) result.warnings.push('Key "'+key+'" was defined multiple times');
            result.result[key] = val.replace(/(^\")|(\"$)/g, '');
        });
        return result;
    }

    // Takes a string formatted as "A{type:value;...;}B{type:value;...;}", and returns an object{result[], warnings[]}.
    //  Object.result is an array of strings formatted as ["A{type:value;...;}", "B{type:value;...;}"]
    private edictStringToStringArray(str: string)
    {
        const result = {result:[] as string[], warnings:[] as string[]};
        result.result = str.match(/.+?{.*?}/g) ?? [str];
        if (result.result[0] === str) result.warnings.push('Edict string contained no edicts');

        // Include a parse warning if we didn't match the entire string
        let totalLength = 0;
        result.result.forEach((v) => totalLength+=v.length);
        if (totalLength < str.length) result.warnings.push('Edict string contained some junk data, which we removed');

        return result;
    }
}
