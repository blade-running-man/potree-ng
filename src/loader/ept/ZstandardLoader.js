import {EptBinaryLoader} from "./BinaryLoader";

export class EptZstandardLoader extends EptBinaryLoader {
    extension() {
        return '.zst';
    }

    workerPath() {
        return Potree.scriptPath + '/workers/EptZstandardDecoderWorker.js';
    }
};

