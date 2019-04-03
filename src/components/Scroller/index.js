import React, {Component} from 'react';
import {getNewObj, getAngle, getStylePre, getNow} from '../../util/scrollUtil';
import {Animate, Ease} from '../../util/animate';
import Log from '../../util/log';
import Validate from '../../util/validate';
import './scroller.css';

const LIMIT_VERTICAL_ANGLE = 60; // 上下滑动的最大角度
const LIMIT_HORIZONTAL_ANGLE = 30; // 左右滑动的最小角度

export default class Scroller extends Component {
    constructor(props) {
        super();
        this._initDefaultConfig(props);
        this._resetProps(props);
    }

    state = {
        stickyHeaderShow: false,
        activeHeaderIndex: -1
    }

    componentDidMount() {
        this.scrollInfo = {
            scrollHeight: this.scrollerDom.offsetHeight,
            scrollWidth: this.scrollerDom.offsetWidth,
            contentHeight: this.contentWrapDom.offsetHeight,
            contentWidth: this.contentWrapDom.offsetWidth,
            maxScroll: this.props.horizontal ? this.contentWrapDom.offsetWidth - this.scrollerDom.offsetWidth : this.contentWrapDom.offsetHeight - this.scrollerDom.offsetHeight
        };
        this._dealStickyHeader();
        document.body.addEventListener('touchmove', (e) => {
            e.preventDefault(); //阻止默认的处理方式(阻止下拉滑动的效果)
        }, {passive: false});
    }

    componentWillUnmount() {
    }

    /**
     * 初始化默认配置
     *
     * @memberof Scroller
     */
    _initDefaultConfig(props) {
        this.contentWrapStyle = {}; // 内容外面包一层 div 的样式
        this.transformKey = getStylePre('transform');
        this.x = 0; // 记录 scroll 滚动的位置
        this.y = 0;
        this.stickyHeaderX = 0; // 记录 stickyHeader 滚动的位置
        this.stickyHeaderY = 0;
        this.stickyHeaderContent = [];
        this.preventTouchMove = false; // 阻止 touchMove 事件
        this.preventTouchEnd = false; // 阻止 touchEnd 时间
        this.momentumLimitDis = 20; // 判定为惯性滚动的位移临界值
        this.friction = 0.006; // 惯性滚动时的摩擦系数
        this.bounceTime = 500; // 弹性动画所需时间
        this.momentumTime = 1000; // 惯性动画所需时间
        this.specMomentumTime = 300; // 可以引发弹性滚动行为造成的惯性滚动所需时间 （即滚动到边界时，快速滑动的动画时间）
        this.momentumOutDis = 70; // 可以引发弹性滚动行为造成的惯性滚动最大越界距离 （即滚动到边界时，快速滑动允许超越的边界距离）
        this.momentumLimitTime = 300; // 判定为惯性滚动的最大临界时间
        this.stickyHeaderScroll = false; // sticky header 是否允许滚动
        this.contentWrapStyle = { // contentWrap 的默认样式
            [this.transformKey]: 'translate3d(0px, 0px, 0px)',
            // backgroundColor: '#fff'
        };
        this.animate = new Animate({
            ease: Ease.swipe.fn,
            duration: 300,
            animateFn: () => {}
        });
    }

    /**
     * 根据传入的属性来重置配置
     *
     * @memberof Scroller
     */
    _resetProps(props) {
        const {children, isTranslate} = props;
        this.isTranslate = isTranslate;
        if (!this.transformKey) {
            this.isTranslate = false;
        }
    }


    /**
     * 初始化 stickyHeader 数据
     *
     * @returns
     * @memberof Scroller
     */
    _dealStickyHeader() {
        const {children, stickyHeaderIndex, stickyOffsetTop} = this.props;

        if (!Array.isArray(stickyHeaderIndex)) {
            Log.attributeError('stickyHeaderIndex', stickyHeaderIndex);
        }

        if (stickyHeaderIndex.length === 0) {
            return;
        }

        if (Math.max(...stickyHeaderIndex) > children.length) {
            Log.outOfRangeError('stickyHeaderIndex');
        }

        console.log('sticky Header');
        console.log(this.contentWrapDom);
        stickyHeaderIndex.map((item) => {
            const sticky = {
                offsetHeight: this.contentWrapDom.children[item].offsetHeight,
                offsetTop: this.contentWrapDom.children[item].offsetTop - stickyOffsetTop,
                content: React.cloneElement(children[item])
            };

            this.stickyHeaderContent.push(sticky);
        });
    }

