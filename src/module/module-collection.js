import Module from './module'
import { assert, forEachValue } from '../util'
// 调用 new Vuex.store(options) 时传入的options对象，用于构造ModuleCollection类

/**
 * ModuleCollection主要将传入的options对象整个构造为一个module对象，并循环调用 this.register([key], rawModule, false) 为其中的modules属性进行模块注册，使其都成为module对象，最后options对象被构造成一个完整的组件树
 */
export default class ModuleCollection {
  constructor (rawRootModule) {
    // register root module (Vuex.Store options)
    console.log(rawRootModule, '注册options')
    this.register([], rawRootModule, false) // 注册模块
  }

  get (path) { // 获取模块的上一级元素
    return path.reduce((module, key) => {
      return module.getChild(key)
    }, this.root) // 默认的父级元素是根元素
  }

  getNamespace (path) { // 获取到命名空间的路劲 root/user/
    let module = this.root
    return path.reduce((namespace, key) => {
      module = module.getChild(key)
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  }

  update (rawRootModule) {
    update([], this.root, rawRootModule)
  }

  register (path, rawModule, runtime = true) {
    if (process.env.NODE_ENV !== 'production') {
      assertRawModule(path, rawModule) // 断言是不是一个模块
    }
    // debugger
    /**
     * 创建了一个module.并且创建几个属性 __children  _rawModule
    */
    const newModule = new Module(rawModule, runtime)

    if (path.length === 0) {
      this.root = newModule // 如果path的长度为0表示这是root
    } else {
      const parent = this.get(path.slice(0, -1)) // 获取到父级的元素
      parent.addChild(path[path.length - 1], newModule) // 存放子节点
    }

    // register nested modules
    if (rawModule.modules) { // 存在嵌套的module开始注册
      forEachValue(rawModule.modules, (rawChildModule, key) => {  // key 表示模块名字
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }

  unregister (path) {
    const parent = this.get(path.slice(0, -1))
    const key = path[path.length - 1]
    if (!parent.getChild(key).runtime) return

    parent.removeChild(key)
  }
}

function update (path, targetModule, newModule) {
  if (process.env.NODE_ENV !== 'production') {
    assertRawModule(path, newModule)
  }
  // debugger

  // update target module
  targetModule.update(newModule)

  // update nested modules
  if (newModule.modules) {
    for (const key in newModule.modules) {
      if (!targetModule.getChild(key)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[vuex] trying to add a new module '${key}' on hot reloading, ` +
            'manual reload is needed'
          )
        }
        return
      }
      update(
        path.concat(key),
        targetModule.getChild(key),
        newModule.modules[key]
      )
    }
  }
}

const functionAssert = { // 函数的断言  对于 getters mutations 只能是函数  但是 actions可以是对象也可以是函数,是对象的话必须包含handler
  assert: value => typeof value === 'function',
  expected: 'function'
}

const objectAssert = { // 对象的断言
  assert: value => typeof value === 'function' ||
    (typeof value === 'object' && typeof value.handler === 'function'),
  expected: 'function or object with "handler" function'
}

const assertTypes = { // 断言
  getters: functionAssert,
  mutations: functionAssert,
  actions: objectAssert
}

function assertRawModule (path, rawModule) { // 检测模块的的getters mutations actions 类型是否正确
  Object.keys(assertTypes).forEach(key => {
    if (!rawModule[key]) return
    const assertOptions = assertTypes[key]

    forEachValue(rawModule[key], (value, type) => {
      assert(
        assertOptions.assert(value),
        makeAssertionMessage(path, key, type, value, assertOptions.expected)
      )
    })
  })
}

function makeAssertionMessage (path, key, type, value, expected) { // 断言之后的反馈
  let buf = `${key} should be ${expected} but "${key}.${type}"`
  if (path.length > 0) {
    buf += ` in module "${path.join('.')}"`
  }
  buf += ` is ${JSON.stringify(value)}.`
  return buf
}
