export const PROMP_GET_DATA = `From the following text return a JSON formatted text containing :
- the model from all theses models : \`%models%\` (by default GPT4),
- boolean if it should be connected to internet
- boolean if it should be public
- boolean if it should show sources
- the identity between theses three choices : "FREEDOM", "LIMITED", "STRICT"

The result will be formatted as followed : {
"model": string;
"internet": boolean;
"public": boolean;
"sources": boolean;
"identity": 'FREEDOM' | 'LIMITED' | 'STRICT';
}

The text is : "%text%"`;
