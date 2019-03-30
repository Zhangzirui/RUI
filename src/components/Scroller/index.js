import React, {Component} from 'react';
import {getNewObj, getAngle, getStylePre, getNow} from '../../util/scrollUtil';
import {Animate, Ease} from '../../util/animate';

const LIMIT_VERTICAL_ANGLE = 60; // 上下滑动的最大角度
const LIMIT_HORIZONTAL_ANGLE = 30; // 左右滑动的最小角度
const TOUCH_INFO_LENGTH = 60; // 限制 touchInfo 数组的长度

export default class Scroller extends Component {
    constructor() {
        super();
    }

    static contentInfo = {}

    componentWillMount() {
        this._resetProps();
        this.animate = new Animate({
            ease: Ease.circular.fn,
            duration: 300,
            animateFn: () => {}
        });
    }

    componentDidMount() {
        this.scrollInfo = {
            scrollHeight: this.scrollerDom.offsetHeight,
            scrollWidth: this.scrollerDom.offsetWidth,
            contentHeight: this.contentWrapDom.offsetHeight,
            contentWidth: this.contentWrapDom.offsetWidth,
            maxScroll: this.props.horizontal ? this.contentWrapDom.offsetWidth - this.scrollerDom.offsetWidth : this.contentWrapDom.offsetHeight - this.scrollerDom.offsetHeight
        };
    }

    _resetProps() {
        const {children, containerExtraStyle, isTranslate} = this.props;

        // this.wraper = getWraper(children);

        this.containerStyle = Object.assign({}, {
            overflow: 'hidden'
        }, containerExtraStyle);
        this.contentWrapStyle = {}; // 内容外面包一层 div 的样式
        this.transformKey = getStylePre('transform');
        this.isTranslate = isTranslate;
        if (!this.transformKey) {
            this.isTranslate = false;
        }
        this.x = 0;
        this.y = 0;
        this.preventTouchMove = false; // 阻止 touchMove 事件
        this.preventTouchEnd = false; // 阻止 touchEnd 时间
        this.momentumLimitDis = 15; // 产生惯性滚动的位移临界值
    }


    onTouchStart = (e) => {
        this._prevent(e);
        const point = e.touches ? e.touches[0] : e;
        this.touchInfo = [];
        this.scrollStartTime = getNow();
        this.pointX = point.pageX;
        this.pointY = point.pageY;

        this.preventTouchMove = false; // 重置属性
        this.preventTouchEnd = false;

        this.distanceX = 0;
        this.distanceY = 0;
    }

    onTouchMove = (e) => {
        if (this.preventTouchMove) {
            return;
        }

        this._prevent(e);
        const props = this.props;
        const point = e.touches ? e.touches[0] : e;
        const {pageX, pageY} = point;
        const deltaX = pageX - this.pointX; // delta 表示两次move触发前后的滑动距离
        const deltaY = pageY - this.pointY;

        this.pointX = pageX;
        this.pointY = pageY;
        this.distanceX += deltaX; // 记录一次整体滑动的距离
        this.distanceY += deltaY;

        const distanceX = Math.abs(this.distanceX);
        const distanceY = Math.abs(this.distanceY);

        this.scrollMoveTime = getNow();
        this.angle = getAngle(distanceY, distanceX);
        if (distanceX < 10 && distanceY < 10) { // 距离太短不形成触摸条件
            return;
        }

        console.log('this.touchMove');
        if (this.isAnimate) {
            this.animate.abort();
        }

        if (!props.horizontal && this.angle <= LIMIT_VERTICAL_ANGLE) {
            this._move(deltaY);
            this.delta = deltaY;
        } else if (props.horizontal && this.angle >= LIMIT_HORIZONTAL_ANGLE) {
            this._move(deltaX);
            this.delta = deltaX;
        }

        if (Math.abs(this.delta) > this.momentumLimitDis) {
            console.log('trigger end');
            this.preventTouchMove = true;
            this.onTouchEnd(e);
        }
    }

    onTouchEnd = (e) => {
        if (this.preventTouchEnd) {
            return;
        }
        this._prevent(e);
        this.scrollEndTime = getNow();
        this._dealEndEvent()
            .then(() => {
                this._elasticity();
            });
    }

    _dealEndEvent() {
        const {horizontal} = this.props;

        if (Math.abs(this.delta) < this.momentumLimitDis) { // 一次位移的距离小于限定距离，判定为非惯性滚动
            return Promise.resolve();
        }

        const currentVal = horizontal ? this.x : this.y;
        const duration = this.scrollEndTime - this.scrollMoveTime;

        this.preventTouchEnd = true;
        return this._momentum(currentVal, this.delta, duration);
    }


    /**
     * 处理惯性滚动
     *
     * @param {*} currentVal 当前的位置
     * @param {*} delta 两次move间的距离
     * @param {*} duration 两次move间的时间
     * @memberof Scroller
     */
    _momentum(currentVal, delta, duration) {
        const {horizontal, bounce} = this.props;
        const {maxScroll} = this.scrollInfo;
        const speed = Math.abs(delta / duration);
        const friction = 0.02; // 摩擦系数
        let dis = currentVal + speed / friction * (delta > 0 ? 1 : -1); // delta 小于 0 表示向下/右滚

        if (dis > 0) {
            dis = bounce ? Math.min(this._getDis(0, dis - 0), 50) : 0;
        } else if (dis < -maxScroll && delta < 0) { // 超过最大范围并且向下/右滚
            dis = bounce ? Math.max(this._getDis(-maxScroll, dis + maxScroll), -maxScroll - 50) : -maxScroll;
        }

        return this.scrollTo((horizontal ? {
            x: dis
        } : {
            y: dis
        }), 300);
    }


