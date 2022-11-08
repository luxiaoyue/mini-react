function createTextNode(textValue) {
  // 简化了babel的转译部分
  return {
    type: "text",
    props: {
      nodeValue: textValue,
      children: [],
    },
  };
}
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        Object.getPrototypeOf(child) === Object.prototype
          ? child
          : createTextNode(child)
      ),
    },
  };
}
