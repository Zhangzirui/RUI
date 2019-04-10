export default class Animate {
    constructor(config) {
        this._resetConfig(config);
    }

    _resetConfig(config) {
        const {ease = (val) => val, duration = 1000, animateFn} = config;

        if (typeof animateFn !== 'function') {
            throw new Error('animateFn is not function');
        }

        this.ease = ease;
        this.duration = duration;
        this.animateFn = animateFn;
        this.abort = false;
    }

    _getTime() {
        return Date.now();
    }

    begin() {
        const startTime = Date.now();
        const {duration, ease, animateFn, abort} = this;
        const step = new Promise(function _step(resolve, reject) {
            const currentTime = Date.now();
            let _c = ease((currentTime - startTime) / duration);
            if (_c >= 1) {
                resolve();
            }
            if (abort) {
                this.abort = false;
                reject();
            }
            animateFn && animateFn();
            requestAnimationFrame(_step);
        });

        step();
    }

    abort() {
        this.abort = true;
    }
}