    onTouchStart = (e) => {
        this._prevent(e);
        const point = e.touches ? e.touches[0] : e;
        this.touchInfo = [];
        this.pointX = point.pageX;
        this.pointY = point.pageY;

        this.preventTouchMove = false; // 重置属性
        this.preventTouchEnd = false;

        this.distanceX = 0;
        this.distanceY = 0;

        // 关于计算惯性滚动的
        this.mStartTime = getNow();
        this.mX = this.x;
        this.mY = this.y;
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
        const currentTime = getNow();

        if (currentTime - this.mStartTime >= this.momentumLimitTime) { // 将一次连续的滚动的时间以momentumLimitTime进行分割
            this.mStartTime = currentTime;
            this.mX = this.x;
            this.mY = this.y;
        }

        this.angle = getAngle(distanceY, distanceX);
        if (distanceX < 10 && distanceY < 10) { // 距离太短不形成触摸条件
            return;
        }

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

        // this._refreshSticky();

        if (Math.abs(this.delta) > this.momentumLimitDis) {
            console.log('强行触发end');
            this.preventTouchMove = true;
            this.onTouchEnd(e);
        }
    }

    onTouchEnd = (e) => {
        if (this.preventTouchEnd) {
            return;
        }
        this._prevent(e);
        this._dealEndEvent()
            .then(() => {
                this._elasticity(this.bounceTime);
            });
    }


    /**
     * 判断是否进行惯性滚动
     *
     * @returns
     * @memberof Scroller
     */
    _dealEndEvent() {
        const {horizontal} = this.props;

        this.mEndTime = getNow();

        const duration = this.mEndTime - this.mStartTime;
        const delta = horizontal ? this.x - this.mX : this.y - this.mY;
        const currentVal = horizontal ? this.x : this.y;

        console.log('duration: ', duration);
        console.log('delta: ', delta);

        if (duration < this.momentumLimitTime && Math.max(Math.abs(delta), Math.abs(this.delta)) > this.momentumLimitDis) {
            this.preventTouchEnd = true;
            return this._momentum(currentVal, delta, duration);
        }

        return Promise.resolve();
    }

    /**
     * 处理惯性滚动
     *
     * @param {*} currentVal 当前的位置
     * @param {*} delta 两次move间的距离
     * @param {*} duration 两次move间的时间
     * @returns
     * @memberof Scroller
     */
    _momentum(currentVal, delta, duration) {
        const {horizontal, bounce} = this.props;
        const {maxScroll} = this.scrollInfo;
        const speed = Math.abs(delta / duration);

        let dis = currentVal + speed / this.friction * (delta > 0 ? 1 : -1); // delta 小于 0 表示向下/右滚
        let scrollTime = this.specMomentumTime;

        if (dis > 0) {
            dis = bounce ? Math.min(this._getDis(0, dis - 0), this.momentumOutDis) : 0;
        } else if (dis < -maxScroll && delta < 0) { // 超过最大范围并且向下/右滚
            dis = bounce ? Math.max(this._getDis(-maxScroll, dis + maxScroll), -maxScroll - this.momentumOutDis) : -maxScroll;
        } else {
            scrollTime = this.momentumTime;
        }

        return this.scrollTo((horizontal ? {
            x: dis
        } : {
            y: dis
        }), scrollTime);
    }


