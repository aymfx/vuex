import applyMixin from './mixin'
import devtoolPlugin from './plugins/devtool'
import ModuleCollection from './module/module-collection' // todo3
import { forEachValue, isObject, isPromise, assert, partial } from './util'
/** 先大体介绍下各个目录文件的功能：
 *   module：提供module对象与module对象树的创建功能；
 * plugins：提供开发辅助插件，如“时光穿梭”功能，state修改的日志记录功能等；
 *  helpers.js：提供action、mutations以及getters的查找API；
 * index.js：是源码主入口文件，提供store的各module构建安装；
 * mixin.js：提供了store在Vue实例上的装载注入；
 * util.js：提供了工具方法如find、deepCopy、forEachValue以及assert等方法。
 */
let Vue // bind on install 用于判断是否已经装载和减少全局作用域查找

export class Store {
  constructor (options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install(window.Vue) // 判断若处于浏览器环境下且加载过Vue，则执行install方法。
    }
    // 调用操作
    if (process.env.NODE_ENV !== 'production') {
      assert(
        Vue,
        `must call Vue.use(Vuex) before creating a store instance.`
      ) // 已经执行安装函数进行装载；
      assert(
        typeof Promise !== 'undefined',
        `vuex requires a Promise polyfill in this browser.` // 判断是否支持 promise
      )
      assert(
        this instanceof Store,
        `store must be called with the new operator.` // 实例必须通过new操作
      )
    }

    //  store internal state  仓库的状态  根据传入的参数
    const { plugins = [], strict = false } = options // 接受一些参数
    this._committing = false // 是否正在提交的标识符
    this._actions = Object.create(null) // actions操作对象
    this._actionSubscribers = [] // 订阅函数集合，Vuex提供了subscribe功能 订阅actions
    this._mutations = Object.create(null) // mutations操作对象
    this._wrappedGetters = Object.create(null) // 封装后的getters集合对象
    this._modules = new ModuleCollection(options) // Vuex支持store分模块传入，存储分析后的modules
    this._modulesNamespaceMap = Object.create(null) // 模块命名空间map
    this._subscribers = [] // 订阅函数集合，Vuex提供了subscribe功能
    this._watcherVM = new Vue() // Vue组件用于watch监视变化

    // bind commit and dispatch to self
    // 绑定两个方法  并且注入 store 实例  this.$store.dispatch/commit  封装替换原型中的dispatch和commit方法，将this指向当前store对象
    const store = this
    const { dispatch, commit } = this
    this.dispatch = function boundDispatch (type, payload) {
      // 分发 action
      return dispatch.call(store, type, payload) // todo
    }
    this.commit = function boundCommit (type, payload, options) {
      // 提交 mutation
      return commit.call(store, type, payload, options)
    }

    // strict mode
    this.strict = strict

    const state = this._modules.root.state

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    installModule(this, state, [], this._modules.root) // back

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreVM(this, state)

    // apply plugins
    plugins.forEach(plugin => plugin(this)) // 应用插件

