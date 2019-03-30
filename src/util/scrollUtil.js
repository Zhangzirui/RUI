const el = document.createElement('div');

const upperFirstChar = (string) => string[0].toUpperCase() + string.slice(1);

export const getWraper = (children) => {
    if (children && children.length) {
        return children.length > 1;
    }
    return false;
};

// 通过 x, y 轴的变化计算移动的角度
export const getAngle = (xDistance, yDistance) => {
    return 180 * Math.atan2(yDistance, xDistance) / Math.PI;
};

// 获取 translate 样式的兼容前缀
export const getStylePre = (style) => {
    const _style = upperFirstChar(style);
    let pre = '';

    [style, 'Webkit' + _style, 'Moz' + _style, 'ms' + _style, 'O' + _style].some((item) => {
        if (item in el.style) {
            pre = item;
            return true;
        }
        return false;
    })[0];

    return pre;
};

export const getNewObj = (old, o) => {
    return {
        ...old,
        ...o
    };
};

export const getNow = () => {
    return Date.now();
};
