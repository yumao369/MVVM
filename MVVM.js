//数据一变应该要重新编译，即数据劫持需要跟编译有关系
//即发布订阅，观察者模式，观察者，被观察者
class Dep {
  constructor() {
    this.subs = []; //存放所有的watcher
  }
  //订阅
  addSub(watcher) {
    this.subs.push(watcher);
  }
  //发布
  notify() {
    this.subs.forEach((watcher) => watcher.update());
  }
}

class Watcher {
  constructor(vm, expr, cb) {
    //cb即回调函数callback
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    //默认先存放一个老值，只有当新值和老值不一样是才调回调函数
    this.oldValue = this.get();
  }
  get() {
    let value = CompileUtil.getVal(this.vm, this.expr);
    return value;
  }
  update() {
    let newVal = CompileUtil.getVal(this.vm, this.expr);
    if (newVal !== this.oldValue) {
      this.cb(newVal);
    }
  }
}

class Observer {
  //实现数据劫持
  constructor(data) {
    this.observer(data);
  }
  observer(data) {
    if (data && typeof data == "object") {
      //如果是对象才观察
      for (let key in data) {
        this.defineReactive(data, key, data[key]);
      }
    }
  }
  defineReactive(obj, key, value) {
    this.observer(value);
    Object.defineProperty(obj, key, {
      get() {
        return value;
      },
      set: (newVal) => {
        if (newVal != value) {
          this.observer(newVal);
          value = newVal;
        }
      },
    });
  }
}

class Compiler {
  constructor(el, vm) {
    //判断el属性，是不是一个元素
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    //把当前节点中的元素，获取到，放入内存
    this.vm = vm;
    let fragment = this.node2fragment(this.el);
    //把节点中的内容进行替换
    //编译模板，用数据进行编译
    this.compile(fragment);
    //把内容再塞入页面中
    this.el.appendChild(fragment);
  }
  isDirective(attrName) {
    return attrName.startsWith("v-");
  }
  //编译元素
  compileElement(node) {
    let attributes = node.attributes;
    [...attributes].forEach((attr) => {
      let { name, value: expr } = attr; //expr是value的表达式，school.name
      //判断有v指令的元素
      if (this.isDirective(name)) {
        let [, directive] = name.split("-");
        CompileUtil[directive](node, expr, this.vm);
      }
    });
  }

  //编译文本
  compileText(node) {
    //判断当前文本中的内容是否包含{{}}
    let content = node.textContent;
    if (/\{\{(.+?)\}\}/.test(content)) {
      //找到所有带{{}}的文本
      CompileUtil["text"](node, content, this.vm);
    }
  }

  //编译方法
  compile(node) {
    //编译内存中的dom节点
    let childNodes = node.childNodes;
    [...childNodes].forEach((child) => {
      if (this.isElementNode(child)) {
        //编译元素，v-model
        this.compileElement(child);
        //如果是元素的话，需要把自己传进去，去遍历子节点,递归
        this.compile(child);
      } else {
        //编译文本，{{}}
        this.compileText(child);
      }
    });
  }

  //把节点移动到内存中
  node2fragment(node) {
    let fragment = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = node.firstChild)) {
      fragment.appendChild(firstChild);
    }
    return fragment;
  }
  isElementNode(node) {
    //是不是元素节点
    return node.nodeType === 1;
  }
}

CompileUtil = {
  getVal(vm, expr) {
    return expr.split(".").reduce((data, current) => {
      return data[current];
    }, vm.$data);
  },
  model(node, expr, vm) {
    //node是节点，expr是表达式，vm是当前实例
    //给输入框赋予value属性
    let fn = this.updater["modelUpdater"];
    let value = this.getVal(vm, expr);
    fn(node, value);
  },
  html() {},
  text(node, expr, vm) {
    //expr=>{{a}} {{b}}
    let fn = this.updater["textUpdater"];
    let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(vm, args[1]);
    });
    fn(node, content);
  },
  updater: {
    //把数据插入到节点中
    modelUpdater(node, value) {
      node.value = value;
    },
    htmlUpdater() {},
    //处理文本节点
    textUpdater(node, value) {
      node.textContent = value;
    },
  },
};

//基类
class Vue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;
    //存在根元素，则编译模板
    if (this.$el) {
      //把数据全部转换成用Object.defineProperty来定义
      console.log(this.$data);
      new Observer(this.$data);
      console.log(this.$data);
      new Compiler(this.$el, this);
    }
  }
}
