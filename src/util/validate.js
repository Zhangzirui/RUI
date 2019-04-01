function _validate(prop, type) {
    return Object.prototype.toString.call(prop) === `[object ${type}]`;
}


const Validate = {
    isObject: (prop) => _validate(prop, 'Object')
};

export default Validate;
