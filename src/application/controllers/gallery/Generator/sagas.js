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

import { fork, take, call, put, cancel } from 'redux-saga/effects';
import { SagaCancellationException } from 'redux-saga';
import * as actions from './actions.js';
import * as spinnerActions from '../../app/AppSpinner/actions.js';
import * as messageActions from '../../app/AppMessage/actions.js';
import * as generatorListActions from '../GeneratorList/actions.js';
import * as metadataFormActions from '../MetadataForm/actions.js';
import * as appContainerActions from '../../app/AppContainer/actions.js';
import * as deskPageActions from '../../workspace/DeskPage/actions.js';
import * as clipboardIndicatorActions from '../../workspace/ClipboardIndicator/actions.js';
import * as libraryPanelActions from '../../workspace/LibraryPanel/actions.js';
import { serverApi, graphApi, coockiesApi } from '../../../api';


function* pregenerate(){
    while(true){
        const {payload: {generatorId, groupName, componentName, version, model}} = yield take(actions.PREGENERATE);
        yield put(spinnerActions.started('Retrieving metadata'));
        try {
            const pregeneratedData = yield call(serverApi.pregenerate, generatorId, version, groupName, componentName, model);
            yield put(metadataFormActions.setSelectedGenerator({
                generatorId,
                groupName,
                componentName,
                version,
                metaData: pregeneratedData.metaData,
                metaHelp: pregeneratedData.metaHelp
            }));
            yield put(actions.stepToStage(actions.STAGE2));
            let recentGenerators = coockiesApi.addToRecentGenerators(generatorId);
            yield put(generatorListActions.setRecentGenerators(recentGenerators));
        } catch(error) {
            yield put(messageActions.failed('Metadata retrieving has an error. ' + (error.message ? error.message : error)));
        }
        yield put(spinnerActions.done('Retrieving metadata'));
    }
}

function* generate(){
    while(true){
        const {payload: {generatorId, version, groupName, componentName, modelNode, metaData}} = yield take(actions.GENERATE);
        yield put(spinnerActions.started('Generating the source code'));
        try {
            const generatedData = yield call(serverApi.generate, generatorId, version, groupName, componentName, modelNode, metaData);
            // console.log(JSON.stringify(generatedData));
            yield put(actions.setGeneratedData(generatedData));
            yield put(actions.stepToStage(actions.STAGE3));
        } catch(error) {
            yield put(messageActions.failed('The source code generation has an error. ' + (error.message ? error.message : error)));
        }
        yield put(spinnerActions.done('Generating the source code'));
    }
}

// function* remove(){
//     while(true){
//         const {payload: {generatorId}} = yield take(actions.REMOVE_GENERATOR);
//         yield put(spinnerActions.started('Removing generator from the market'));
//         try {
//             yield call(serverApi.removeGenerator, generatorId);
//             let generatorsList = yield call(serverApi.getAvailableGeneratorsList);
//             const recentGenerators = coockiesApi.getRecentGenerators();
//             yield put(generatorListActions.setGenerators(generatorsList, recentGenerators));
//             yield put(appContainerActions.showGenerator());
//         } catch(error) {
//             yield put(messageActions.failed(error.message ? error.message : error));
//         }
//         yield put(spinnerActions.done('Removing generator from the market'));
//     }
// }

function* saveGenerated(){
    while(true){
        const {payload: {selectedKey, groupName, componentName, files, dependencies}} = yield take(actions.SAVE_GENERATED);
        yield put(spinnerActions.started('Installing & saving the source code'));
        try {
            yield call(serverApi.saveGenerated, groupName, componentName, files, dependencies);
            const response = yield call(serverApi.loadComponentTree);
            yield put(libraryPanelActions.setComponents(response));
            let componentDefaults = response.componentDefaultsMap.get(componentName);
            if(!componentDefaults || componentDefaults.length <= 0){
                throw Error('Generated component does not have a valid model.');
            }
            graphApi.changeModelNodeType(selectedKey, componentName, componentDefaults[0]);
            yield put(clipboardIndicatorActions.removeClipboardKeys());
            yield put(libraryPanelActions.loadComponents());
            yield put(deskPageActions.setReloadPageRequest());
            yield put(actions.hide());
        } catch(error) {
            yield put(messageActions.failed('Source code installation has an error. ' + (error.message ? error.message : error)));
        }
        yield put(spinnerActions.done('Installing & saving the source code'));
    }
}

function* loadGenerators(){
    while(true){
        const {payload: options} = yield take(actions.LOAD_GENERATORS);
        yield put(spinnerActions.started('Loading generators'));
        try {
            let generatorsList = yield call(serverApi.getAvailableGeneratorsList, options.searchText);
            const recentGenerators = coockiesApi.getRecentGenerators();
            yield put(generatorListActions.setGenerators(generatorsList, recentGenerators));
            yield put(appContainerActions.showGenerator());
        } catch(error) {
            yield put(messageActions.failed('Generators loading has an error. ' + (error.message ? error.message : error)));
        }
        yield put(spinnerActions.done('Loading generators'));
    }
}

// function* loadAllGenerators(){
//     while(true){
//         yield take(actions.LOAD_ALL_GENERATORS);
//         yield put(spinnerActions.started('Loading generators'));
//         try {
//             let generatorsList = yield call(serverApi.getAvailableGeneratorsList);
//             let scaffoldGeneratorsList = yield call(serverApi.getAvailableGeneratorGenerics);
//             const recentGenerators = coockiesApi.getRecentGenerators();
//             yield put(generatorListActions.setGenerators(generatorsList));
//             yield put(generatorListActions.setRecentGenerators(recentGenerators));
//             yield put(generatorListActions.setScaffoldGenerators(scaffoldGeneratorsList));
//             yield put(appContainerActions.showGenerator());
//         } catch(error) {
//             yield put(messageActions.failed('Generators loading has an error. ' + (error.message ? error.message : error)));
//         }
//         yield put(spinnerActions.done('Loading generators'));
//     }
// }

// main saga
export default function* mainSaga() {
    yield fork(loadGenerators);
    // yield fork(loadAllGenerators);
    yield fork(pregenerate);
    yield fork(generate);
    // yield fork(remove);
    yield fork(saveGenerated);
};