    const useDevtools =
             options.devtools !== undefined
               ? options.devtools
               : Vue.config.devtools
    if (useDevtools) {
      devtoolPlugin(this)
    }
  }

  get state () {
    return this._vm._data.$$state
  }

  set state (v) {
    if (process.env.NODE_ENV !== 'production') {
      assert(
        false,
        `use store.replaceState() to explicit replace store state.`
      )
    }
  }
  /**
 *
 * @param {*} _type
 * @param {*} _payload
 * @param {*} _options
 * 该方法同样支持2种调用方法。先进行参数适配，判断触发mutation type，利用_withCommit方法执行本次批量触发mutation处理函数，并传入payload参数。执行完成后，通知所有_subscribers（订阅函数）本次操作的mutation对象以及当前的state状态，如果传入了已经移除的silent选项则进行提示警告
 */
  commit (_type, _payload, _options) {
    // check object-style commit
    const {
      // commit 方法
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options) // 结构一些数据

    const mutation = { type, payload }
    const entry = this._mutations[type]
    console.log(entry, this._mutations)
    if (!entry) {
      // 判断有没有这个方法  没有就报错
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    this._withCommit(() => {
      //
      debugger
      entry.forEach(function commitIterator (handler) {
        console.log(handler, '妈耶')
        handler(payload)
      })
    }) // 触发事件
    console.log(this._subscribers[0], '订阅')

    this._subscribers.forEach(sub => sub(mutation, this.state)) // 订阅者函数遍历执行，传入当前的mutation对象和当前的state

    if (
      process.env.NODE_ENV !== 'production' &&
             options &&
             options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
                 'Use the filter functionality in the vue-devtools'
      )
    }
  }
  /**
  *
  * @param {*} _type
  * @param {*} _payload
  * dispatch的功能是触发并传递一些参数（payload）给对应type的action。因为其支持2种调用方法，所以在dispatch中，先进行参数的适配处理，然后判断action type是否存在，若存在就逐个执行（注：上面代码中的this._actions[type] 以及 下面的 this._mutations[type] 均是处理过的函数集合
  */
  dispatch (_type, _payload) {
    // check object-style dispatch
    const { type, payload } = unifyObjectStyle(_type, _payload) // 结构一些数据

    const action = { type, payload }
    const entry = this._actions[type] // todo
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }

    try {
      this._actionSubscribers
        .filter(sub => sub.before) // 提供给工具
        .forEach(sub => sub.before(action, this.state))
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }

    const result =
             entry.length > 1
               ? Promise.all(entry.map(handler => handler(payload)))
               : entry[0](payload) // ii支持多个同名方法，按照注册的顺序依次触发 统一返回一个promse

    return result.then(res => {
      try {
        this._actionSubscribers
          .filter(sub => sub.after)
          .forEach(sub => sub.after(action, this.state))
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[vuex] error in after action subscribers: `)
          console.error(e)
        }
      }
      return res
    })
  }

  subscribe (fn) {
    return genericSubscribe(fn, this._subscribers)
  }

  subscribeAction (fn) {
    const subs = typeof fn === 'function' ? { before: fn } : fn
    return genericSubscribe(subs, this._actionSubscribers)
  }

  watch (getter, cb, options) {
    if (process.env.NODE_ENV !== 'production') {
      assert(
        typeof getter === 'function',
        `store.watch only accepts a function.`
      )
    }
    return this._watcherVM.$watch(
      () => getter(this.state, this.getters),
      cb,
      options
    )
  }

  replaceState (state) {
    this._withCommit(() => {
      this._vm._data.$$state = state
    })
  }

  registerModule (path, rawModule, options = {}) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(
        Array.isArray(path),
        `module path must be a string or an Array.`
      )
      assert(
        path.length > 0,
        'cannot register the root module by using registerModule.'
      )
    }

    this._modules.register(path, rawModule)
    installModule(
      this,
      this.state,
      path,
      this._modules.get(path),
      options.preserveState
    )
    // reset store to update getters...
    resetStoreVM(this, this.state)
  }

  unregisterModule (path) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(
        Array.isArray(path),
        `module path must be a string or an Array.`
      )
    }

    this._modules.unregister(path)
    this._withCommit(() => {
      const parentState = getNestedState(this.state, path.slice(0, -1))
      Vue.delete(parentState, path[path.length - 1])
    })
    resetStore(this)
  }

  hotUpdate (newOptions) {
    this._modules.update(newOptions)
    resetStore(this, true)
  }
  // 缓存执行时的committing状态将当前状态设置为true后进行本次提交操作，待操作完毕后，将committing状态还原为之前的状态。
  _withCommit (fn) {
    const committing = this._committing
    console.log(committing, fn, 122)
    this._committing = true // 进行本次提交，若不设置为true，直接修改state，strict模式下，Vuex将会产生非法修改state的警告
    fn()
    this._committing = committing
  }
}

function genericSubscribe (fn, subs) {
  if (subs.indexOf(fn) < 0) {
    subs.push(fn)
  }
  return () => {
    const i = subs.indexOf(fn)
    if (i > -1) {
      subs.splice(i, 1)
    }
  }
}

function resetStore (store, hot) {
  store._actions = Object.create(null)
  store._mutations = Object.create(null)
  store._wrappedGetters = Object.create(null)
  store._modulesNamespaceMap = Object.create(null)
  const state = store.state
  // init all modules
  installModule(store, state, [], store._modules.root, true)
  // reset vm
  resetStoreVM(store, state, hot)
}

function resetStoreVM (store, state, hot) {
  const oldVm = store._vm

  // bind store public getters
  store.getters = {}
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure enviroment.
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  const silent = Vue.config.silent
  Vue.config.silent = true
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    Vue.nextTick(() => oldVm.$destroy())
  }
}

function installModule (store, rootState, path, module, hot) {
  /**
   * 判断是否是根目录，以及是否设置了命名空间，若存在则在namespace中进行module的存储，在不是根组件且不是 hot 条件的情况下，通过getNestedState方法拿到该module父级的state，拿到其所在的 moduleName ，调用 Vue.set(parentState, moduleName, module.state) 方法将其state设置到父级state对象的moduleName属性中，由此实现该模块的state注册（首次执行这里，因为是根目录注册，所以并不会执行该条件中的方法）
   */
  const isRoot = !path.length // 判断是不是根目录
  const namespace = store._modules.getNamespace(path) //  this, state, [], this._modules.root
  debugger
  // register in namespace map
  if (module.namespaced) {
    if (
      store._modulesNamespaceMap[namespace] &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.error(
        `[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join(
          '/'
        )}`
      )
    }
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1)) // 获取到子元素的state 传给父级的module
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      Vue.set(parentState, moduleName, module.state)
    })
  }
  // 命名空间和根目录条件判断完毕后，接下来定义local变量和module.context的值，执行makeLocalContext方法，为该module设置局部的 dispatch、commit方法以及getters和state（由于namespace的存在需要做兼容处理）。
  const local = (module.context = makeLocalContext(store, namespace, path))

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}

/**
 * make localized dispatch, commit, getters and state
 * if there is no namespace, just use root ones
 */
function makeLocalContext (store, namespace, path) {
  const noNamespace = namespace === ''

  const local = {
    dispatch: noNamespace
      ? store.dispatch
      : (_type, _payload, _options) => {
        const args = unifyObjectStyle(_type, _payload, _options)
        const { payload, options } = args
        let { type } = args

        if (!options || !options.root) {
          type = namespace + type
          if (
            process.env.NODE_ENV !== 'production' &&
              !store._actions[type]
          ) {
            console.error(
              `[vuex] unknown local action type: ${args.type}, global type: ${type}`
            )
            return
          }
        }

        return store.dispatch(type, payload)
      },

    commit: noNamespace
      ? store.commit
      : (_type, _payload, _options) => {
        const args = unifyObjectStyle(_type, _payload, _options)
        const { payload, options } = args
        let { type } = args

        if (!options || !options.root) {
          type = namespace + type
          if (
            process.env.NODE_ENV !== 'production' &&
              !store._mutations[type]
          ) {
            console.error(
              `[vuex] unknown local mutation type: ${args.type}, global type: ${type}`
            )
            return
          }
        }

        store.commit(type, payload, options)
      }
  }

  // getters and state object must be gotten lazily
  // because they will be changed by vm update
  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace)
    },
    state: {
      get: () => getNestedState(store.state, path)
    }
  })

  return local
}

function makeLocalGetters (store, namespace) {
  const gettersProxy = {}

  const splitPos = namespace.length
  Object.keys(store.getters).forEach(type => {
    // skip if the target getter is not match this namespace
    if (type.slice(0, splitPos) !== namespace) return

    // extract local getter type
    const localType = type.slice(splitPos)

    // Add a port to the getters proxy.
    // Define as getter property because
    // we do not want to evaluate the getters in this time.
    Object.defineProperty(gettersProxy, localType, {
      get: () => store.getters[type],
      enumerable: true
    })
  })

  return gettersProxy
}

function registerMutation (store, type, handler, local) {
  // todo2
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload)
  })
}

function registerAction (store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = [])
  entry.push(function wrappedActionHandler (payload, cb) {
    let res = handler.call(
      store,
      {
        dispatch: local.dispatch,
        commit: local.commit,
        getters: local.getters,
        state: local.state,
        rootGetters: store.getters,
        rootState: store.state
      },
      payload,
      cb
    )
    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }
    if (store._devtoolHook) {
      return res.catch(err => {
        store._devtoolHook.emit('vuex:error', err)
        throw err
      })
    } else {
      return res
    }
  })
}

function registerGetter (store, type, rawGetter, local) {
  if (store._wrappedGetters[type]) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate getter key: ${type}`)
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter (store) {
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters // root getters
    )
  }
}

function enableStrictMode (store) {
  store._vm.$watch(
    function () {
      return this._data.$$state
    },
    () => {
      if (process.env.NODE_ENV !== 'production') {
        assert(
          store._committing,
          `do not mutate vuex store state outside mutation handlers.`
        )
      }
    },
    { deep: true, sync: true }
  )
}

function getNestedState (state, path) {
  return path.length ? path.reduce((state, key) => state[key], state) : state
}

function unifyObjectStyle (type, payload, options) {
  if (isObject(type) && type.type) {
    // 如果type 是对象  那么相当与  type = {type,params}
    options = payload
    payload = type
    type = type.type
  }

  if (process.env.NODE_ENV !== 'production') {
    assert(
      typeof type === 'string',
      `expects string as the type, but found ${typeof type}.`
    )
  }

  return { type, payload, options }
}

export function install (_Vue) {
  // 判断只能安装一次 同时赋值操作 Vue  将局部Vue变量赋值为全局的Vue对象，并执行applyMixin方法，install实现如下
  if (Vue && _Vue === Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue) // 对原型进行注入的操作
}
