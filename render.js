// 帮助我们将createElement创建的对象渲染成真实dom

// import "utils.js";
document.write("<script type='text/javascript' src='utils.js'></script>");

// element:通过createElemnet创建的元素对象
// container 真实的dom容器

function render(element, container) {
  const isTextNode = checkIsTextNode(element);

  const rootDom = isTextNode
    ? document.createTextNode("")
    : document.createElement(element.type);
  // 需要区分文本节点和dom节点，因为文本节点没有setAttribute方法

  if (isTextNode) {
    rootDom.nodeValue = element.props.nodeValue; //????没懂为什么用props传值
    console.log(element.props);
  } else {
    // 如果是dom节点，我们将所有的props添加到真实的rootDom上，但是处理children
    const { children = [], ...restProps } = element.props;
    const attrs = Object.keys(restProps);
    attrs.forEach((k) => rootDom.setAttribute(k, restProps[k]));

    // 递归
    children.forEach((child) => render(child, rootDom));
  }
  container.appendChild(rootDom);
}
