import { add } from '../../utils/index'

Component({
  methods: {
    onClick() {
      add(1, 2)

      wx.navigateTo({
        url: '/subpackages/detail/detail',
      })
    },
  },
})
