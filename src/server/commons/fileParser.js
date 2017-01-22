
/*
 * Copyright 2015 Alexander Pustovalov
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import _ from 'lodash';
import esprima from 'esprima';
import escodegen from 'escodegen';

// Executes visitor on the object and its children (recursively).
export function traverse(object, visitor) {

    visitor(object);

    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            let child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

export function getFileAst(fileData, filePath){
    // console.log(fileData);
    let result = null;
    try{
        result = esprima.parse(fileData, {tolerant: true, range: true, comment: true, jsx: true});
    } catch(e){
        if(filePath){
            throw Error('Can not parse file: ' + filePath + ', error: ' + e.message);
        } else {
            throw Error('Can not parse file, error: ' + e.message);
        }
    }
    return result;
}

export function validateSourceCode(fileData){
    try{
        esprima.parse(fileData, { tolerant: true, jsx: true });
    } catch(e){
        throw Error('File is not valid, error: ' + e.message);
    }
}


export function parse(inputData, options = {tolerant: true, range: false, comment: true, jsx: true}){
    return esprima.parse(inputData, options);
}

export function generate(ast){
    return escodegen.generate(ast, {comment: true});
}

