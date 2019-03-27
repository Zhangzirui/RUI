import React, {Component} from 'react';
import {getNewObj, getAngle, getStylePre} from '../../util/scrollUtil';
import {Animate, Ease} from '../../util/animate';

const LIMIT_VERTICAL_ANGLE = 60; // 上下滑动的最大角度
const LIMIT_HORIZONTAL_ANGLE = 30; // 左右滑动的最小角度

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
        console.log('maxScroll:', this.contentWrapDom.offsetHeight - this.scrollerDom.offsetHeight);
    }

    _resetProps() {
        const props = this.props;
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
        this._delta = 0; // 防止界面跳变，缓存非边界状态下的delta
    }


    onTouchStart = (e) => {
        this._prevent(e);
        const point = e.touches ? e.touches[0] : e;
        this.scrollStartTime = Date.now();
        this.pointX = point.pageX;
        this.pointY = point.pageY;
    }

    onTouchMove = (e) => {
        this._prevent(e);
        const props = this.props;
        const point = e.touches ? e.touches[0] : e;
        const {pageX, pageY} = point;
        const deltaX = pageX - this.pointX;
        const deltaY = pageY - this.pointY;
        const distanceX = Math.abs(deltaX);
        const distanceY = Math.abs(deltaY);


        this.angle = getAngle(distanceY, distanceX);
        if (distanceX < 10 && distanceY < 10) { // 距离太短不形成触摸条件
            return;
        }

        if (this.isAnimate) {
            this.animate.abort();
        }

        if (!props.horizontal && this.angle <= LIMIT_VERTICAL_ANGLE) {
            this._move(deltaY);
        } else if (props.horizontal && this.angle >= LIMIT_HORIZONTAL_ANGLE) {
            this._move(deltaX);
        }
    }

    onTouchEnd = (e) => {
        console.log('=========touchEnd ');
        this._prevent(e);

        this.x = this.endX;
        this.y = this.endY;
        this._delta = 0;
        // console.log(this.y);
        if (this.outOfRange && this.props.bounce) {
            this.outOfRange = false;
            if (this.horizontal) {
                this.scrollTo({
                    x: this.outOfRangeInfo.val
                });
            } else {
                this.scrollTo({
                    y: this.outOfRangeInfo.val
                });
            }
        }
    }

    _move(delta) {
        console.log('delta:', delta);
        const {horizontal, bounce} = this.props;
        let disX;
        let disY;
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
                res = delta > 0 ? val + this._delta + (delta - this._delta) / 3 : val + delta;
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
                res = delta < 0 ? val + this._delta + (delta - this._delta) / 3 : val + delta;
                this.outOfRange = true;
                this.outOfRangeInfo = {
                    val: -maxScroll
                };
            }
        } else {
            console.log('condition 3');
            res = val + delta;
            this._delta = delta;
        }

        return res;
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
        this.animate
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
    horizontal: false,
    onScroll: null,
    isTranslate: true,
    preventDefault: false,
    stopPropagation: true,
    bounce: true
};
