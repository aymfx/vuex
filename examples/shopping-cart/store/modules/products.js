import shop from '../../api/shop'

// initial state
const state = {
  all: []
}

// getters
const getters = {
  age () {
    return ''
  }
}

// actions
const actions = {
  getAllProducts ({ commit }) {
    shop.getProducts(products => {
      commit('setProducts', products)
    })
  }
}

// mutations
const mutations = {
  setProducts (state, products) {
    state.all = products
  },

  decrementProductInventory (state, { id }) {
    const product = state.all.find(product => product.id === id)
    product.inventory--
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
