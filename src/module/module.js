import { forEachValue } from '../util'

// Base data struct for store's module, package with some attribute and method
export default class Module {
  constructor (rawModule, runtime) {
    // debugger
    this.runtime = runtime
    // Store some children item
    this._children = Object.create(null) // 创建一个子模块
    // Store the origin module object which passed by programmer
    this._rawModule = rawModule // 存储原始的store module
    const rawState = rawModule.state  // 取出 state

    // Store the origin module's state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {} // 存放store的state
  }

  get namespaced () { // 判断是否有命名空间
    return !!this._rawModule.namespaced
  }

  addChild (key, module) { // 添加子节点
    this._children[key] = module
  }

  removeChild (key) { // 移除子节点
    delete this._children[key]
  }

  getChild (key) {
    return this._children[key] // 获取到元素子节点
  }

  update (rawModule) { // 赋值新的模块
    this._rawModule.namespaced = rawModule.namespaced
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters
    }
  }

  forEachChild (fn) {
    forEachValue(this._children, fn)
  }

  forEachGetter (fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn)
    }
  }

  forEachAction (fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn)
    }
  }

  forEachMutation (fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn)
    }
  }
}
