// 帮助我们将createElement创建的对象渲染成真实dom

// import "utils.js";
document.write("<script type='text/javascript' src='utils.js'></script>");

// element:通过createElemnet创建的元素对象
// container 真实的dom容器

function render1(element, container) {
  const isTextNode = checkIsTextNode(element);

  const dom = isTextNode
    ? document.createTextNode("")
    : document.createElement(element.type);
  // 需要区分文本节点和dom节点，因为文本节点没有setAttribute方法

  if (isTextNode) {
    dom.nodeValue = element.props.nodeValue; //????没懂为什么用props传值
    console.log(element.props);
  } else {
    // 如果是dom节点，我们将所有的props添加到真实的dom上，但是处理children
    const { children = [], ...restProps } = element.props;
    const attrs = Object.keys(restProps);
    attrs.forEach((k) => dom.setAttribute(k, restProps[k]));

    // 递归
    children.forEach((child) => render(child, dom));
  }
  container.appendChild(dom);
}

//render之前的写法没办法中断

let nextUnitOfWork = null;
// render的任务其实还是一整个dom树，改变策略，通过render来开启一项自动工作的调度
// 该调度任务会源源不断的进行dom的渲染，
// 会在需要停止的时候停下来
function render(element, container) {
  // 调度开关的开启取决于nextUnitOfWork有没有值
  // 所以我们要开启调度，即给nextUnitOfWork赋值
  nextUnitOfWork = {
    type: null,
    dom: container,
    parent: null, //父级fiber
    sibling: null, //兄弟fiber
    child: null, //子fiber
    effectTag: "placement", //在更新阶段会使用到的一个fiber标记，placement表示新增节点
    props: {
      children: [element],
    },
  };
}

// 需要一个函数来 做类似于轮询的工作，查询nextUnitOfWork是否有值了
// deadline 是requestIdleCallback给我们传的一个参数
function workLoop(deadline) {
  let shouldYield = false; //是否需要停止渲染
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);

    shouldYield = deadline.timeRemaining() < 1;
    // deadline是浏览器闲暇情况的一个参数，它里面的timeRemaining方法的调用会返回一个毫秒数
    // 代表浏览器当前闲置的一个剩余的估计时间；
  }
  requestIdleCallback(workLoop);
}

function createDom(fiber) {
  const isTextNode = checkIsTextNode(fiber);
  const domElement = isTextNode
    ? document.createTextNode("")
    : document.createElement(fiber.type);

  if (isTextNode) {
    domElement.nodeValue = fiber.props.nodeValue;
  } else {
    const { children = [], ...attrs } = fiber.props;
    Object.keys(attrs).forEach((key) =>
      domElement.setAttribute(key, attrs[key])
    );
  }
  return domElement;
}

function performUnitOfWork(fiber) {
  fiber.dom == null && (fiber.dom = createDom(fiber));
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }
  //兄弟节点
  const elements = fiber.props.children;
  let index = 0;
  let prevFiber = null;
  while (index < elements.length) {
    let newFiber = {
      type: elements[index].type,
      props: elements[index].props,
      parent: fiber, //父节点就是本次的fiber
      child: null,
      sibling: null,
      effectTag: "placement",
    };
    if (index == 0) fiber.child = newFiber;
    else {
      prevFiber.sibling = newFiber;
    }
    prevFiber = newFiber;
    index++;
  }
  //还需要将下一次调度的nextUnitofWork返回出去
  if (fiber.child) return fiber.child;
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}
requestIdleCallback(workLoop);