    /**
     * 处理弹性滚动
     *
     * @param {*} duration
     * @param {*} ease
     * @memberof Scroller
     */
    _elasticity(duration, ease) {
        if (this._judgeRange() && this.props.bounce) {
            this.outOfRange = false;
            if (this.horizontal) {
                this.scrollTo({
                    x: this.outOfRangeInfo.val
                }, duration, ease);
            } else {
                this.scrollTo({
                    y: this.outOfRangeInfo.val
                }, duration, ease);
            }
        }
    }


    _move(delta) {
        console.log('delta:', delta);
        const {horizontal} = this.props;
        let disX;
        let disY;
        // this.delta = delta; // 在一次整体滑动中delta最终为touchStart 和 touchEnd 的距离
        if (horizontal) {
            disY = 0;
            disX = this._getDis(this.x, delta);
        } else {
            disX = 0;
            disY = this._getDis(this.y, delta);
        }

        this.endX = disX;
        this.endY = disY;
        if (this.isTranslate) {
            this._translate(disX, disY);
        } else {
            // 使用absolute
        }
    }

    _getDis(val, delta) {
        const {bounce} = this.props;
        const {maxScroll} = this.scrollInfo;
        let res = val;

        if (val + delta > 0) { // 拉到上/左边界
            console.log('condition 1');
            if (!bounce) {
                res = 0;
            } else {
                res = delta > 0 ? val + delta / 3 : val + delta;
                this.outOfRange = true;
                this.outOfRangeInfo = {
                    val: 0
                };
            }
        } else if (val + delta < -maxScroll) { // 拉到下/右边界
            console.log('condition 2');
            if (!bounce) {
                res = -maxScroll;
            } else {
                res = delta < 0 ? val + delta / 3 : val + delta;
                this.outOfRange = true;
                this.outOfRangeInfo = {
                    val: -maxScroll
                };
            }
        } else {
            console.log('condition 3');
            res = val + delta;
        }

        return res;
    }

    _judgeRange() {
        const {horizontal} = this.props;
        const {maxScroll} = this.scrollInfo;
        if (horizontal && (this.x > 0 || this.x < -maxScroll)) {
            this.outOfRange = true;
            return true;
        } else if (!horizontal && (this.y > 0 || this.y < -maxScroll)) {
            this.outOfRange = true;
            return true;
        }
        return false;
    }

    _pushTouchInfo(info) {
        if (this.touchInfo.length > TOUCH_INFO_LENGTH) {
            this.touchInfo.shift();
        }
        this.touchInfo.push(info);
    }

    _translate(x, y) {
        if (typeof y === 'undefined') {
            y = this.horizontal ? 0 : x;
            x = this.horizontal ? x : 0;
        }
        this.contentWrapStyle = getNewObj(this.contentWrapStyle, {
            [this.transformKey]: `translate3d(${x}px, ${y}px, 0px)`
        });
        this._setStyle(this.contentWrapDom, this.contentWrapStyle);
        this.x = x;
        this.y = y;
    }

    _setStyle(dom, style) {
        Object.keys(style).forEach((key) => {
            dom.style[key] = style[key];
        });
    }

    getRef = (node) => {
        this.scrollerDom = node;
    }

    scrollTo({x, y}, duration = 500, ease = Ease.circular.fn) {
        let val = y;
        let startVal = this.y;
        if (this.horizontal) {
            val = x;
            startVal = this.x;
        }
        this.isAnimate = true;
        return this.animate
            .reset({
                animateFn: (c) => {
                    const dis = (val - startVal) * c + startVal;
                    this._translate(dis);
                    if (this.horizontal) { // 保证在动画过程中随时更新 this.x 和 this.y 的值
                        this.x = dis;
                        this.y = y;
                    } else {
                        this.x = x;
                        this.y = y;
                    }
                },
                duration,
                ease
            })
            .begin()
            .then(() => {
                this.isAnimate = false; // 动画结束
            });
    }

    _prevent(e) {
        const {preventDefault, stopPropagation} = this.props;

        if (preventDefault) {
            e.preventDefault();
        }
        if (stopPropagation) {
            e.stopPropagation();
        }
    }

    render() {
        const {containerExtraClass, children, ref} = this.props;
        return (
            <div
                ref={this.getRef}
                onClick={this.onClick}
                onTouchStart={this.onTouchStart}
                onTouchMove={this.onTouchMove}
                onTouchEnd={this.onTouchEnd}
                className={containerExtraClass}
                style={this.containerStyle}>
                <div
                    ref={(node) => this.contentWrapDom = node}>
                    {
                        children
                    }
                </div>
            </div>
        );
    }
};

Scroller.defaultProps = {
    x: 0,
    y: 0,
    containerExtraClass: '',
    containerExtraStyle: {},
    horizontal: false, // 是否为横向滚动
    onScroll: null,
    isTranslate: true,
    preventDefault: false,
    stopPropagation: true,
    bounce: true, // 是否允许弹性滚动
    momentum: true // 是否允许惯性滚动
};
