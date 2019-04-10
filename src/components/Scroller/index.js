import React, {Component} from 'react';
import {getNewObj, getAngle, getStylePre} from '../../util/scrollUtil';

const LIMIT_VERTICAL_ANGLE = 60; // 上下滑动的最小角度
const LIMIT_HORIZONTAL_ANGLE = 30; // 左右滑动的最大角度

export default class Scroller extends Component {
    constructor() {
        super();
    }

    static contentInfo = {}

    componentWillMount() {
        this._resetProps();

    }

    componentDidMount() {
        this.scrollInfo = {
            scrollHeight: this.scrollerDom.offsetHeight,
            scrollWidth: this.scrollerDom.offsetWidth,
            contentHeight: this.contentWrapDom.offsetHeight,
            contentWidth: this.contentWrapDom.offsetWidth
        };
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
        if (distanceX < 10 && distanceY < 10) {
            return;
        }
        if (!props.horizontal && this.angle <= LIMIT_VERTICAL_ANGLE) {
            this._move(this.x + deltaX, this.y + deltaY, deltaY);
        } else if (props.horizontal && this.angle >= LIMIT_HORIZONTAL_ANGLE) {
            this._move(this.x + deltaX, this.y + deltaY, deltaX);
        }
    }

    onTouchEnd = (e) => {
        this._prevent(e);
        this.x = this.endX;
        this.y = this.endY;
    }

    getRef = (node) => {
        this.scrollerDom = node;
    }

    scrollTo({x, y}, duration, easing) {

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

    _move = (x, y) => {
        const {scrollHeight, scrollWidth, contentHeight, contentWidth} = this.scrollInfo;
        const {horizontal, bounce} = this.props;
        let delta = 0;
        if (horizontal) {
            delta = bounce ? x / 3 : 0;
            y = 0;
            x = x > 0 ? 0 + delta : Math.min(x, scrollWidth - contentWidth - delta);
        } else {
            delta = bounce ? y / 3 : 0;
            x = 0;
            y = y > 0 ? 0 + delta : Math.max(y, scrollHeight - contentHeight - delta);
        }

        this.endX = x;
        this.endY = y;
        if (this.isTranslate) {
            this._translate(x, y);
        } else {
            // 使用absolute
        }
    }

    _translate(x, y) {
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
