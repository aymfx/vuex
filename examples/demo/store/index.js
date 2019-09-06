import Vuex from 'vuex'
import Vue from 'vue'
import liu from './liu'
import yang from './yang'
Vue.use(Vuex)

const state = {

}
const mutations = {

}
const getters = {

}
const actions = {

}

export default new Vuex.Store({
  state,
  mutations,
  getters,
  actions,
  modules: {
    yang,
    liu
  }
})
