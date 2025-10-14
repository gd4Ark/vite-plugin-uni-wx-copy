Component({
  properties: {
    // 按钮文字
    text: {
      type: String,
      value: '',
    },
    // 按钮类型：primary, default, danger
    type: {
      type: String,
      value: 'default',
    },
    // 按钮大小：normal, small, large
    size: {
      type: String,
      value: 'normal',
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false,
    },
    // 是否显示加载状态
    loading: {
      type: Boolean,
      value: false,
    },
    // 按钮形状：square, round
    shape: {
      type: String,
      value: 'square',
    },
  },

  methods: {
    onClick() {
      if (!this.data.disabled && !this.data.loading) {
        this.triggerEvent('click')
      }
    },
  },
})