    /**
     * 处理弹性滚动
     *
     * @param {*} duration
     * @param {*} ease
     * @memberof Scroller
     */
    _elasticity(duration, ease = Ease.bounce.fn) {
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

    _refreshSticky() {
        const stickyHeader = this.stickyHeaderContent;
        if (stickyHeader.length === 0) {
            return;
        }
        const {activeHeaderIndex, stickyHeaderShow} = this.state;
        const val = this.props.horizontal ? Math.abs(this.x) : Math.abs(this.y);
        let activeIndex = -1;

        // 获取stickyHeader中该展示内容的索引
        stickyHeader.some(({offsetTop}, index) => {
            const nextItem = stickyHeader[index + 1];

            if (nextItem !== void 0) {
                if (val >= offsetTop && val < nextItem.offsetTop) {
                    activeIndex = index;
                    return true;
                }
                return false;
            } else if (val > offsetTop) {
                activeIndex = index;
                return true;
            }
            return false;
        });

        // 切换 stickyHeader
        if (activeIndex !== -1 && activeIndex !== activeHeaderIndex) {
            console.log('切换 stickyHeader');
            this.stickyHeaderScroll = false;
            this._resetStyle(this.stickyDomWrap);
            this.setState({
                activeHeaderIndex: activeIndex
            });
            if (!stickyHeaderShow) {
                this.setState({
                    stickyHeaderShow: true
                });
            }
        } else if (activeIndex === -1) {
            this.setState({
                stickyHeaderShow: false,
                activeHeaderIndex: -1
            });
        }

        // 两个 stickyHeader 互换时的滚动交互
        if (activeIndex !== -1 && stickyHeader[activeIndex + 1]) {
            if (val > stickyHeader[activeIndex + 1].offsetTop - stickyHeader[activeIndex].offsetHeight) {
                // 下一个 stickyHeader 进入预定范围，让上一个 sticky header 可滚动
                if (!this.stickyHeaderScroll) {
                    this.stickyHeaderX = 0;
                    this.stickyHeaderY = 0;
                }
                this.stickyHeaderScroll = true;
            } else {
                this.stickyHeaderX = 0;
                this.stickyHeaderY = 0;
                this.stickyHeaderScroll = false;
                if (this.stickyDomWrap) {
                    this.stickyDomWrap.style = {};
                }
            }
        }
    }

    _move(delta) {
        const {horizontal} = this.props;
        let disX;
        let disY;
        let headerDisX;
        let headerDisY;
        // this.delta = delta; // 在一次整体滑动中delta最终为touchStart 和 touchEnd 的距离
        if (horizontal) {
            disY = 0;
            disX = this._getDis(this.x, delta);

            headerDisY = 0;
            headerDisX = this.stickyHeaderX + delta;
        } else {
            disX = 0;
            disY = this._getDis(this.y, delta);

            headerDisX = 0;
            headerDisY = this.stickyHeaderY + delta;
        }

        this.endX = disX;
        this.endY = disY;
        if (this.isTranslate) {
            this._translate(disX, disY);
            this.stickyHeaderScroll && this._headerTranslate(headerDisX, headerDisY);
        } else {
            // 使用absolute
        }
    }

    _getDis(val, delta) {
        const {bounce} = this.props;
        const {maxScroll} = this.scrollInfo;
        let res = val;

        if (val + delta > 0) { // 拉到上/左边界
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
        this._refreshSticky();
    }

    _headerTranslate(x, y) {
        const headerStyle = {
            [this.transformKey]: `translate3d(${x}px, ${y}px, 0px)`
        };

        this.stickyHeaderX = x > 0 ? 0 : x;
        this.stickyHeaderY = y > 0 ? 0 : y;
        this._setStyle(this.stickyDomWrap, headerStyle);
    }

    _resetStyle(dom) {
        if (dom) {
            dom.style = {};
        }
    }

    _setStyle(dom, style) {
        if (dom) {
            Object.keys(style).forEach((key) => {
                dom.style[key] = style[key];
            });
        }
    }

    getRef = (node) => {
        this.scrollerDom = node;
    }

    scrollTo({x, y}, duration = 500, ease = Ease.swipe.fn) {
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
        const {containerExtraClass, containerExtraStyle, stickyOffsetTop, children, bounce, bgTopText, bgBottomText} = this.props;
        const {stickyHeaderShow, activeHeaderIndex} = this.state;

        return (
            <div
                className={`scrollWrapStyle ${containerExtraClass}`}
                ref={this.getRef}
                onClick={this.onClick}
                onTouchStart={this.onTouchStart}
                onTouchMove={this.onTouchMove}
                onTouchEnd={this.onTouchEnd}
                style={containerExtraStyle}>
                {
                    bounce && bgTopText && (
                        <div className="bgText topText">{bgTopText}</div>
                    )
                }
                {
                    bounce && bgBottomText && (
                        <div className="bgText bottomText">{bgTopText}</div>
                    )
                }
                {
                    stickyHeaderShow && (
                        <div
                            className="stickyHeader"
                            ref={(node) => this.stickyDomWrap = node}
                            style={{
                                top: stickyOffsetTop
                            }}>
                            {this.stickyHeaderContent[activeHeaderIndex].content}
                        </div>
                    )
                }
                <div
                    ref={(node) => this.contentWrapDom = node}
                    style={this.contentWrapStyle}>
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
    momentum: true, // 是否允许惯性滚动
    bgTopText: '', // 开启弹性滚动后，背景上方提示文案
    bgBottomText: '', // 开启弹性滚动后，背景下方提示文案
    stickyHeaderIndex: [], // 固定头部索引
    stickyOffsetTop: 0 // 固定头部距离scroller顶部的距离
};
