// 判断环境
const target = typeof window !== 'undefined'
  ? window
  : typeof global !== 'undefined'
    ? global
    : {}

// 应该是挂载到了浏览器的方法 插件
const devtoolHook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__
/**
 * 如果已经安装了该插件，则会在windows对象上暴露一个VUE_DEVTOOLS_GLOBAL_HOOK。devtoolHook用在初始化的时候会触发“vuex:init”事件通知插件，然后通过on方法监听“vuex:travel-to-state”事件来重置state。最后通过Store的subscribe方法来添加一个订阅者，在触发commit方法修改mutation数据以后，该订阅者会被通知，从而触发“vuex:mutation”事件。
 * @param {*} store
 */
export default function devtoolPlugin (store) {
  if (!devtoolHook) return
  /* devtoll插件实例存储在store的_devtoolHook上 */
  store._devtoolHook = devtoolHook
  /* 出发vuex的初始化事件，并将store的引用地址传给deltool插件，使插件获取store的实例 */
  devtoolHook.emit('vuex:init', store)
  /* 监听travel-to-state事件 */
  devtoolHook.on('vuex:travel-to-state', targetState => {
    /* 重置state */
    store.replaceState(targetState)
  })
  /* 订阅store的变化 */
  store.subscribe((mutation, state) => {
    devtoolHook.emit('vuex:mutation', mutation, state)
  })
}
