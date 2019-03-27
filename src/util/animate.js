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
        const {duration, ease, animateFn, abort} = this;
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
            };
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
    quadratic: {
        style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fn: function(k) {
            return k * (2 - k);
        }
    },
    circular: {
        style: 'cubic-bezier(0.1, 0.57, 0.1, 1)',	// Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
        fn: function(k) {
            if(k > 1) {
                k = 1;
            }
            let _k = k - 1;

            return Math.sqrt(1 - (_k * _k));
        }
    },
    back: {
        style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fn: function(k) {
            let b = 4;
            let _k = k - 1;

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
    },
    elastic: {
        style: '',
        fn: function(k) {
            let f = 0.22;
            let e = 0.4;

            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }

            return (e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1);
        }
    }
};
