export class Animate {
    constructor(config) {
        this.config = config;
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
    }

    _getTime() {
        return Date.now();
    }

    begin() {
        const startTime = Date.now();
        const {duration, ease, animateFn} = this;
        let aniId = 0;
        return new Promise((resolve, reject) => {
            function step() {
                const currentTime = Date.now();
                let _c = ease((currentTime - startTime) / duration);
                if (_c >= 1) {
                    animateFn(1);
                    resolve();
                    return;
                }
                animateFn && animateFn(_c);
                aniId = requestAnimationFrame(step);
            }
            this.abort = () => {
                cancelAnimationFrame(aniId);
                animateFn && animateFn(0);
                reject('cancel animate');
            };
            step();
        });
    }

    reset(config) {
        this.config = {
            ...this.config,
            ...config
        };
        this._resetConfig(this.config);
        return this;
    }
}

export const Ease = {
    swipe: {
        style: 'cubic-bezier(0.23, 1, 0.32, 1)',
        fn: function(t) {
            return 1 + --t * t * t * t * t;
        }
    },
    back: {
        style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fn: function(k) {
            var b = 4;
            var _k = k - 1;
            return _k * _k * ((b + 1) * _k + b) + 1;
        }
    },
    bounce: {
        style: '',
        fn: function(k) {
            let y;
            let _k = k;

            if ((_k / 1) < (1 / 2.75)) {
                _k = _k / 1;
                y = 7.5625 * _k * _k;
            } else if (k < (2 / 2.75)) {
                _k -= (1.5 / 2.75);
                y = 7.5625 * _k * _k + 0.75;
            } else if (k < (2.5 / 2.75)) {
                _k -= (2.25 / 2.75);
                y = 7.5625 * _k * _k + 0.9375;
            } else {
                _k -= (2.625 / 2.75);
                y = 7.5625 * _k * _k + 0.984375;
            }

            return y;
        }
    }
};
