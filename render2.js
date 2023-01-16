// 帮助我们将createElement创建的对象渲染成真实dom
// import "utils.js";
document.write("<script type='text/javascript' src='utils.js'></script>");

/*
  render： 代表进行JS逻辑处理和构建整个fiber树的阶段，在这个阶段如果有用户响应 处理
  commit： 代表整个fiber树构建完成，正在往真实dom容器填入，这个过程不会去管用户的交互和优先级，整个过程不可中断
*/
let nextUnitOfWork = null;
let wipRoot = null; //代表整个fiber tree的根节点的引用
let currentRoot = null; //要保存的整个fiber tree
let deleteGroup = []; //被删除的fiber集合

/* render的任务其实还是一整个dom树，改变策略，通过render来开启一项自动工作的调度
   该调度任务会源源不断的进行dom的渲染，
   会在需要停止的时候停下来
*/
function render(element, container) {
  // 调度开关的开启取决于nextUnitOfWork有没有值
  // 所以我们要开启调度，即给nextUnitOfWork赋值
  wipRoot = {
    type: null,
    dom: container,
    parent: null, //父级fiber
    sibling: null, //兄弟fiber
    child: null, //子fiber
    effectTag: "placement",
    props: {
      children: [element],
    },
  };
  nextUnitOfWork = wipRoot;
}

/*
  wookLoop方法里我们可以用来提交整个fiber tree
  做类似于轮询的工作，查询nextUnitOfWork是否有值了
*/
function workLoop(deadline) {
  let shouldYield = false; //是否需要停止渲染
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
    // deadline是浏览器闲暇情况的一个参数，代表浏览器当前闲置的一个剩余的估计时间；
  }

  if (!nextUnitOfWork && wipRoot) {
    /*
      关于为什么 必须nextUnitOfWork必须为空
      中断渲染流程的时候 nextUnitOfWork还有值
      整个fiber树构建完成了 我们才会commit
    */
    commitRoot();
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
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom);
  // }
  //兄弟节点
  const elements = fiber.props.children;
  reconciliateChildren(fiber,elements);

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

function reconciliateChildren(wipRoot, element) {
  //拿到最近保存的虚拟dom树
  const oldFiber = wipRoot.alternate && wipRoot.alternate.child;
  let index = 0;
  let prevFiber = null;
  while (index < elements.length || oldFiber != null) {
    const el = elements[index];
    const isSameType = el && oldFiber && el.type === oldFiber.type;
    let newFiber = null;
    if (isSameType) {
      newFiber = {
        type: oldFiber.type,
        parent: wipRoot,
        child: null,
        sibling: null,
        props: el.props,
        alternate: oldFiber,
        effectTag: "update",
        dom: oldFiber.dom,
      };
    } else if (oldFiber && !isSameType) {
      oldFiber.effectTag = "delete";
      deleteGroup.push(oldFiber);
    } else {
      newFiber = {
        type: elements[index].type,
        props: elements[index].props,
        parent: wipRoot,
        child: null,
        sibling: null,
        effectTag: "placement",
        dom: null,
      };
    }
    if (index == 0) wipRoot.child = newFiber;
    else {
      prevFiber.sibling = newFiber;
    }
    prevFiber = newFiber;
    index++;
  }
}

function commitRoot() {
  commitWork(wipRoot.child);
  currentRoot = wipRoot; //清空之前保存
  wipRoot = null;
}
function commitWork(fiber) {
  if (!fiber) return;
  if (fiber.effectTag === "placement") {
    fiber.parent && fiber.parent.dom.appendChild(fiber.dom);
  } else if (fiber.effectTag === "update") {
  } else if (fiber.effectTag === "delete") {
    fiber.parent.dom.removeChild(fiber.dom);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function updateDom(dom, prevProps, nextProps) {
  const withoutChildrenPrevProps = Object.keys(prevProps).filter(
    (k) => k !== "children"
  );
  const withoutChildrenNextProps = Object.keys(nextProps).filter(
    (k) => K !== "children"
  );
  withoutChildrenPrevProps.forEach((k) => {
    if (k.startsWith("on")) {
      // 这代表是事件啊, 事件得悠着点
      const legalEventName = k.toLowerCase().substring(2); // 我们知道React里是以onClick这种来标注事件的, 我们只需要小写的click
      // 事件其实也分移除还是更新
      if (!(k in withoutChildrenNextProps)) {
        // 代表都没有了 我还留着干嘛啊
        dom.removeEventListener(legalEventName, prevProps[k]);
      } else {
        // 直接绑定
        dom.addEventListener(legalEventName, nextProps[k]);
      }
    } else if (!(k in withoutChildrenNextProps)) {
      dom[k] = "";
    } else {
      dom[k] = nextProps[k];
    }
  });
}

requestIdleCallback(workLoop);
