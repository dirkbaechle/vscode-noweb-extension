
export function nowebText(key: string): string {
    let value = nwtext.get(key);

    if (value !== undefined) {
        return value;
    }
    return '';
}

const nwtext = new Map<string, string>([
    ['resdef', '@\n'+
               'Test\n'+
               '<<t>>=\n'+
               'xyz\n'+
               '<<abc>>\n'+
               '@\n'+
               '<<abc>>=\n'+
               'def'],
    ['muldef', '@\n'+
               'Test\n'+
               '<<t>>=\n'+
               'xyz\n'+
               '<<abc>>\n'+
               '\n'+
               '<<abc>>=\n'+
               'def\n\n'+
               '<<lmn>>=\n'+
               'some<<hjk>>\n']
]);
