function dealPropType(prop) {
    const type = typeof prop;
    const pattern = /[a|e|i|o|u]/i;
    return pattern.test(type[0]) ? 'a ' + type : 'an ' + type;
}


const attributeError = (propsName, prop) => {
    throw new Error(`${propsName} shoule be ${dealPropType(prop)} !`);
};

const outOfRangeError = (name) => {
    throw new Error(`${name} is out of range !`);
};

const Log = {
    attributeError,
    outOfRangeError
};

export default Log;

