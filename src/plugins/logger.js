// Credits: borrowed code from fcomb/redux-logger

import { deepCopy } from '../util'

export default function createLogger ({
  collapsed = true, // 自动展开记录的 mutation
  filter = (mutation, stateBefore, stateAfter) => true, // 若 mutation 需要被记录，就让它返回 true 即可
  // 顺便，`mutation` 是个 { type, payload } 对象
  transformer = state => state,
  mutationTransformer = mut => mut,
  // mutation 按照 { type, payload } 格式记录
  // 我们可以按任意方式格式化
  logger = console
  // 自定义 console 实现，默认为 `console`
} = {}) {
  return store => {
    let prevState = deepCopy(store.state)

    store.subscribe((mutation, state) => {
      if (typeof logger === 'undefined') {
        return
      }
      const nextState = deepCopy(state)

      if (filter(mutation, prevState, nextState)) {
        const time = new Date()
        const formattedTime = ` @ ${pad(time.getHours(), 2)}:${pad(time.getMinutes(), 2)}:${pad(time.getSeconds(), 2)}.${pad(time.getMilliseconds(), 3)}`
        const formattedMutation = mutationTransformer(mutation)
        const message = `mutation ${mutation.type}${formattedTime}`
        const startMessage = collapsed
          ? logger.groupCollapsed
          : logger.group

        // render
        try {
          startMessage.call(logger, message)
        } catch (e) {
          console.log(message)
        }

        logger.log('%c prev state', 'color: #9E9E9E; font-weight: bold', transformer(prevState))
        logger.log('%c mutation', 'color: #03A9F4; font-weight: bold', formattedMutation)
        logger.log('%c next state', 'color: #4CAF50; font-weight: bold', transformer(nextState))

        try {
          logger.groupEnd()
        } catch (e) {
          logger.log('—— log end ——')
        }
      }

      prevState = nextState
    })
  }
}

function repeat (str, times) {
  return (new Array(times + 1)).join(str)
}

function pad (num, maxLength) {
  return repeat('0', maxLength - num.toString().length) + num
}
